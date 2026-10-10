use anchor_lang::prelude::*;
use crate::state::{Table, TableStatus, ParticipantRecord};
use crate::errors::BillRouletteErrorCode;

#[derive(Accounts)]
#[instruction(participant_id: String, display_name: String, order_amount_cents: u64)]
pub struct JoinTable<'info> {
    #[account(
        mut,
        constraint = table.status == TableStatus::Open @ BillRouletteErrorCode::TableNotOpen
    )]
    pub table: Account<'info, Table>,

    #[account(
        init,
        payer = participant,
        space = ParticipantRecord::LEN,
        seeds = [b"participant", table.key().as_ref(), &table.participant_count.to_le_bytes()],
        bump
    )]
    pub participant_record: Account<'info, ParticipantRecord>,

    #[account(mut)]
    pub participant: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<JoinTable>,
    participant_id: String,
    display_name: String,
    order_amount_cents: u64,
) -> Result<()> {
    require!(participant_id.len() <= 32, BillRouletteErrorCode::StringTooLong);
    require!(display_name.len() <= 32, BillRouletteErrorCode::StringTooLong);
    require!(order_amount_cents <= 10_000_000, BillRouletteErrorCode::InvalidOrderAmount);

    let clock = Clock::get()?;
    let table = &mut ctx.accounts.table;
    let participant_index = table.participant_count;

    let record = &mut ctx.accounts.participant_record;
    record.table = table.key();
    record.wallet = ctx.accounts.participant.key();
    record.participant_id = participant_id;
    record.display_name = display_name;
    record.order_amount_cents = if table.game_mode == 0 { order_amount_cents } else { 0 };
    record.index = participant_index;
    record.is_host = false;
    record.is_active = true;
    record.joined_at = clock.unix_timestamp;
    record.bump = ctx.bumps.participant_record;

    table.participant_count = table.participant_count
        .checked_add(1)
        .ok_or(BillRouletteErrorCode::NumericalOverflow)?;

    msg!("Participant joined at index: {}", participant_index);
    Ok(())
}
