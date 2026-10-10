use anchor_lang::prelude::*;
use solana_program::hash::hashv;
use crate::state::{Table, TableStatus, Round, RoundStatus, VrfRequestAssociation};
use crate::errors::BillRouletteErrorCode;

/// Official MagicBlock Solana VRF Program ID
pub const MAGICBLOCK_VRF_PROGRAM_ID: Pubkey = pubkey!("Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz");

#[derive(Accounts)]
#[instruction(caller_seed: [u8; 32])]
pub struct RequestRandomness<'info> {
    #[account(
        mut,
        has_one = host @ BillRouletteErrorCode::UnauthorizedHost,
        constraint = table.status == TableStatus::Locked @ BillRouletteErrorCode::TableNotOpen
    )]
    pub table: Account<'info, Table>,

    #[account(
        mut,
        has_one = table,
        constraint = round.status == RoundStatus::Locked @ BillRouletteErrorCode::InvalidRoundStatus
    )]
    pub round: Account<'info, Round>,

    #[account(
        init,
        payer = host,
        space = VrfRequestAssociation::LEN,
        seeds = [b"vrf_request", round.key().as_ref()],
        bump
    )]
    pub vrf_request: Account<'info, VrfRequestAssociation>,

    /// CHECK: The designated MagicBlock VRF Oracle program or authorized oracle queue/authority.
    pub oracle_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub host: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RequestRandomness>,
    caller_seed: [u8; 32],
) -> Result<()> {
    let clock = Clock::get()?;
    let round = &mut ctx.accounts.round;
    let table = &mut ctx.accounts.table;
    let vrf_request = &mut ctx.accounts.vrf_request;

    // Validate that there are at least 2 participants locked in the round
    require!(
        round.frozen_participant_count >= 2,
        BillRouletteErrorCode::InsufficientParticipants
    );

    // Transition state
    round.status = RoundStatus::RandomnessPending;
    round.vrf_request_account = vrf_request.key();

    table.status = TableStatus::SpinPending;

    // Derive deterministic 32-byte VRF request ID
    let request_id_hash = hashv(&[
        round.key().as_ref(),
        &caller_seed,
        &clock.unix_timestamp.to_le_bytes(),
    ]);

    // Record association with authorized MagicBlock VRF Oracle
    vrf_request.round = round.key();
    vrf_request.oracle_authority = ctx.accounts.oracle_authority.key();
    vrf_request.caller_seed = caller_seed;
    vrf_request.request_id = request_id_hash.to_bytes();
    vrf_request.requested_at = clock.unix_timestamp;
    vrf_request.expires_at = clock.unix_timestamp + 300; // 5 minute request validity
    vrf_request.is_fulfilled = false;
    vrf_request.bump = ctx.bumps.vrf_request;

    msg!(
        "MagicBlock VRF randomness requested for round {}. Request ID: {:?}, Oracle: {}",
        round.round_id,
        vrf_request.request_id,
        vrf_request.oracle_authority
    );
    Ok(())
}

