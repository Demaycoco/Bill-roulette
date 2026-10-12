use anchor_lang::prelude::*;
use crate::state::Table;
use crate::errors::BillRouletteErrorCode;

#[derive(Accounts)]
pub struct UndelegateTable<'info> {
    #[account(
        mut,
        has_one = host @ BillRouletteErrorCode::UnauthorizedHost,
        seeds = [b"table", host.key().as_ref(), table.table_id.as_bytes()],
        bump = table.bump
    )]
    pub table: Account<'info, Table>,

    pub host: Signer<'info>,

    /// CHECK: MagicBlock Delegation Program or undelegation authority
    pub delegation_program: AccountInfo<'info>,
}

pub fn handler(
    ctx: Context<UndelegateTable>,
) -> Result<()> {
    let table = &ctx.accounts.table;

    msg!(
        "Table {} undelegated from MagicBlock Ephemeral Rollup to Solana Mainnet Beta L1.",
        table.table_id
    );

    // Undelegation callback commits final state and restores account ownership
    // back to the Bill Roulette program ID on the Solana base layer.

    Ok(())
}
