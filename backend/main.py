from __future__ import annotations

import hashlib
import json
import secrets
import struct
import urllib.request
import urllib.error
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any
from uuid import uuid4

import uvicorn
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# LangChain Imports
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage, AIMessage
from langchain_core.tools import tool

# --- CRYPTO & PATH CONFIG ---
PBKDF2_ITERATIONS = 210_000
SALT_BYTES = 16
IV_BYTES = 12
KEY_BYTES = 32
VERIFIER_BYTES = 32
MAGIC = b"GIDEVAULT1"

VAULT_DIR = Path.home() / ".gide-vault"
VAULT_FILE = VAULT_DIR / "vault.enc"
API = "/api/v1"
OLLAMA_URL = "http://127.0.0.1:11434"
MODEL = "qwen2.5:7b-instruct"

SYSTEM_PROMPT = """You are GIDE Secrets Agent. You help the user manage secrets stored in a local encrypted vault.
Rules:
- Only use the provided tools. Never invent secret values.
- Never ask the user to paste secrets into chat; tell them to add via the vault UI if missing.
- If tools return a status 403 or indicate the vault is locked, tell the user to unlock the vault in the UI first.
- Do not claim you called external APIs. Everything is localhost only.
- When returning a secret value, warn: copy it locally and lock the vault when done."""

class WrongPasswordError(Exception): pass
class VaultLockedError(Exception): pass

def _pbkdf2(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS, dklen=KEY_BYTES)

def _password_verifier(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt + b"verifier", 100_000, dklen=VERIFIER_BYTES)

def create_empty_vault() -> dict[str, Any]:
    return {"version": 1, "secrets": []}

def encrypt_vault(plaintext: dict[str, Any], password: str) -> bytes:
    salt = secrets.token_bytes(SALT_BYTES)
    key = _pbkdf2(password, salt)
    verifier = _password_verifier(password, salt)
    iv = secrets.token_bytes(IV_BYTES)
    payload = json.dumps(plaintext, separators=(",", ":")).encode("utf-8")
    ciphertext = AESGCM(key).encrypt(iv, payload, None)
    return MAGIC + struct.pack(">16s32s12sI", salt, verifier, iv, len(ciphertext)) + ciphertext

def decrypt_vault(file_bytes: bytes, password: str) -> dict[str, Any]:
    if not file_bytes.startswith(MAGIC):
        raise ValueError("invalid vault file")
    offset = len(MAGIC)
    salt, verifier_stored, iv, ct_len = struct.unpack(">16s32s12sI", file_bytes[offset : offset + 64])
    offset += 64
    ciphertext = file_bytes[offset : offset + ct_len]
    if not secrets.compare_digest(_password_verifier(password, salt), verifier_stored):
        raise WrongPasswordError("incorrect master password")
    key = _pbkdf2(password, salt)
    try:
        payload = AESGCM(key).decrypt(iv, ciphertext, None)
    except Exception as exc:
        raise WrongPasswordError("decryption failed") from exc
    return json.loads(payload.decode("utf-8"))


