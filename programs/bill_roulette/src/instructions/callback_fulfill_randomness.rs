use anchor_lang::prelude::*;
use crate::state::{Table, TableStatus, Round, RoundStatus, VrfRequestAssociation, ParticipantRecord};
use crate::errors::BillRouletteErrorCode;
use crate::instructions::MAGICBLOCK_VRF_PROGRAM_ID;

#[derive(Accounts)]
pub struct CallbackFulfillRandomness<'info> {
    #[account(
        mut,
        constraint = table.status == TableStatus::SpinPending @ BillRouletteErrorCode::InvalidRoundStatus
    )]
    pub table: Account<'info, Table>,

    #[account(
        mut,
        has_one = table,
        constraint = round.status == RoundStatus::RandomnessPending @ BillRouletteErrorCode::InvalidRoundStatus,
        constraint = round.vrf_request_account == vrf_request.key() @ BillRouletteErrorCode::UnrelatedRandomnessRequest
    )]
    pub round: Account<'info, Round>,

    #[account(
        mut,
        has_one = round,
        constraint = !vrf_request.is_fulfilled @ BillRouletteErrorCode::VrfRequestAlreadyFulfilled,
        constraint = (vrf_request.oracle_authority == oracle_signer.key() || oracle_signer.key() == MAGICBLOCK_VRF_PROGRAM_ID) @ BillRouletteErrorCode::UnauthorizedOracle
    )]
    pub vrf_request: Account<'info, VrfRequestAssociation>,

    /// The participant record corresponding to the deterministically calculated winning index.
    #[account(
        has_one = table,
        seeds = [b"participant", table.key().as_ref(), &winning_participant_record.index.to_le_bytes()],
        bump = winning_participant_record.bump
    )]
    pub winning_participant_record: Account<'info, ParticipantRecord>,

    /// The authorized MagicBlock VRF Oracle signer or MagicBlock VRF program that verified the RFC 9381 proof.
    pub oracle_signer: Signer<'info>,
}

pub fn handler(
    ctx: Context<CallbackFulfillRandomness>,
    randomness_beacon: [u8; 32],
) -> Result<()> {
    let clock = Clock::get()?;
    let round = &mut ctx.accounts.round;
    let table = &mut ctx.accounts.table;
    let vrf_request = &mut ctx.accounts.vrf_request;
    let winning_participant = &ctx.accounts.winning_participant_record;

    // 1. Enforce that the VRF randomness request has not expired
    require!(
        clock.unix_timestamp <= vrf_request.expires_at,
        BillRouletteErrorCode::VrfRequestExpired
    );

    // 2. Authoritative winner calculation: strictly modulo arithmetic over verified 256-bit beacon
    let beacon_u128 = u128::from_le_bytes(
        randomness_beacon[0..16]
            .try_into()
            .map_err(|_| BillRouletteErrorCode::NumericalOverflow)?
    );
    let calculated_winner_index = (beacon_u128 % (round.frozen_participant_count as u128)) as u16;

    // 3. On-chain validation: ensure the participant account matches the on-chain calculated winner index
    require_eq!(
        winning_participant.index,
        calculated_winner_index,
        BillRouletteErrorCode::WinnerIndexMismatch
    );

    // 4. Record authoritative selected participant and verified randomness beacon
    round.randomness_beacon = randomness_beacon;
    round.selected_participant_index = calculated_winner_index;
    round.selected_participant_wallet = winning_participant.wallet;
    round.selected_participant_id = winning_participant.participant_id.clone();
    round.settled_at = clock.unix_timestamp;
    round.status = RoundStatus::Completed;

    // 5. Update VRF request state to fulfilled
    vrf_request.is_fulfilled = true;

    // 6. Update Table state
    table.status = TableStatus::Completed;
    table.active_round_id = String::new();

    msg!(
        "MagicBlock VRF fulfilled! Round {} settled. Randomness beacon: {:?}, Winner index: {}, Winner: {}",
        round.round_id,
        round.randomness_beacon,
        calculated_winner_index,
        winning_participant.display_name
    );

    Ok(())
}

