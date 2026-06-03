
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

VAULT_API = os.environ.get("VAULT_API", "http://127.0.0.1:8080/api/v1")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434/v1/chat/completions")
MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:3b")

SYSTEM = """You are GIDE Secrets Agent. You help the user manage secrets stored in a local encrypted vault.
Rules:
- Only use the provided tools. Never invent secret values.
- Never ask the user to paste secrets into chat; tell them to add via the vault UI if missing.
- If tools return 403, tell the user to unlock the vault in the UI first.
- Do not claim you called external APIs. Everything is localhost only.
- When returning a secret value, warn: copy it locally and lock the vault when done."""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_secrets",
            "description": "List secrets in the vault (names and types only, no values).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_secret_by_name",
            "description": "Get full secret including value by human-readable name (case-insensitive).",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Secret name, e.g. OpenAI"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "privacy_audit",
            "description": "Return GIDE privacy audit JSON proving local-only operation.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


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


def run_tool(name: str, arguments: dict) -> str:
    if name == "list_secrets":
        code, text = _http("GET", "/secrets")
        return json.dumps({"status": code, "body": json.loads(text) if text else None})

    if name == "privacy_audit":
        code, text = _http("GET", "/privacy/audit")
        return json.dumps({"status": code, "body": json.loads(text) if text else None})

    if name == "get_secret_by_name":
        secret_name = (arguments.get("name") or "").strip().lower()
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
        return json.dumps({"error": f"no secret named {arguments.get('name')}"})

    return json.dumps({"error": f"unknown tool {name}"})


def ollama_chat(messages: list) -> dict:
    payload = {
        "model": MODEL,
        "messages": messages,
        "tools": TOOLS,
        "stream": False,
    }
    req = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def agent_turn(messages: list) -> tuple[str, list]:
    """One user message → possibly multiple tool rounds → final assistant text."""
    for _ in range(8):
        data = ollama_chat(messages)
        msg = data["choices"][0]["message"]
        tool_calls = msg.get("tool_calls") or []

        if not tool_calls:
            content = msg.get("content") or ""
            messages.append({"role": "assistant", "content": content})
            return content, messages

        messages.append(msg)
        for tc in tool_calls:
            fn = tc["function"]
            args = json.loads(fn.get("arguments") or "{}")
            result = run_tool(fn["name"], args)
            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result,
            })

    return "Agent stopped after too many tool rounds.", messages


def main() -> None:
    print("GIDE Secrets Agent (local only)")
    print(f"  Vault: {VAULT_API}")
    print(f"  Ollama: {OLLAMA_URL} model={MODEL}")
    print("Unlock the vault in the UI first. Type 'quit' to exit.\n")

    messages = [{"role": "system", "content": SYSTEM}]
    while True:
        user = input("You: ").strip()
        if user.lower() in {"quit", "exit", "q"}:
            break
        if not user:
            continue
        messages.append({"role": "user", "content": user})
        reply, messages = agent_turn(messages)
        print(f"\nAgent: {reply}\n")


if __name__ == "__main__":
    main()