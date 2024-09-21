use anchor_lang::prelude::*;
use anchor_spl::{
    token::{TokenAccount, Mint,Token, Transfer, transfer},
    associated_token::AssociatedToken
};
use std::mem::size_of;
// use solana_program::clock::Clock;

declare_id!("8eeWAxSis5uy5ox3ucNj2DouFsc7bfMvTnGx3wc1GaXG");

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
        let stake_info: &mut Account<'_, StakeInfo> = &mut ctx.accounts.stake_info_account; 

        if (stake_info.is_staked) {
            return Err(ErrorCodes::IsStaked.into());
        }

        if (amt == 0) {
            return Err(ErrorCodes::NoTokens.into());
        }

        // staking logic

        // amt equivalent is sent to the contract itself
        // create a var to store the APR
        // on every state changing tx update the stake_info account for the user : they will be added to the rewards
        // when destake we do rewards * curent apr * time staked

        let clock  = &mut ctx.accounts.clock;

        stake_info.stake_at_slot = clock.slot;
        stake_info.is_staked = true;


        // format the staking amount
        // 10^decimals * amt
        let stake_amt = amt.checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32)).unwrap();

        // transfer stake amt to user_Stake_account from user_token_account
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer{
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.user_staking_account.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                }
            ),
            stake_amt 
        )?;
            
        

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

    pub clock : Sysvar<'info, Clock>,

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

#[error_code]
pub enum ErrorCodes{
    #[msg("Tokens already staked")]
    IsStaked,
    #[msg("Tokens not staked")]
    NotStaked,
    #[msg("No Tokens To Stake")]
    NoTokens
}