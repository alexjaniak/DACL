# Forge Webhook Monitor

Receives GitHub webhook events and stores them as normalized JSONL for the Forge event system.

## Prerequisites

- Python 3.11+
- A tunnel tool: `gh webhook forward` (GitHub CLI) or [ngrok](https://ngrok.com/download)

## Setup

### 1. Install the webhook server

```bash
cd apps/webhook-monitor
pip install -e .
```

### 2. Set environment variables

```bash
export FORGE_WEBHOOK_SECRET="<your-secret>"    # Required
export FORGE_WEBHOOK_PORT=8471                  # Optional, default 8471
export FORGE_EVENTS_FILE="./events.jsonl"       # Optional, default ./events.jsonl
export FORGE_REPO="owner/repo"                  # Required for gh webhook forward
```

Generate a secret with: `openssl rand -hex 32`

### 3. Start the server

```bash
forge-webhook
```

The server listens on `0.0.0.0:$FORGE_WEBHOOK_PORT` and exposes:

- `POST /webhook` — receives GitHub events
- `GET /health` — health check

### 4. Start the tunnel

```bash
./tunnel.sh
```

The script tries `gh webhook forward` first, then falls back to `ngrok`.

**With `gh webhook forward`**: The tunnel configures the webhook automatically — no manual GitHub setup needed. Requires `FORGE_REPO` to be set.

**With `ngrok`**: Copy the public URL from ngrok's output and configure the webhook manually (see below).

### 5. (ngrok only) Configure the GitHub repo webhook

1. Go to your repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**: `<ngrok-url>/webhook`
3. **Content type**: `application/json`
4. **Secret**: The value of `FORGE_WEBHOOK_SECRET`
5. **Events**: Select individual events:
   - Issues
   - Pull requests
   - Issue comments
   - Pull request reviews
6. Save

## Quick start (both server + tunnel)

```bash
./dev.sh
```

Starts the webhook server and tunnel in parallel. Press `Ctrl+C` to stop both.
