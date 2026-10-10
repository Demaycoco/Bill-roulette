use anchor_lang::prelude::*;
use crate::state::{Table, TableStatus, Round, RoundStatus};
use crate::errors::BillRouletteErrorCode;

#[derive(Accounts)]
#[instruction(round_id: String, frozen_bill_cents: u64, participant_commitment: [u8; 32])]
pub struct LockRound<'info> {
    #[account(
        mut,
        has_one = host @ BillRouletteErrorCode::UnauthorizedHost,
        constraint = table.status == TableStatus::Open || table.status == TableStatus::Locked @ BillRouletteErrorCode::TableNotOpen,
        constraint = table.participant_count >= 2 @ BillRouletteErrorCode::InsufficientParticipants
    )]
    pub table: Account<'info, Table>,

    #[account(
        init,
        payer = host,
        space = Round::LEN,
        seeds = [b"round", table.key().as_ref(), round_id.as_bytes()],
        bump
    )]
    pub round: Account<'info, Round>,

    #[account(mut)]
    pub host: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<LockRound>,
    round_id: String,
    frozen_bill_cents: u64,
    participant_commitment: [u8; 32],
) -> Result<()> {
    require!(round_id.len() <= 32, BillRouletteErrorCode::StringTooLong);
    require!(frozen_bill_cents > 0, BillRouletteErrorCode::InvalidOrderAmount);

    let clock = Clock::get()?;
    let table = &mut ctx.accounts.table;

    // Reject duplicate active round
    if !table.active_round_id.is_empty() && table.status == TableStatus::SpinPending {
        return err!(BillRouletteErrorCode::DuplicateRound);
    }

    let round = &mut ctx.accounts.round;
    round.table = table.key();
    round.round_id = round_id.clone();
    round.status = RoundStatus::Locked;
    round.frozen_bill_cents = frozen_bill_cents;
    round.frozen_participant_count = table.participant_count;
    round.participant_commitment = participant_commitment;
    round.vrf_request_account = Pubkey::default();
    round.randomness_beacon = [0u8; 32];
    round.selected_participant_index = 0;
    round.selected_participant_wallet = Pubkey::default();
    round.selected_participant_id = String::new();
    round.locked_at = clock.unix_timestamp;
    round.settled_at = 0;
    round.bump = ctx.bumps.round;

    // Freeze table state
    table.status = TableStatus::Locked;
    table.active_round_id = round_id;
    table.total_rounds_created = table.total_rounds_created
        .checked_add(1)
        .ok_or(BillRouletteErrorCode::NumericalOverflow)?;

    msg!("Round locked: {} with {} frozen diners and total {}", round.round_id, round.frozen_participant_count, round.frozen_bill_cents);
    Ok(())
}
