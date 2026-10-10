use anchor_lang::prelude::*;
use crate::state::{Table, TableStatus, ParticipantRecord};
use crate::errors::BillRouletteErrorCode;

#[derive(Accounts)]
pub struct UpdateParticipantOrder<'info> {
    #[account(
        constraint = table.status == TableStatus::Open @ BillRouletteErrorCode::TableNotOpen
    )]
    pub table: Account<'info, Table>,

    #[account(
        mut,
        has_one = table,
        constraint = participant_record.wallet == participant.key() @ BillRouletteErrorCode::UnauthorizedParticipant
    )]
    pub participant_record: Account<'info, ParticipantRecord>,

    pub participant: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateParticipantOrder>, new_order_amount_cents: u64) -> Result<()> {
    require!(new_order_amount_cents <= 10_000_000, BillRouletteErrorCode::InvalidOrderAmount);

    let record = &mut ctx.accounts.participant_record;
    record.order_amount_cents = new_order_amount_cents;

    msg!("Updated order for participant {} to {}", record.display_name, new_order_amount_cents);
    Ok(())
}
