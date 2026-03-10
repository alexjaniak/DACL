# Forge Webhook Monitor

Receives GitHub webhook events, normalizes them, and stores them as JSONL for the Forge event pipeline.

## Setup

### 1. Install the package

```bash
cd apps/webhook-monitor
pip install -e .
```

### 2. Set environment variables

```bash
export FORGE_WEBHOOK_SECRET="your-secret-here"    # Required
export FORGE_WEBHOOK_PORT=8471                      # Optional, default 8471
export FORGE_EVENTS_FILE="./events.jsonl"           # Optional
export FORGE_WEBHOOK_REPO="owner/repo"              # Required for gh webhook forward
```

### 3. Start the server

```bash
forge-webhook
```

The server listens on `0.0.0.0:$FORGE_WEBHOOK_PORT` and exposes:
- `POST /webhook` — receives GitHub webhook payloads
- `GET /health` — health check

## Tunnel Forwarding

GitHub needs a public URL to deliver webhooks. Use the tunnel script to expose your local server.

### Option A: `gh webhook forward` (recommended)

```bash
gh extension install cli/gh-webhook
./tunnel.sh
```

This creates a temporary webhook on your repo automatically — no manual GitHub configuration needed.

### Option B: ngrok

```bash
brew install ngrok  # or https://ngrok.com/download
./tunnel.sh
```

ngrok prints a public URL. You must manually configure the webhook in GitHub (see below).

## GitHub Webhook Configuration (ngrok only)

When using ngrok, you need to manually add the webhook in your repo:

1. Go to **Settings → Webhooks → Add webhook**
2. **Payload URL**: `https://<ngrok-url>/webhook`
3. **Content type**: `application/json`
4. **Secret**: same value as `FORGE_WEBHOOK_SECRET`
5. **Events**: Select individual events:
   - Issues
   - Pull requests
   - Issue comments
   - Pull request reviews
6. Click **Add webhook**

## Quick Start (dev mode)

Start both the server and tunnel together:

```bash
./dev.sh
```

Press `Ctrl+C` to stop both processes.
