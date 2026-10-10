use anchor_lang::prelude::*;

#[error_code]
pub enum BillRouletteErrorCode {
    #[msg("The table is not in OPEN status.")]
    TableNotOpen,

    #[msg("The table is locked or spin is pending; no mutations or joins permitted.")]
    TableLocked,

    #[msg("The table has been cancelled by the host.")]
    TableCancelled,

    #[msg("Only the designated table host can execute this instruction.")]
    UnauthorizedHost,

    #[msg("Only the registered participant can update their own order.")]
    UnauthorizedParticipant,

    #[msg("Callback signer does not match the authorized VRF Oracle authority.")]
    UnauthorizedOracle,

    #[msg("At least 2 eligible participants are required to lock a round.")]
    InsufficientParticipants,

    #[msg("Order amount exceeds allowable threshold or is invalid.")]
    InvalidOrderAmount,

    #[msg("Invalid round state transition.")]
    InvalidRoundStatus,

    #[msg("This round has already been completed and settled.")]
    RoundAlreadyCompleted,

    #[msg("An active round is already pending for this table.")]
    DuplicateRound,

    #[msg("The randomness request account does not match the active round association.")]
    UnrelatedRandomnessRequest,

    #[msg("The VRF request has already been fulfilled.")]
    VrfRequestAlreadyFulfilled,

    #[msg("Participant account index does not match the calculated winning index.")]
    WinnerIndexMismatch,

    #[msg("Supplied string exceeds maximum byte capacity.")]
    StringTooLong,

    #[msg("Numerical overflow occurred during computation.")]
    NumericalOverflow,

    #[msg("The VRF randomness request has expired.")]
    VrfRequestExpired,

    #[msg("The table is already delegated to an Ephemeral Rollup.")]
    TableAlreadyDelegated,

    #[msg("The table is not delegated to an Ephemeral Rollup.")]
    TableNotDelegated,

    #[msg("Invalid MagicBlock Delegation Program.")]
    InvalidDelegationProgram,
}
