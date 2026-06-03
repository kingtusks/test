from __future__ import annotations

import json
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
import urllib.request
import urllib.error

VAULT_API = "http://127.0.0.1:8080/api/v1"
OLLAMA_URL = "http://127.0.0.1:11434"
MODEL = "qwen2.5-coder:3b"

SYSTEM = """You are GIDE Secrets Agent. You help the user manage secrets stored in a local encrypted vault.
Rules:
- Only use the provided tools. Never invent secret values.
- Never ask the user to paste secrets into chat; tell them to add via the vault UI if missing.
- If tools return 403, tell the user to unlock the vault in the UI first.
- Do not claim you called external APIs. Everything is localhost only.
- When returning a secret value, warn: copy it locally and lock the vault when done."""


def _http(method: str, path: str, body: dict | None = None) -> tuple[int, str]:
    url = f"{VAULT_API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


@tool
def list_secrets() -> str:
    """List secrets in the vault (names and types only, no values)."""
    code, text = _http("GET", "/secrets")
    return json.dumps({"status": code, "body": json.loads(text) if text else None})


@tool
def get_secret_by_name(name: str) -> str:
    """Get full secret including value by human-readable name (case-insensitive)."""
    secret_name = name.strip().lower()
    code, text = _http("GET", "/secrets")
    if code == 403:
        return json.dumps({"error": "vault is locked — unlock in the UI first"})
    if code != 200:
        return json.dumps({"status": code, "body": text})
    items = json.loads(text)
    for item in items:
        if item.get("name", "").lower() == secret_name:
            sid = item["id"]
            c2, t2 = _http("GET", f"/secrets/{sid}")
            return json.dumps({"status": c2, "body": json.loads(t2) if t2 else None})
    return json.dumps({"error": f"no secret named {name}"})


@tool
def privacy_audit() -> str:
    """Return GIDE privacy audit JSON proving local-only operation."""
    code, text = _http("GET", "/privacy/audit")
    return json.dumps({"status": code, "body": json.loads(text) if text else None})


TOOLS = [list_secrets, get_secret_by_name, privacy_audit]
TOOLS_BY_NAME = {t.name: t for t in TOOLS}


def agent_turn(llm_with_tools, messages: list) -> tuple[str, list]:
    for _ in range(8):
        response = llm_with_tools.invoke(messages)
        messages.append(response)

        if not response.tool_calls:
            return response.content, messages

        for tc in response.tool_calls:
            tool_fn = TOOLS_BY_NAME[tc["name"]]
            result = tool_fn.invoke(tc["args"])
            messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))

    return "Agent stopped after too many tool rounds.", messages


def run_agent() -> None:
    print("GIDE Secrets Agent (local only)")
    print(f"  Vault: {VAULT_API}")
    print(f"  Ollama: {OLLAMA_URL}  model={MODEL}")
    print("Unlock the vault in the UI first. Type 'quit' to exit.\n")

    llm = ChatOllama(base_url=OLLAMA_URL, model=MODEL)
    llm_with_tools = llm.bind_tools(TOOLS)

    messages = [SystemMessage(content=SYSTEM)]

    while True:
        user = input("You: ").strip()
        if user.lower() in {"quit", "exit", "q"}:
            break
        if not user:
            continue
        messages.append(HumanMessage(content=user))
        reply, messages = agent_turn(llm_with_tools, messages)
        print(f"\nAgent: {reply}\n")


run_agent()