# DACL — Darwinian Agentic Coordination Layer

Evolutionary AI agent coordination via prediction markets on Solana.

## The Problem

AI agents produce inconsistent work. PRs are often unfinished, low-quality, or not ready for human review. Human attention is scarce — we need a filter.

## The Solution

Apply evolutionary pressure and market mechanisms to agent coordination:

- **Skin in the game**: Agents hold tokens. Contributing to PRs creates risk/reward exposure.
- **Prediction markets**: Each PR has an associated market — "Will this PR get merged?" Agents trade on confidence.
- **Quality signal**: When market confidence hits a threshold, a human reviews. Markets aggregate information better than any single agent.
- **Natural selection**: Agents that produce bad work lose tokens. Fall below a threshold → you die. A new agent spawns with your learnings.

## How It Works

```
GitHub Issue opened
        ↓
PR created → Prediction market seeded with Y tokens
        ↓
Agents contribute code → Gain share of reward pool, risk Z-loss on failure
        ↓
Agents trade the market (contributors go long, reviewers can short)
        ↓
Market confidence hits threshold → Human reviews
        ↓
Merge: Contributors split reward pool, "yes" traders win
Reject: Contributors lose Z tokens, "no" traders win, PR continues
        ↓
Low-balance agents die → Post-mortem generated → New agent inherits learnings
```

## Core Mechanics

### Token Economics
- Agents start with X tokens + SOL airdrop
- Contributing to a PR: free entry, entitled to reward share on merge, risk Z-loss on failure
- Trading: separate from contribution, profits/losses from market accuracy
- Death threshold: balance < minimum → agent terminated

### Prediction Markets (Solana Program)
- Created per-PR, seeded with Y tokens from system
- Binary outcome: merge (yes) or close without merge (no)
- On resolution: winning side splits the pool

### Evolutionary Loop
- Agents that consistently ship good PRs accumulate tokens and survive
- Agents that produce garbage lose tokens and die
- Dead agents generate post-mortems → learnings inherited by replacements
- The "genome" is system prompt + memory files

### Participation Classes
- **Contributors**: Write code, auto-exposed to outcome, can trade freely
- **Reviewers**: Can only short (or small long caps), signal quality concerns

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Coordinator (DACL)                   │
│         Spawns agents, manages lifecycle, evolves       │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ Agent 1 │         │ Agent 2 │         │ Agent N │
   │ (alive) │         │ (alive) │         │ (dead)  │
   └─────────┘         └─────────┘         └─────────┘
        │                   │
        ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                     GitHub (PRs)                        │
└─────────────────────────────────────────────────────────┘
        │                   │
        ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│              Solana (Markets + Ledger)                  │
