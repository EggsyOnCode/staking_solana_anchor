use anchor_lang::prelude::*;
use anchor_spl::{
    token::{TokenAccount, Mint,Token},
    mint::*
};

declare_id!("FQFDBABauvXLzYeGxFGHniNpEUM4NAGZHvKCnY8WjwJp");

pub mod constants {
    pub const VAULT_SEED: &[u8] = b"vault";
    pub const STAKE_INFO_ACCOUNT: &[u8] = b"stake_info_account";
    pub const TOKEN_SEED: &[u8] = b"token_seed";
}

#[program]
pub mod staking_solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }


    pub fn stake(ctx: Context<Initialize>, amt:u8) -> Result<()> {
        Ok(())
    }


    pub fn destake(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}


#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer : Signer<'info>,


    #[account(
        init_if_needed,
        seeds = [constants::VAULT_SEED],
        bump,
        payer = signer,
        token::mint = mint,
        token::authority = token_vault_account,
    )]
    pub token_vault_account : Account<'info, TokenAccount>,

    #[account()]
    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}