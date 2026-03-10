#!/usr/bin/env python3
"""agent-kernel cron management — declarative crontab sync."""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KERNEL_DIR = os.path.dirname(SCRIPT_DIR)
REPO_DIR = os.path.dirname(KERNEL_DIR)
JOBS_FILE = os.path.join(SCRIPT_DIR, "cron-jobs.json")
# cron-state.json format (auto-generated, gitignored):
# {
#   "jobs": {
#     "<agent-id>": {
#       "interval": "5m",          # scheduling interval (Nm or Nh)
#       "cron_expr": "*/5 * * * *",# resolved cron expression
#       "prompt": "...",           # agent prompt
#       "agentic": true,           # tool use enabled
#       "workspace": true,         # git worktree isolation
#       "contexts": [...],         # context file paths
#       "repo": "",                # target repo (empty = self)
#       "installed_at": "ISO8601", # when job was added/updated
#       "last_run": "ISO8601"      # updated by run.sh at start of each run
#     }
#   },
#   "last_applied": "ISO8601"      # when apply was last run
# }
# next_run is computed dynamically as last_run + interval.
STATE_FILE = os.path.join(SCRIPT_DIR, "cron-state.json")
LOGS_DIR = os.path.join(KERNEL_DIR, "logs")
TAG_PREFIX = "# DACL:agent-kernel"


# ── helpers ────────────────────────────────────────────────────

def parse_interval(interval):
    m = re.fullmatch(r"(\d+)m", interval)
    if m:
        return f"*/{m.group(1)} * * * *"
    m = re.fullmatch(r"(\d+)h", interval)
    if m:
        return f"0 */{m.group(1)} * * *"
    raise ValueError(f"Invalid interval '{interval}': must be Nm or Nh (e.g. 5m, 1h)")


def build_cron_command(job_id, prompt, agentic, contexts=None, workspace=False, repo=None):
    cmd = f"mkdir -p {LOGS_DIR} && cd {REPO_DIR} && ./agent-kernel/run.sh"
    if agentic:
        cmd += " --agentic"
    if workspace:
        cmd += f" --workspace {job_id}"
    if repo:
        cmd += f" --repo {repo}"
    for ctx in (contexts or []):
        cmd += f" --context {ctx}"
    cmd += f' "{prompt}" >> {LOGS_DIR}/{job_id}.log 2>&1'
    return cmd


def read_crontab():
    try:
        return subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, check=True
        ).stdout
    except subprocess.CalledProcessError:
        return ""


def write_crontab(content):
    content = content.strip()
    if not content:
        subprocess.run(["crontab", "-r"], capture_output=True, check=False)
    else:
        subprocess.run(
            ["crontab", "-"], input=content + "\n", text=True, check=True
        )


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"jobs": {}, "last_applied": None}


def save_state(state):
    state["last_applied"] = datetime.now(timezone.utc).isoformat()
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)
        f.write("\n")


def interval_to_seconds(interval):
    """Convert an interval string like '5m' or '1h' to seconds."""
    m = re.fullmatch(r"(\d+)m", interval)
    if m:
        return int(m.group(1)) * 60
    m = re.fullmatch(r"(\d+)h", interval)
    if m:
        return int(m.group(1)) * 3600
    return 0


def compute_next_run(last_run_iso, interval):
    """Compute next run timestamp from last_run + interval."""
    if not last_run_iso:
        return None
    last_run = datetime.fromisoformat(last_run_iso)
    secs = interval_to_seconds(interval)
    if secs == 0:
        return None
    return (last_run + timedelta(seconds=secs)).isoformat()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── crontab manipulation ──────────────────────────────────────

def remove_job_from_crontab(crontab, job_id):
    tag = f"{TAG_PREFIX}:{job_id}"
    lines = crontab.splitlines()
    result = []
    skip_next = False
    for line in lines:
        if line.strip() == tag:
            skip_next = True
            continue
        if skip_next:
            skip_next = False
            continue
        result.append(line)
    return "\n".join(result)


def add_job_to_crontab(crontab, job_id, cron_expr, command):
    crontab = remove_job_from_crontab(crontab, job_id)
    tag = f"{TAG_PREFIX}:{job_id}"
    entry = f"{tag}\n{cron_expr} {command}"
    if crontab.strip():
        return crontab.strip() + "\n" + entry
    return entry