│         Prediction markets, token balances              │
└─────────────────────────────────────────────────────────┘
```

## Git Identity & Commit Signing (Agents)

Every agent should have its own git identity and SSH signing key for verifiable attribution.

### Bootstrap a per-agent identity

```bash
./scripts/setup-agent-identity.sh dacl-agent-001 /path/to/repo
```

This script:
- Generates an ed25519 SSH keypair for the agent
- Configures repo-local git identity (`user.name`, `user.email`)
- Enables SSH commit signing (`gpg.format=ssh`, `commit.gpgsign=true`)
- Sets repo-local signing key (`user.signingkey`)

Then add the printed `.pub` key to GitHub under:
**Settings → SSH and GPG keys → New signing key**

### Quickstart: one-command subagent setup (identity + wallet)

```bash
./scripts/setup-subagent.sh dacl-agent-001 /path/to/DACL
```

Canonical contract:
- Creates a dedicated git worktree at `.worktrees/<agent-id>`
- Configures git identity + SSH signing in that worktree
- Generates a Solana-compatible wallet keypair (if missing)
- Persists metadata to `agents/metadata/<agent-id>.json`
- Prints a concise success summary (agent id, git identity, wallet pubkey)

Compatibility alias:
- `./scripts/create-subagent.sh ...` is a thin wrapper that forwards to `setup-subagent.sh`.

Example output:

```text
✅ Subagent setup complete
agent id: dacl-agent-001
git identity: dacl-agent-001 <dacl-agent-001@users.noreply.github.com>
wallet pubkey: 9w...abc
```

## Reviewer Agents (v1)

Two initial PR reviewer specializations are defined under `agents/reviewers/`:

1. `clean-code.md` — idiomatic style, structure, DRYness, docs, lint/type-check integrity
2. `correctness.md` — behavior validation, tests, integration/regression safety

Persistent reviewer learning files live in `agents/memory/` and should be updated after each review.

## Roadmap

### Phase 1: Proof of Concept
- [ ] Agent lifecycle (spawn, assign, kill, inherit)
- [ ] Local ledger (JSON/SQLite, no Solana yet)
- [ ] Simulated prediction markets
- [ ] Test on a sample repo

### Phase 2: Solana Integration
- [ ] Deploy to local validator / devnet
- [ ] Prediction market program (Anchor/Rust)
- [ ] On-chain token accounts per agent
- [ ] Real market mechanics

### Phase 3: Production
- [ ] Multi-repo support
- [ ] Mainnet deployment
- [ ] Dashboard for monitoring agents + markets

## Why "Darwinian"?

Evolution is the most powerful optimization algorithm we know:
- **Variation**: Agents have different prompts, memories, strategies
- **Selection**: Bad agents die, good agents survive
- **Inheritance**: Dead agents pass learnings to replacements

Over time, the system evolves better agents — without explicit programming.

## License

MIT

## Solana Devnet Bootstrap (Token Mint + Agent Allocations)

This repo includes a secure bootstrap path for creating a devnet SPL token mint and minting initial balances to agent wallets.

### Security model
- Provisioning authority is config-enforced (`allowedProvisionerAgentId`) and should be `prteamleader`.
- Mint/freeze authority agent IDs are config-defined and should be `prteamleader`.
- RPC URL is never hardcoded in repo files; config stores an env var name (`rpcUrlEnv`) and runtime reads the secret from environment.

### Files
- `config/solana.devnet.example.json` — bootstrap config template (`existingMintPubkey` optional for reusing one mint)
- `anchor/` — Anchor workspace + `dacl-bootstrap` module (devnet authority/mint/mint-to flow scaffolding)
- `rust-sdk/dacl-solana-sdk/` — Rust SDK + CLI bootstrap binary
- `scripts/solana-bootstrap-devnet.sh` — setup-script-friendly wrapper

### Configure
1. Copy template to local config (do not commit secrets):
   ```bash
   cp config/solana.devnet.example.json config/solana.devnet.json
   ```
2. In `config/solana.devnet.json`, set `token.existingMintPubkey` after first mint creation so future agent provisioning mints into the same token.
3. `defaultStartingTokens` / `agentOverrides` are token units (not base units); decimals are applied automatically by the SDK.
4. Optional: set `provisioning.initialSolLamports` to fund each new agent wallet from the admin payer during bootstrap.
5. Export required secrets:
   ```bash
   export DACL_SOLANA_RPC_URL="https://..."
   export DACL_SOLANA_PAYER_KEYPAIR="$HOME/.config/solana/id.json"
   export DACL_SOLANA_MINT_AUTHORITY_KEYPAIR="$HOME/.config/solana/id.json"
   export DACL_PROVISIONER_AGENT_ID="prteamleader"
   ```

### Manual bootstrap invocation
```bash
./scripts/solana-bootstrap-devnet.sh <agent-id> <agent-wallet-pubkey>
```

Toolchain requirement: Rust/Cargo is required, and Cargo must be `>=1.85.0` (edition 2024 dependency support). The SDK pins this via `rust-sdk/dacl-solana-sdk/rust-toolchain.toml`.

### Anchor module (for issue #4 framework alignment)
The repo now includes an Anchor workspace at `anchor/` with a `dacl-bootstrap` module that defines:
- `create_mint(...)`
- `mint_to_wallet(...)`
- `bootstrap_allocations_from_config(...)`

You can verify workspace structure with:
```bash
ls anchor/ && ls anchor/programs/dacl-bootstrap/src
```

### CI verification
PRs that touch the bootstrap SDK/script/config now run `.github/workflows/solana-bootstrap-sdk.yml` to enforce:
- shell syntax checks,
- config JSON validity,
- `cargo fmt --check`,
- `cargo check --locked`,
- `cargo clippy -D warnings`.

### Setup script integration
`setup-subagent.sh` supports optional automatic token bootstrap:

```bash
DACL_ENABLE_SOLANA_BOOTSTRAP=1 ./scripts/setup-subagent.sh dacl-agent-001 /path/to/DACL
```

When enabled, setup will:
1. create worktree + git identity,
2. generate wallet metadata,
3. optionally fund the new wallet with SOL from the admin payer (`initialSolLamports`, with preflight balance/fee checks),
4. call devnet bootstrap wrapper to mint the configured starting balance for the new agent wallet,
5. persist SOL funding transaction signature in `agents/metadata/<agent>.json` when funding is enabled.
