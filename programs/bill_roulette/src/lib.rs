use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Ey54kdCeHW4PVT3cKDm2TKFmPrWWdqB2GysVSyiJpxHq");

#[program]
pub mod bill_roulette {
    use super::*;

    /// 1. Create a dining table and register the host as the first participant (index 0).
    pub fn create_table(
        ctx: Context<CreateTable>,
        table_id: String,
        currency: String,
        game_mode: u8,
        host_participant_id: String,
        host_display_name: String,
        initial_host_order: u64,
    ) -> Result<()> {
        instructions::create_table::handler(
            ctx,
            table_id,
            currency,
            game_mode,
            host_participant_id,
            host_display_name,
            initial_host_order,
        )
    }

    /// 2. Join an existing open table at deterministic index `table.participant_count`.
    pub fn join_table(
        ctx: Context<JoinTable>,
        participant_id: String,
        display_name: String,
        order_amount_cents: u64,
    ) -> Result<()> {
        instructions::join_table::handler(ctx, participant_id, display_name, order_amount_cents)
    }

    /// 3. Update an individual participant's order while table is OPEN.
    pub fn update_participant_order(
        ctx: Context<UpdateParticipantOrder>,
        new_order_amount_cents: u64,
    ) -> Result<()> {
        instructions::update_participant_order::handler(ctx, new_order_amount_cents)
    }

    /// 4. Update the total shared bill (Host only, while table is OPEN).
    pub fn update_shared_bill(
        ctx: Context<UpdateSharedBill>,
        new_shared_bill_cents: u64,
    ) -> Result<()> {
        instructions::update_shared_bill::handler(ctx, new_shared_bill_cents)
    }

    /// 5. Lock a round, freezing participants and bill total (Transitions to LOCKED).
    pub fn lock_round(
        ctx: Context<LockRound>,
        round_id: String,
        frozen_bill_cents: u64,
        participant_commitment: [u8; 32],
    ) -> Result<()> {
        instructions::lock_round::handler(ctx, round_id, frozen_bill_cents, participant_commitment)
    }

    /// 6. Request verifiable randomness through MagicBlock VRF (Transitions to RANDOMNESS_PENDING).
    pub fn request_randomness(
        ctx: Context<RequestRandomness>,
        caller_seed: [u8; 32],
    ) -> Result<()> {
        instructions::request_randomness::handler(ctx, caller_seed)
    }

    /// 7. Process verified MagicBlock VRF callback, calculate authoritative winner index via modulo math,
    /// and record the chosen payer (Transitions to COMPLETED).
    pub fn callback_fulfill_randomness(
        ctx: Context<CallbackFulfillRandomness>,
        randomness_beacon: [u8; 32],
    ) -> Result<()> {
        instructions::callback_fulfill_randomness::handler(ctx, randomness_beacon)
    }

    /// 8. Cancel an active table (Host only).
    pub fn cancel_table(ctx: Context<CancelTable>) -> Result<()> {
        instructions::cancel_table::handler(ctx)
    }

    /// 9. Delegate table to MagicBlock Ephemeral Rollup for sub-10ms gasless dining experience.
    pub fn delegate_table(ctx: Context<DelegateTable>) -> Result<()> {
        instructions::delegate_table::handler(ctx)
    }

    /// 10. Undelegate table from Ephemeral Rollup back to Solana Mainnet Beta L1 for authoritative round settlement.
    pub fn undelegate_table(ctx: Context<UndelegateTable>) -> Result<()> {
        instructions::undelegate_table::handler(ctx)
    }
}