# ── subcommands ───────────────────────────────────────────────

def cmd_apply(args):
    if not os.path.exists(JOBS_FILE):
        print(f"Error: {JOBS_FILE} not found", file=sys.stderr)
        sys.exit(1)

    with open(JOBS_FILE) as f:
        config = json.load(f)

    state = load_state()

    desired = {}
    for job in config.get("jobs", []):
        if job.get("enabled", True):
            desired[job["id"]] = job

    actual = state["jobs"]

    to_remove = set(actual.keys()) - set(desired.keys())
    to_add = set(desired.keys()) - set(actual.keys())

    to_update = set()
    for job_id in set(desired.keys()) & set(actual.keys()):
        d = desired[job_id]
        a = actual[job_id]
        if (d["interval"] != a.get("interval") or
                d["prompt"] != a.get("prompt") or
                d.get("agentic", False) != a.get("agentic", False) or
                d.get("workspace", False) != a.get("workspace", False) or
                d.get("contexts", []) != a.get("contexts", []) or
                d.get("repo", "") != a.get("repo", "")):
            to_update.add(job_id)

    no_change = (set(desired.keys()) & set(actual.keys())) - to_update

    crontab = read_crontab()

    for job_id in to_remove:
        crontab = remove_job_from_crontab(crontab, job_id)
        del state["jobs"][job_id]
        print(f"  - Removed: {job_id}")

    for job_id in to_add | to_update:
        job = desired[job_id]
        cron_expr = parse_interval(job["interval"])
        contexts = job.get("contexts", [])
        repo = job.get("repo", "")
        command = build_cron_command(job_id, job["prompt"], job.get("agentic", False), contexts, job.get("workspace", False), repo or None)
        crontab = add_job_to_crontab(crontab, job_id, cron_expr, command)
        state["jobs"][job_id] = {
            "interval": job["interval"],
            "cron_expr": cron_expr,
            "prompt": job["prompt"],
            "agentic": job.get("agentic", False),
            "workspace": job.get("workspace", False),
            "contexts": contexts,
            "repo": repo,
            "installed_at": now_iso(),
        }
        action = "Added" if job_id in to_add else "Updated"
        sym = "+" if job_id in to_add else "~"
        print(f"  {sym} {action}: {job_id}")

    write_crontab(crontab)
    save_state(state)

    print(f"Applied: +{len(to_add)} added, ~{len(to_update)} updated, "
          f"-{len(to_remove)} removed, {len(no_change)} unchanged")


def cmd_add(args):
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", args.id):
        print(f"Error: invalid id '{args.id}' (use alphanumeric, dashes, underscores)", file=sys.stderr)
        sys.exit(1)

    cron_expr = parse_interval(args.interval)
    contexts = args.context or []
    repo = args.repo or ""
    command = build_cron_command(args.id, args.prompt, args.agentic, contexts, args.workspace, repo or None)

    crontab = read_crontab()
    crontab = add_job_to_crontab(crontab, args.id, cron_expr, command)
    write_crontab(crontab)

    state = load_state()
    state["jobs"][args.id] = {
        "interval": args.interval,
        "cron_expr": cron_expr,
        "prompt": args.prompt,
        "agentic": args.agentic,
        "workspace": args.workspace,
        "contexts": contexts,
        "repo": repo,
        "installed_at": now_iso(),
    }
    save_state(state)

    print(f"Added cron job '{args.id}' ({args.interval}): {cron_expr}")
    print(f"  Log: {LOGS_DIR}/{args.id}.log")


def cmd_remove(args):
    crontab = read_crontab()
    tag = f"{TAG_PREFIX}:{args.id}"
    if tag not in crontab:
        print(f"No cron job found with id '{args.id}'", file=sys.stderr)
        sys.exit(1)

    crontab = remove_job_from_crontab(crontab, args.id)
    write_crontab(crontab)

    state = load_state()
    state["jobs"].pop(args.id, None)
    save_state(state)

    print(f"Removed cron job '{args.id}'")


def cmd_list(args):
    state = load_state()
    jobs = state["jobs"]
    if not jobs:
        print("No active jobs")
        return

    for job_id, info in jobs.items():
        mode = "agentic" if info.get("agentic") else "text"
        print(f"  {job_id:<20} {info['cron_expr']:<20} {mode:<10} \"{info['prompt']}\"")


