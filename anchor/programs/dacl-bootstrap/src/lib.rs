use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

declare_id!("DaCLBooTStrap1111111111111111111111111111111");

#[program]
pub mod dacl_bootstrap {
    use super::*;

    pub fn create_mint(_ctx: Context<CreateMint>, _decimals: u8) -> Result<()> {
        // Mint account initialization is handled by account constraints.
        Ok(())
    }

    pub fn mint_to_wallet(ctx: Context<MintToWallet>, amount: u64) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination_ata.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn bootstrap_allocations_from_config(
        _ctx: Context<BootstrapAllocationsFromConfig>,
        _agent_count: u16,
    ) -> Result<()> {
        // Allocation loop is executed client-side from config to keep per-agent wallet mapping flexible.
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct CreateMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    /// CHECK: authority is validated by signer + off-chain policy checks.
    pub mint_authority: Signer<'info>,
    #[account(mut)]
    /// CHECK: freeze authority is validated by signer + off-chain policy checks.
    pub freeze_authority: Signer<'info>,
    #[account(
        init,
        payer = payer,
        mint::decimals = decimals,
        mint::authority = mint_authority,
        mint::freeze_authority = freeze_authority
    )]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintToWallet<'info> {
    pub mint_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = destination_owner
    )]
    pub destination_ata: Account<'info, TokenAccount>,
    /// CHECK: owner of destination ATA.
    pub destination_owner: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BootstrapAllocationsFromConfig<'info> {
    pub authority: Signer<'info>,
}
