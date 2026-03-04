# Anchor Workspace (Bootstrap Scaffold)

This directory contains the Anchor workspace scaffold for Solana bootstrap-related program surfaces required by issue #4.

## Current scope

- `programs/dacl-bootstrap/` exposes baseline instruction surfaces:
  - `create_mint(...)`
  - `mint_to_wallet(...)`
  - `bootstrap_allocations_from_config(...)`

The implementation is intentionally minimal and acts as a compatibility/structure anchor while the operational bootstrap flow remains in the Rust SDK wrapper path.

## Layout

- `Anchor.toml` — workspace/test/provider config.
- `Cargo.toml` — workspace member declaration.
- `programs/dacl-bootstrap/` — Anchor program crate.

## Notes

- This module is a scaffold, not a full on-chain production program.
- Keep instruction names aligned with the SDK/setup flow contracts documented in the root `README.md`.
