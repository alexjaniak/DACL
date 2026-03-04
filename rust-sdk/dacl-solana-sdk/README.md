# DACL Solana Bootstrap SDK

Rust SDK + CLI used by setup scripts to bootstrap Solana devnet token provisioning for agents.

## Components

- `src/lib.rs`:
  - `create_mint(...)`
  - `mint_to_wallet(...)`
  - `bootstrap_allocations_from_config(...)`
- `src/bin/dacl-solana-bootstrap.rs`:
  - CLI entrypoint invoked by `scripts/solana-bootstrap-devnet.sh`

## Toolchain

This crate is pinned via `rust-toolchain.toml` (currently Rust/Cargo `1.88.0`).

## Local validation

From repo root:

- `cargo fmt --manifest-path rust-sdk/dacl-solana-sdk/Cargo.toml --check`
- `cargo check --manifest-path rust-sdk/dacl-solana-sdk/Cargo.toml --locked`
- `cargo clippy --manifest-path rust-sdk/dacl-solana-sdk/Cargo.toml -- -D warnings`

If local Cargo is older than the pinned toolchain, use rustup/toolchain install first or rely on CI (`.github/workflows/solana-bootstrap-sdk.yml`).
