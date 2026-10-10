use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum TableStatus {
    #[default]
    Open,
    Locked,
    SpinPending,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum RoundStatus {
    #[default]
    Created,
    Locked,
    RandomnessPending,
    Completed,
    Cancelled,
}

#[account]
#[derive(Default)]
pub struct Table {
    pub host: Pubkey,
    pub table_id: String,            // max 32 bytes
    pub currency: String,            // max 8 bytes
    pub game_mode: u8,               // 0 = Individual, 1 = Shared
    pub status: TableStatus,         // 1 byte
    pub shared_bill_cents: u64,      // 8 bytes
    pub participant_count: u16,      // 2 bytes
    pub total_rounds_created: u32,   // 4 bytes
    pub active_round_id: String,     // max 32 bytes
    pub bump: u8,                    // 1 byte
}

impl Table {
    // 8 discriminator + 32 host + (4 + 32) table_id + (4 + 8) currency + 1 game_mode + 1 status + 8 shared_bill + 2 count + 4 rounds + (4 + 32) active_round_id + 1 bump = 147 bytes
    pub const LEN: usize = 8 + 32 + (4 + 32) + (4 + 8) + 1 + 1 + 8 + 2 + 4 + (4 + 32) + 1;
}

#[account]
#[derive(Default)]
pub struct ParticipantRecord {
    pub table: Pubkey,               // 32 bytes
    pub wallet: Pubkey,              // 32 bytes
    pub participant_id: String,      // max 32 bytes
    pub display_name: String,        // max 32 bytes
    pub order_amount_cents: u64,     // 8 bytes
    pub index: u16,                  // 2 bytes (0 to N-1 for deterministic modulo lookup)
    pub is_host: bool,               // 1 byte
    pub is_active: bool,             // 1 byte
    pub joined_at: i64,              // 8 bytes
    pub bump: u8,                    // 1 byte
}

impl ParticipantRecord {
    // 8 discriminator + 32 table + 32 wallet + (4 + 32) id + (4 + 32) name + 8 order + 2 index + 1 is_host + 1 is_active + 8 joined_at + 1 bump = 161 bytes
    pub const LEN: usize = 8 + 32 + 32 + (4 + 32) + (4 + 32) + 8 + 2 + 1 + 1 + 8 + 1;
}

#[account]
#[derive(Default)]
pub struct Round {
    pub table: Pubkey,                       // 32 bytes
    pub round_id: String,                    // max 32 bytes
    pub status: RoundStatus,                 // 1 byte
    pub frozen_bill_cents: u64,              // 8 bytes
    pub frozen_participant_count: u16,       // 2 bytes
    pub participant_commitment: [u8; 32],    // 32 bytes SHA-256 canonical integrity hash
    pub vrf_request_account: Pubkey,         // 32 bytes
    pub randomness_beacon: [u8; 32],         // 32 bytes
    pub selected_participant_index: u16,     // 2 bytes
    pub selected_participant_wallet: Pubkey, // 32 bytes
    pub selected_participant_id: String,     // max 32 bytes
    pub locked_at: i64,                      // 8 bytes
    pub settled_at: i64,                     // 8 bytes
    pub bump: u8,                            // 1 byte
}

impl Round {
    // 8 discriminator + 32 table + (4 + 32) round_id + 1 status + 8 bill + 2 count + 32 hash + 32 vrf_req + 32 beacon + 2 winner_idx + 32 winner_wallet + (4 + 32) winner_id + 8 locked + 8 settled + 1 bump = 280 bytes
    pub const LEN: usize = 8 + 32 + (4 + 32) + 1 + 8 + 2 + 32 + 32 + 32 + 2 + 32 + (4 + 32) + 8 + 8 + 1;
}

#[account]
#[derive(Default)]
pub struct VrfRequestAssociation {
    pub round: Pubkey,                       // 32 bytes
    pub oracle_authority: Pubkey,            // 32 bytes (MagicBlock VRF program or Oracle queue)
    pub caller_seed: [u8; 32],               // 32 bytes
    pub request_id: [u8; 32],                // 32 bytes unique VRF request ID
    pub requested_at: i64,                   // 8 bytes
    pub expires_at: i64,                     // 8 bytes (expiration threshold)
    pub is_fulfilled: bool,                  // 1 byte
    pub bump: u8,                            // 1 byte
}

impl VrfRequestAssociation {
    // 8 discriminator + 32 round + 32 oracle + 32 caller_seed + 32 request_id + 8 requested_at + 8 expires_at + 1 is_fulfilled + 1 bump = 154 bytes
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
}
