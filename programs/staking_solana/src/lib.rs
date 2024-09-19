use anchor_lang::prelude::*;
use anchor_spl::{
    token::{TokenAccount, Mint,Token},
    associated_token::AssociatedToken
};
use std::mem::size_of;

declare_id!("FQFDBABauvXLzYeGxFGHniNpEUM4NAGZHvKCnY8WjwJp");

pub mod constants {
    pub const VAULT_SEED: &[u8] = b"vault";
    pub const STAKE_INFO_ACCOUNT: &[u8] = b"stake_info_account";
    pub const TOKEN_SEED: &[u8] = b"token_seed";
}

#[program]
pub mod staking_solana {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }


    pub fn stake(ctx: Context<Stake>, amt:u64) -> Result<()> {

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

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub signer : Signer<'info>,

    #[account(
        init_if_needed,
        seeds = [constants::STAKE_INFO_ACCOUNT, signer.key.as_ref()],
        space = size_of::<StakeInfo>() + 8,
        bump,
        payer = signer,
    )]
    pub stake_info_account : Account<'info, StakeInfo>,

    #[account(
        init_if_needed,
        seeds = [constants::TOKEN_SEED, signer.key.as_ref()],
        bump,
        payer = signer,
        token::mint = mint,
        token::authority = user_staking_account
    )]
    pub user_staking_account : Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub user_token_account : Account<'info, TokenAccount>,

    #[account()]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_program : Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct StakeInfo {
    pub total_staked: u64,
    pub remaining_rewards: u64,
    pub stake_at_slot: u64,
    pub is_staked: bool,
}