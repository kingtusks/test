"""
GIDE Secrets Vault — localhost-only API.
Run:  python backend/main.py
Deps: pip install fastapi uvicorn pydantic cryptography
"""

from __future__ import annotations

import hashlib
import json
import secrets
import struct
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

# --- crypto ---
PBKDF2_ITERATIONS = 210_000
SALT_BYTES = 16
IV_BYTES = 12
KEY_BYTES = 32
VERIFIER_BYTES = 32
MAGIC = b"GIDEVAULT1"

VAULT_DIR = Path.home() / ".gide-vault"
VAULT_FILE = VAULT_DIR / "vault.enc"
API = "/api/v1"


class WrongPasswordError(Exception):
    pass


class VaultLockedError(Exception):
    pass


def _pbkdf2(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS, dklen=KEY_BYTES
    )


def _password_verifier(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt + b"verifier", 100_000, dklen=VERIFIER_BYTES
    )


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


# --- vault service ---
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
            self._save()
            self._unlocked = True
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
        VAULT_FILE.write_bytes(encrypt_vault(vault, self._password))  # type: ignore[arg-type]

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


vault = VaultService()

# --- API models ---
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


# --- FastAPI ---
app = FastAPI(title="GIDE Secrets Vault")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
        "local_model_calls": False,
        "online_api_calls": False,
        "telemetry": False,
        "outbound_connections": [],
        "storage_location": "local-file-only",
        "encryption": "AES-256-GCM + PBKDF2-SHA256",
        "vault_path": str(VAULT_FILE),
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080)