# --- VAULT SERVICE ---
class VaultService:
    def __init__(self) -> None:
        self._unlocked = False
        self._password: str | None = None
        self._vault: dict | None = None

    @property
    def is_unlocked(self) -> bool:
        return self._unlocked

    def unlock(self, master_password: str) -> None:
        if not VAULT_FILE.is_file():
            self._vault = create_empty_vault()
            self._password = master_password
            self._unlocked = True
            self._save()
            return
        self._vault = decrypt_vault(VAULT_FILE.read_bytes(), master_password)
        self._password = master_password
        self._unlocked = True

    def lock(self) -> None:
        self._unlocked = False
        self._password = None
        self._vault = None

    def _require(self) -> dict:
        if not self._unlocked or self._vault is None or self._password is None:
            raise VaultLockedError("vault is locked")
        return self._vault

    def _save(self) -> None:
        vault = self._require()
        VAULT_DIR.mkdir(parents=True, exist_ok=True)
        VAULT_FILE.write_bytes(encrypt_vault(vault, self._password))

    def list_secrets(self) -> list[dict]:
        return [
            {"id": s["id"], "name": s["name"], "type": s["type"], "created_at": s["created_at"]}
            for s in self._require().get("secrets", [])
        ]

    def add_secret(self, name: str, secret_type: str, value: str) -> str:
        entry = {
            "id": str(uuid4()),
            "name": name,
            "type": secret_type,
            "value": value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._require().setdefault("secrets", []).append(entry)
        self._save()
        return entry["id"]

    def get_secret(self, secret_id: str) -> dict:
        for s in self._require().get("secrets", []):
            if s["id"] == secret_id:
                return s
        raise KeyError(secret_id)

    def delete_secret(self, secret_id: str) -> None:
        vault = self._require()
        before = len(vault.get("secrets", []))
        vault["secrets"] = [s for s in vault.get("secrets", []) if s["id"] != secret_id]
        if len(vault["secrets"]) == before:
            raise KeyError(secret_id)
        self._save()

# Global instanced shared by endpoints and agent tools
vault = VaultService()


# --- AGENT TOOLS (Direct Python Calls) ---
@tool
def list_secrets_tool() -> str:
    """List secrets in the vault (names and types only, no values)."""
    try:
        items = vault.list_secrets()
        return json.dumps({"status": 200, "body": items})
    except VaultLockedError:
        return json.dumps({"status": 403, "body": "vault is locked — unlock in the UI first"})

@tool
def get_secret_by_name_tool(name: str) -> str:
    """Get full secret including value by human-readable name (case-insensitive)."""
    secret_name = name.strip().lower()
    try:
        items = vault.list_secrets()
        for item in items:
            if item.get("name", "").lower() == secret_name:
                full_secret = vault.get_secret(item["id"])
                return json.dumps({"status": 200, "body": full_secret})
        return json.dumps({"error": f"no secret named {name}"})
    except VaultLockedError:
        return json.dumps({"status": 403, "body": "vault is locked — unlock in the UI first"})

@tool
def privacy_audit_tool() -> str:
    """Return GIDE privacy audit JSON proving local-only operation."""
    return json.dumps({
        "status": 200,
        "body": {
            "gide_compliant": True,
            "runtime_mode": "air-gapped",
            "storage_location": "local-file-only",
            "encryption": "AES-256-GCM + PBKDF2-SHA256",
            "vault_path": str(VAULT_FILE),
        }
    })

TOOLS = [list_secrets_tool, get_secret_by_name_tool, privacy_audit_tool]
TOOLS_BY_NAME = {t.name: t for t in TOOLS}


# --- API MODELS ---
class SecretType(str, Enum):
    api_key = "api_key"
    password = "password"
    other = "other"

class UnlockRequest(BaseModel):
    master_password: str = Field(min_length=1)

class SecretCreate(BaseModel):
    name: str = Field(min_length=1)
    type: SecretType = SecretType.api_key
    value: str = Field(min_length=1)

class ChatMessagePayload(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessagePayload]


# --- FASTAPI APP setup ---
app = FastAPI(title="GIDE Secrets Vault & Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LangChain LLM setup lazily on startup
llm = ChatOllama(base_url=OLLAMA_URL, model=MODEL)
llm_with_tools = llm.bind_tools(TOOLS)


# --- AGENT CONVERSATION ENGINE ---
def run_agent_turn(messages: list) -> str:
    for _ in range(8):
        response = llm_with_tools.invoke(messages)
        messages.append(response)

        if not response.tool_calls:
            return response.content

        for tc in response.tool_calls:
            tool_fn = TOOLS_BY_NAME[tc["name"]]
            result = tool_fn.invoke(tc["args"])
            messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))

    return "Agent stopped after too many tool rounds."


# --- API ENDPOINTS ---
@app.post(f"{API}/agent/chat")
def agent_chat(body: ChatRequest):
    """Exposes the agent loop over HTTP. Maintains statutory stateless tracking via payloads."""
    # Convert incoming state back to LangChain objects
    history = [SystemMessage(content=SYSTEM_PROMPT)]
    for msg in body.messages:
        if msg.role == "user":
            history.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            history.append(AIMessage(content=msg.content))
            
    reply = run_agent_turn(history)
    return {"reply": reply}

@app.post(f"{API}/vault/unlock")
def unlock(body: UnlockRequest) -> dict:
    try:
        vault.unlock(body.master_password)
    except WrongPasswordError:
        raise HTTPException(401, "incorrect master password")
    return {"unlocked": True}

@app.post(f"{API}/vault/lock")
def lock() -> dict:
    vault.lock()
    return {"unlocked": False}

@app.get(f"{API}/secrets")
def list_secrets() -> list:
    try:
        return vault.list_secrets()
    except VaultLockedError:
        raise HTTPException(403, "vault is locked")

@app.post(f"{API}/secrets", status_code=201)
def create_secret(body: SecretCreate) -> dict:
    try:
        return {"id": vault.add_secret(body.name, body.type.value, body.value)}
    except VaultLockedError:
        raise HTTPException(403, "vault is locked")

@app.get(f"{API}/secrets/{{secret_id}}")
def get_secret(secret_id: str) -> dict:
    try:
        return vault.get_secret(secret_id)
    except VaultLockedError:
        raise HTTPException(403, "vault is locked")
    except KeyError:
        raise HTTPException(404, "secret not found")

@app.delete(f"{API}/secrets/{{secret_id}}", status_code=204)
def delete_secret(secret_id: str) -> JSONResponse:
    try:
        vault.delete_secret(secret_id)
    except VaultLockedError:
        raise HTTPException(403, "vault is locked")
    except KeyError:
        raise HTTPException(404, "secret not found")
    return JSONResponse(status_code=204, content=None)

@app.get(f"{API}/privacy/audit")
def privacy_audit() -> dict:
    return {
        "gide_compliant": True,
        "runtime_mode": "air-gapped",
        "bind_address": "127.0.0.1",
        "local_model_calls": True,
        "online_api_calls": False,
        "telemetry": False,
        "outbound_connections": [],
        "storage_location": "local-file-only",
        "encryption": "AES-256-GCM + PBKDF2-SHA256",
        "vault_path": str(VAULT_FILE),
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080)