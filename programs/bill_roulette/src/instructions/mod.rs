use anchor_lang::prelude::*;

pub mod create_table;
pub mod join_table;
pub mod update_participant_order;
pub mod update_shared_bill;
pub mod lock_round;
pub mod request_randomness;
pub mod callback_fulfill_randomness;
pub mod cancel_table;
pub mod delegate_table;
pub mod undelegate_table;

pub use create_table::*;
pub use join_table::*;
pub use update_participant_order::*;
pub use update_shared_bill::*;
pub use lock_round::*;
pub use request_randomness::*;
pub use callback_fulfill_randomness::*;
pub use cancel_table::*;
pub use delegate_table::*;
pub use undelegate_table::*;

/// Official MagicBlock Solana VRF Program ID
pub const MAGICBLOCK_VRF_PROGRAM_ID: Pubkey = pubkey!("Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz");

/// Official MagicBlock Ephemeral Rollups Delegation Program ID
pub const MAGICBLOCK_DELEGATION_PROGRAM_ID: Pubkey = pubkey!("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

/// Official MagicBlock Undelegation Discriminator injected by ephemeral macro
pub const MAGICBLOCK_UNDELEGATE_DISCRIMINATOR: [u8; 8] = [196, 28, 41, 206, 48, 37, 51, 167];

