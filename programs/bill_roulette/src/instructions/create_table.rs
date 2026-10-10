use anchor_lang::prelude::*;
use crate::state::{Table, TableStatus, ParticipantRecord};
use crate::errors::BillRouletteErrorCode;

#[derive(Accounts)]
#[instruction(table_id: String, currency: String, game_mode: u8, host_participant_id: String, host_display_name: String, initial_host_order: u64)]
pub struct CreateTable<'info> {
    #[account(
        init,
        payer = host,
        space = Table::LEN,
        seeds = [b"table", host.key().as_ref(), table_id.as_bytes()],
        bump
    )]
    pub table: Account<'info, Table>,

    #[account(
        init,
        payer = host,
        space = ParticipantRecord::LEN,
        seeds = [b"participant", table.key().as_ref(), &0u16.to_le_bytes()],
        bump
    )]
    pub host_participant: Account<'info, ParticipantRecord>,

    #[account(mut)]
    pub host: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateTable>,
    table_id: String,
    currency: String,
    game_mode: u8,
    host_participant_id: String,
    host_display_name: String,
    initial_host_order: u64,
) -> Result<()> {
    require!(table_id.len() <= 32, BillRouletteErrorCode::StringTooLong);
    require!(currency.len() <= 8, BillRouletteErrorCode::StringTooLong);
    require!(host_participant_id.len() <= 32, BillRouletteErrorCode::StringTooLong);
    require!(host_display_name.len() <= 32, BillRouletteErrorCode::StringTooLong);
    require!(initial_host_order <= 10_000_000, BillRouletteErrorCode::InvalidOrderAmount);

    let clock = Clock::get()?;
    let table = &mut ctx.accounts.table;
    table.host = ctx.accounts.host.key();
    table.table_id = table_id;
    table.currency = currency;
    table.game_mode = game_mode;
    table.status = TableStatus::Open;
    table.shared_bill_cents = if game_mode == 1 { initial_host_order } else { 0 };
    table.participant_count = 1;
    table.total_rounds_created = 0;
    table.active_round_id = String::new();
    table.bump = ctx.bumps.table;

    let host_participant = &mut ctx.accounts.host_participant;
    host_participant.table = table.key();
    host_participant.wallet = ctx.accounts.host.key();
    host_participant.participant_id = host_participant_id;
    host_participant.display_name = host_display_name;
    host_participant.order_amount_cents = if game_mode == 0 { initial_host_order } else { 0 };
    host_participant.index = 0;
    host_participant.is_host = true;
    host_participant.is_active = true;
    host_participant.joined_at = clock.unix_timestamp;
    host_participant.bump = ctx.bumps.host_participant;

    msg!("Table initialized with ID: {}", table.table_id);
    Ok(())
}
