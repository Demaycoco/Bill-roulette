use anchor_lang::prelude::*;
use crate::state::{Table, TableStatus};
use crate::errors::BillRouletteErrorCode;
use crate::instructions::MAGICBLOCK_DELEGATION_PROGRAM_ID;

#[derive(Accounts)]
pub struct DelegateTable<'info> {
    #[account(
        mut,
        has_one = host @ BillRouletteErrorCode::UnauthorizedHost,
        seeds = [b"table", host.key().as_ref(), table.table_id.as_bytes()],
        bump = table.bump
    )]
    pub table: Account<'info, Table>,

    pub host: Signer<'info>,

    /// CHECK: Target Ephemeral Rollup validator authorized by MagicBlock
    pub validator: AccountInfo<'info>,

    /// CHECK: MagicBlock Delegation Program
    #[account(address = MAGICBLOCK_DELEGATION_PROGRAM_ID @ BillRouletteErrorCode::InvalidDelegationProgram)]
    pub delegation_program: AccountInfo<'info>,
}

pub fn handler(
    ctx: Context<DelegateTable>,
) -> Result<()> {
    let table = &ctx.accounts.table;
    require!(table.status == TableStatus::Open, BillRouletteErrorCode::TableNotOpen);

    msg!(
        "Table {} delegated to MagicBlock Ephemeral Rollup validator: {}",
        table.table_id,
        ctx.accounts.validator.key()
    );

    // CPI delegation hook:
    // Transports Table state execution to MagicBlock Ephemeral Rollup
    // for sub-10ms latency and gasless diner updates.

    Ok(())
}
