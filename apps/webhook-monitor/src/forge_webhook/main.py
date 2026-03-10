import hashlib
import hmac
import json

from fastapi import FastAPI, Header, HTTPException, Request

from .config import get_config
from .normalize import normalize_event
from .storage import append_event

app = FastAPI(title="Forge Webhook Monitor")

_config: dict | None = None


def _get_config() -> dict:
    global _config
    if _config is None:
        _config = get_config()
    return _config


def _verify_signature(payload: bytes, signature: str | None, secret: str) -> None:
    if not signature:
        raise HTTPException(status_code=403, detail="Missing X-Hub-Signature-256 header")

    if not signature.startswith("sha256="):
        raise HTTPException(status_code=403, detail="Invalid signature format")

    expected = "sha256=" + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=403, detail="Invalid signature")


@app.post("/webhook")
async def webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(None),
    x_github_event: str | None = Header(None),
):
    config = _get_config()
    body = await request.body()

    _verify_signature(body, x_hub_signature_256, config["secret"])

    if not x_github_event:
        raise HTTPException(status_code=400, detail="Missing X-GitHub-Event header")

    payload = json.loads(body)
    event = normalize_event(x_github_event, payload)

    if event is None:
        return {"status": "ignored", "event": x_github_event}

    append_event(config["events_file"], event)
    return {"status": "accepted", "event_type": event["event_type"]}


@app.get("/health")
async def health():
    return {"status": "ok"}


def run():
    import uvicorn

    config = _get_config()
    uvicorn.run(
        "forge_webhook.main:app",
        host="0.0.0.0",
        port=config["port"],
        log_level="info",
    )