def cmd_status(args):
    """Print a human-readable table of agent timing (last run, next run, countdown)."""
    state = load_state()
    jobs = state["jobs"]
    if not jobs:
        print("No active jobs")
        return

    now = datetime.now(timezone.utc)
    print(f"  {'AGENT':<20} {'INTERVAL':<10} {'LAST RUN':<22} {'NEXT RUN':<22} {'COUNTDOWN'}")
    print(f"  {'─' * 20} {'─' * 10} {'─' * 22} {'─' * 22} {'─' * 15}")

    for job_id, info in sorted(jobs.items()):
        interval = info.get("interval", "?")
        last_run = info.get("last_run")
        next_run = compute_next_run(last_run, interval) if last_run else None

        last_str = last_run[:19].replace("T", " ") if last_run else "never"
        next_str = next_run[:19].replace("T", " ") if next_run else "—"

        if next_run:
            next_dt = datetime.fromisoformat(next_run)
            delta = next_dt - now
            total_secs = int(delta.total_seconds())
            if total_secs <= 0:
                countdown = "overdue"
            else:
                mins, secs = divmod(total_secs, 60)
                hrs, mins = divmod(mins, 60)
                if hrs:
                    countdown = f"{hrs}h {mins}m {secs}s"
                elif mins:
                    countdown = f"{mins}m {secs}s"
                else:
                    countdown = f"{secs}s"
        else:
            countdown = "—"

        print(f"  {job_id:<20} {interval:<10} {last_str:<22} {next_str:<22} {countdown}")


def cmd_run(args):
    if not os.path.exists(JOBS_FILE):
        print(f"Error: {JOBS_FILE} not found", file=sys.stderr)
        sys.exit(1)

    with open(JOBS_FILE) as f:
        config = json.load(f)

    job = next((j for j in config.get("jobs", []) if j["id"] == args.id), None)
    if not job:
        print(f"No job with id '{args.id}' in {JOBS_FILE}", file=sys.stderr)
        sys.exit(1)

    cmd = [os.path.join(REPO_DIR, "agent-kernel", "run.sh")]
    if job.get("agentic"):
        cmd.append("--agentic")
    if job.get("workspace"):
        cmd += ["--workspace", job["id"]]
    if job.get("repo"):
        cmd += ["--repo", job["repo"]]
    for ctx in job.get("contexts", []):
        cmd += ["--context", ctx]
    cmd.append(job["prompt"])

    print(f"Running {args.id}...")
    os.execv(cmd[0], cmd)


def cmd_clear(args):
    state = load_state()
    if not state["jobs"]:
        print("No jobs to clear")
        return

    crontab = read_crontab()
    count = len(state["jobs"])
    for job_id in list(state["jobs"].keys()):
        crontab = remove_job_from_crontab(crontab, job_id)
    write_crontab(crontab)

    state["jobs"] = {}
    save_state(state)

    print(f"Cleared {count} job(s)")


# ── main ──────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="agent-kernel cron manager")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("apply", help="Sync crontab to match cron-jobs.json")

    p_add = sub.add_parser("add", help="Add a single cron job")
    p_add.add_argument("id", help="Job identifier")
    p_add.add_argument("interval", help="Interval: Nm or Nh")
    p_add.add_argument("prompt", help="Prompt for run.sh")
    p_add.add_argument("--agentic", action="store_true", help="Enable tool use")
    p_add.add_argument("--workspace", action="store_true", help="Run in isolated git worktree")
    p_add.add_argument("--context", action="append", help="Context file path relative to repo root (repeatable)")
    p_add.add_argument("--repo", help="Target repo (e.g. github.com/owner/repo or absolute path)")

    p_rm = sub.add_parser("remove", help="Remove a cron job by ID")
    p_rm.add_argument("id", help="Job identifier")

    sub.add_parser("list", help="List active cron jobs")
    sub.add_parser("status", help="Show agent timing: last run, next run, countdown")

    p_run = sub.add_parser("run", help="Run a job once immediately")
    p_run.add_argument("id", help="Job identifier from cron-jobs.json")

    sub.add_parser("clear", help="Remove all agent-kernel cron jobs")

    args = parser.parse_args()
    commands = {
        "apply": cmd_apply,
        "add": cmd_add,
        "remove": cmd_remove,
        "list": cmd_list,
        "status": cmd_status,
        "run": cmd_run,
        "clear": cmd_clear,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
