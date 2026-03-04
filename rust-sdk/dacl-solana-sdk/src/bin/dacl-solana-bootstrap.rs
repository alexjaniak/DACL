use anyhow::{Context, Result};
use dacl_solana_sdk::{
    bootstrap_allocations_from_config, create_mint, enforce_provisioner, load_config, load_rpc_url,
    read_keypair,
};
use solana_sdk::{pubkey::Pubkey, signature::Signer};
use std::str::FromStr;

fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 6 {
        eprintln!(
            "Usage: {} <config> <actor-agent-id> <payer-keypair> <mint-authority-keypair> <agent-id=wallet-pubkey>...",
            args[0]
        );
        std::process::exit(2);
    }

    let cfg = load_config(&args[1])?;
    enforce_provisioner(&cfg, &args[2])?;
    let rpc_url = load_rpc_url(&cfg)?;

    let payer = read_keypair(&args[3])?;
    let mint_authority = read_keypair(&args[4])?;

    let (mint, mint_was_created) = if let Some(existing) = cfg.token.existing_mint_pubkey.as_deref() {
        (
            Pubkey::from_str(existing).context("invalid token.existingMintPubkey")?,
            false,
        )
    } else {
        (
            create_mint(
                &rpc_url,
                &payer,
                &mint_authority.pubkey(),
                &mint_authority.pubkey(),
                cfg.token.decimals,
            )
            .context("failed to create mint")?
            .pubkey(),
            true,
        )
    };

    let mut agents = Vec::new();
    for pair in &args[5..] {
        let (agent_id, pk) = pair
            .split_once('=')
            .context("agent mapping must be agent-id=wallet-pubkey")?;
        agents.push((agent_id.to_string(), Pubkey::from_str(pk)?));
    }

    bootstrap_allocations_from_config(
        &cfg,
        &rpc_url,
        &payer,
        &mint,
        &mint_authority,
        &agents,
    )?;

    println!("mint_pubkey={}", mint);
    println!("mint_created={}", mint_was_created);
    println!("allocations_applied={}", agents.len());
    Ok(())
}
