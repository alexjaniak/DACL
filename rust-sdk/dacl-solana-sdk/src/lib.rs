use anyhow::{anyhow, Context, Result};
use serde::Deserialize;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{read_keypair_file, Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use spl_associated_token_account::get_associated_token_address;
use spl_token::instruction::{initialize_mint, mint_to};
use std::str::FromStr;

#[derive(Debug, Clone, Deserialize)]
pub struct SolanaBootstrapConfig {
    pub cluster: String,
    #[serde(rename = "rpcUrlEnv")]
    pub rpc_url_env: String,
    pub token: TokenConfig,
    pub provisioning: ProvisioningConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TokenConfig {
    pub decimals: u8,
    #[serde(rename = "mintAuthorityAgentId")]
    pub mint_authority_agent_id: String,
    #[serde(rename = "freezeAuthorityAgentId")]
    pub freeze_authority_agent_id: String,
    #[serde(default, rename = "existingMintPubkey")]
    pub existing_mint_pubkey: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ProvisioningConfig {
    #[serde(rename = "allowedProvisionerAgentId")]
    pub allowed_provisioner_agent_id: String,
    #[serde(rename = "defaultStartingTokens")]
    pub default_starting_tokens: u64,
    #[serde(default, rename = "agentOverrides")]
    pub agent_overrides: std::collections::HashMap<String, u64>,
}

pub fn load_config(path: &str) -> Result<SolanaBootstrapConfig> {
    let raw = std::fs::read_to_string(path).with_context(|| format!("failed reading config: {path}"))?;
    let parsed: SolanaBootstrapConfig = serde_json::from_str(&raw).context("invalid JSON config")?;
    Ok(parsed)
}

pub fn load_rpc_url(config: &SolanaBootstrapConfig) -> Result<String> {
    std::env::var(&config.rpc_url_env)
        .map_err(|_| anyhow!("missing RPC URL env var: {}", config.rpc_url_env))
}

pub fn enforce_provisioner(config: &SolanaBootstrapConfig, actor_agent_id: &str) -> Result<()> {
    if actor_agent_id != config.provisioning.allowed_provisioner_agent_id {
        return Err(anyhow!(
            "agent '{actor_agent_id}' is not allowed to provision; only '{}'",
            config.provisioning.allowed_provisioner_agent_id
        ));
    }
    Ok(())
}

pub fn create_mint(
    rpc_url: &str,
    payer: &Keypair,
    mint_authority: &Pubkey,
    freeze_authority: &Pubkey,
    decimals: u8,
) -> Result<Keypair> {
    let client = RpcClient::new_with_commitment(rpc_url.to_string(), CommitmentConfig::confirmed());
    let mint = Keypair::new();

    let rent = client.get_minimum_balance_for_rent_exemption(spl_token::state::Mint::LEN)?;
    let create_ix = system_instruction::create_account(
        &payer.pubkey(),
        &mint.pubkey(),
        rent,
        spl_token::state::Mint::LEN as u64,
        &spl_token::id(),
    );
    let init_ix = initialize_mint(
        &spl_token::id(),
        &mint.pubkey(),
        mint_authority,
        Some(freeze_authority),
        decimals,
    )?;

    let blockhash = client.get_latest_blockhash()?;
    let tx = Transaction::new_signed_with_payer(
        &[create_ix, init_ix],
        Some(&payer.pubkey()),
        &[payer, &mint],
        blockhash,
    );
    client.send_and_confirm_transaction(&tx)?;
    Ok(mint)
}

pub fn mint_to_wallet(
    rpc_url: &str,
    payer: &Keypair,
    mint: &Pubkey,
    mint_authority: &Keypair,
    destination_owner: &Pubkey,
    amount: u64,
) -> Result<()> {
    let client = RpcClient::new_with_commitment(rpc_url.to_string(), CommitmentConfig::confirmed());
    let ata = get_associated_token_address(destination_owner, mint);

    if client.get_account(&ata).is_err() {
        let create_ata_ix = spl_associated_token_account::instruction::create_associated_token_account(
            &payer.pubkey(),
            destination_owner,
            mint,
            &spl_token::id(),
        );
        let blockhash = client.get_latest_blockhash()?;
        let tx = Transaction::new_signed_with_payer(
            &[create_ata_ix],
            Some(&payer.pubkey()),
            &[payer],
            blockhash,
        );
        client.send_and_confirm_transaction(&tx)?;
    }

    let mint_ix = mint_to(
        &spl_token::id(),
        mint,
        &ata,
        &mint_authority.pubkey(),
        &[],
        amount,
    )?;
    let blockhash = client.get_latest_blockhash()?;
    let tx = Transaction::new_signed_with_payer(
        &[mint_ix],
        Some(&payer.pubkey()),
        &[payer, mint_authority],
        blockhash,
    );
    client.send_and_confirm_transaction(&tx)?;
    Ok(())
}

fn to_base_units(token_amount: u64, decimals: u8) -> Result<u64> {
    let multiplier = 10u64
        .checked_pow(decimals as u32)
        .ok_or_else(|| anyhow!("invalid decimals {}; overflows u64", decimals))?;
    token_amount
        .checked_mul(multiplier)
        .ok_or_else(|| anyhow!("token amount overflow for amount={} decimals={}", token_amount, decimals))
}

pub fn resolve_mint_pubkey(config: &SolanaBootstrapConfig) -> Result<Option<Pubkey>> {
    config
        .token
        .existing_mint_pubkey
        .as_ref()
        .map(|s| Pubkey::from_str(s).map_err(|e| anyhow!("invalid existingMintPubkey '{}': {e}", s)))
        .transpose()
}

pub fn bootstrap_allocations_from_config(
    config: &SolanaBootstrapConfig,
    rpc_url: &str,
    payer: &Keypair,
    mint: &Pubkey,
    mint_authority: &Keypair,
    agents: &[(String, Pubkey)],
) -> Result<()> {
    for (agent_id, wallet) in agents {
        let tokens = config
            .provisioning
            .agent_overrides
            .get(agent_id)
            .copied()
            .unwrap_or(config.provisioning.default_starting_tokens);
        let amount = to_base_units(tokens, config.token.decimals)?;
        mint_to_wallet(rpc_url, payer, mint, mint_authority, wallet, amount)?;
    }
    Ok(())
}

pub fn read_keypair(path: &str) -> Result<Keypair> {
    read_keypair_file(path).map_err(|e| anyhow!("failed reading keypair {path}: {e}"))
}
