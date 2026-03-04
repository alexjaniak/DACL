use anyhow::{anyhow, Context, Result};
use serde::Deserialize;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    message::Message,
    program_pack::Pack,
    pubkey::Pubkey,
    signature::{read_keypair_file, Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use spl_associated_token_account::get_associated_token_address;
use spl_token::instruction::{initialize_mint, mint_to};

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
    #[serde(default, rename = "existingMintPubkey")]
    pub existing_mint_pubkey: Option<String>,
    #[serde(rename = "mintAuthorityAgentId")]
    pub mint_authority_agent_id: String,
    #[serde(rename = "freezeAuthorityAgentId")]
    pub freeze_authority_agent_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ProvisioningConfig {
    #[serde(rename = "allowedProvisionerAgentId")]
    pub allowed_provisioner_agent_id: String,
    #[serde(rename = "defaultStartingTokens")]
    pub default_starting_tokens: u64,
    #[serde(default, rename = "initialSolLamports")]
    pub initial_sol_lamports: u64,
    #[serde(default, rename = "agentOverrides")]
    pub agent_overrides: std::collections::HashMap<String, u64>,
}

pub fn load_config(path: &str) -> Result<SolanaBootstrapConfig> {
    let raw =
        std::fs::read_to_string(path).with_context(|| format!("failed reading config: {path}"))?;
    let parsed: SolanaBootstrapConfig =
        serde_json::from_str(&raw).context("invalid JSON config")?;
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
        let create_ata_ix =
            spl_associated_token_account::instruction::create_associated_token_account(
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

pub fn bootstrap_allocations_from_config(
    config: &SolanaBootstrapConfig,
    rpc_url: &str,
    payer: &Keypair,
    mint: &Pubkey,
    mint_authority: &Keypair,
    agents: &[(String, Pubkey)],
) -> Result<()> {
    for (agent_id, wallet) in agents {
        let token_units = config
            .provisioning
            .agent_overrides
            .get(agent_id)
            .copied()
            .unwrap_or(config.provisioning.default_starting_tokens);
        let amount = token_units
            .checked_mul(10_u64.pow(config.token.decimals as u32))
            .ok_or_else(|| anyhow!("token amount overflow for agent '{agent_id}'"))?;
        mint_to_wallet(rpc_url, payer, mint, mint_authority, wallet, amount)?;
    }
    Ok(())
}

pub fn fund_agents_from_config(
    config: &SolanaBootstrapConfig,
    rpc_url: &str,
    payer: &Keypair,
    agents: &[(String, Pubkey)],
) -> Result<Vec<(String, String)>> {
    if config.provisioning.initial_sol_lamports == 0 {
        return Ok(Vec::new());
    }

    let client = RpcClient::new_with_commitment(rpc_url.to_string(), CommitmentConfig::confirmed());
    let mut signatures = Vec::new();

    for (agent_id, wallet) in agents {
        let transfer_ix = system_instruction::transfer(
            &payer.pubkey(),
            wallet,
            config.provisioning.initial_sol_lamports,
        );
        let msg = Message::new(&[transfer_ix], Some(&payer.pubkey()));
        let fee = client
            .get_fee_for_message(&msg)
            .context("failed to estimate transfer fee")?;
        let balance = client
            .get_balance(&payer.pubkey())
            .context("failed to fetch payer balance")?;
        let required = config
            .provisioning
            .initial_sol_lamports
            .checked_add(fee)
            .ok_or_else(|| anyhow!("lamports overflow while preparing transfer"))?;

        if balance < required {
            return Err(anyhow!(
                "insufficient admin balance for funding '{agent_id}': need {required} lamports (transfer {} + estimated fee {fee}), have {balance}",
                config.provisioning.initial_sol_lamports
            ));
        }

        let blockhash = client.get_latest_blockhash()?;
        let transfer_ix = system_instruction::transfer(
            &payer.pubkey(),
            wallet,
            config.provisioning.initial_sol_lamports,
        );
        let tx = Transaction::new_signed_with_payer(
            &[transfer_ix],
            Some(&payer.pubkey()),
            &[payer],
            blockhash,
        );
        let sig = client.send_and_confirm_transaction(&tx)?;
        signatures.push((agent_id.clone(), sig.to_string()));
    }

    Ok(signatures)
}

pub fn read_keypair(path: &str) -> Result<Keypair> {
    read_keypair_file(path).map_err(|e| anyhow!("failed reading keypair {path}: {e}"))
}
