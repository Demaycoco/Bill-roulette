use anchor_lang::prelude::*;
use crate::state::{Table, TableStatus};
use crate::errors::BillRouletteErrorCode;

#[derive(Accounts)]
pub struct UpdateSharedBill<'info> {
    #[account(
        mut,
        has_one = host @ BillRouletteErrorCode::UnauthorizedHost,
        constraint = table.status == TableStatus::Open @ BillRouletteErrorCode::TableNotOpen
    )]
    pub table: Account<'info, Table>,

    pub host: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateSharedBill>, new_shared_bill_cents: u64) -> Result<()> {
    require!(new_shared_bill_cents <= 10_000_000, BillRouletteErrorCode::InvalidOrderAmount);

    let table = &mut ctx.accounts.table;
    table.shared_bill_cents = new_shared_bill_cents;

    msg!("Updated shared bill to {}", new_shared_bill_cents);
    Ok(())
}
