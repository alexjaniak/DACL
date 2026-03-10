import os
import sys


def get_config() -> dict:
    secret = os.environ.get("FORGE_WEBHOOK_SECRET")
    if not secret:
        print("Error: FORGE_WEBHOOK_SECRET environment variable is required", file=sys.stderr)
        sys.exit(1)

    return {
        "secret": secret,
        "port": int(os.environ.get("FORGE_WEBHOOK_PORT", "8471")),
        "events_file": os.environ.get("FORGE_EVENTS_FILE", "./events.jsonl"),
    }
