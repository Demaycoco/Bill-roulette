use anchor_lang::prelude::*;
use crate::state::{Table, TableStatus};
use crate::errors::BillRouletteErrorCode;

#[derive(Accounts)]
pub struct CancelTable<'info> {
    #[account(
        mut,
        has_one = host @ BillRouletteErrorCode::UnauthorizedHost,
        constraint = table.status != TableStatus::Completed @ BillRouletteErrorCode::RoundAlreadyCompleted
    )]
    pub table: Account<'info, Table>,

    pub host: Signer<'info>,
}

pub fn handler(ctx: Context<CancelTable>) -> Result<()> {
    let table = &mut ctx.accounts.table;
    table.status = TableStatus::Cancelled;
    msg!("Table {} cancelled by host", table.table_id);
    Ok(())
}
