# Solana Anchor Smart Contract & MagicBlock VRF Deployment Guide

This document details the architecture, on-chain integration, and deployment procedure for the **Bill Roulette** Anchor program on **Solana Devnet** with the official **MagicBlock Verifiable Random Function (VRF)**.

---

## 1. Official MagicBlock VRF Specification

- **Official Repository**: [magicblock-labs/solana-vrf](https://github.com/magicblock-labs/solana-vrf)
- **MagicBlock VRF Program ID**: `Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz`
- **Default Devnet Oracle Queue**: `B8hnq84Uo739q27iN4eW1eE5QjSjU4G4yZ76u4PVRFq`
- **Default Ephemeral Queue**: `D7ck4iL1oyncNhKheb1TUgpV7V7axYWVQ6fw26EPKp1h`
- **Standard**: RFC 9381 (ECVRF using Ristretto255 / Curve25519)
- **Bill Roulette Program ID**: `Ey54kdCeHW4PVT3cKDm2TKFmPrWWdqB2GysVSyiJpxHq`

---

## 2. Request Flow & Accounts Required

### A. `request_randomness` Instruction

Initiates the verifiable randomness request by locking the table and round, generating a client seed commitment, and initializing the VRF request PDA.

#### Required Accounts:
1. `table`: `[Account<'info, Table>, mut]`
   - Constraint: `has_one = host`, `table.status == TableStatus::Locked`
2. `round`: `[Account<'info, Round>, mut]`
   - Constraint: `has_one = table`, `round.status == RoundStatus::Locked`
3. `vrf_request`: `[Account<'info, VrfRequestAssociation>, init, payer = host]`
   - Seeds: `[b"vrf_request", round.key().as_ref()]`
   - Space: `VrfRequestAssociation::LEN` (154 bytes)
4. `oracle_authority`: `[UncheckedAccount<'info>]`
   - The MagicBlock VRF Program (`Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz`) or designated Oracle Queue account.
5. `host`: `[Signer<'info>, mut]`
   - Must match `table.host`.
6. `system_program`: `[Program<'info, System>]`

#### Arguments:
- `caller_seed`: `[u8; 32]` — 32-byte cryptographically secure client entropy.

---

### B. `callback_fulfill_randomness` Instruction

Invoked by the MagicBlock VRF Program or authorized Oracle authority once the ECVRF proof is verified on-chain.

#### Required Accounts:
1. `table`: `[Account<'info, Table>, mut]`
   - Constraint: `table.status == TableStatus::SpinPending`
2. `round`: `[Account<'info, Round>, mut]`
   - Constraint: `has_one = table`, `round.status == RoundStatus::RandomnessPending`, `round.vrf_request_account == vrf_request.key()`
3. `vrf_request`: `[Account<'info, VrfRequestAssociation>, mut]`
   - Constraint: `has_one = round`, `!vrf_request.is_fulfilled`
   - Authorization: `vrf_request.oracle_authority == oracle_signer.key() || oracle_signer.key() == MAGICBLOCK_VRF_PROGRAM_ID`
4. `winning_participant_record`: `[Account<'info, ParticipantRecord>]`
   - Seeds: `[b"participant", table.key().as_ref(), &winning_participant_record.index.to_le_bytes()]`
   - Constraint: `winning_participant_record.index == calculated_winner_index`
5. `oracle_signer`: `[Signer<'info>]`
   - Must be the authorized MagicBlock VRF Program or Oracle authority.

#### Arguments:
- `randomness_beacon`: `[u8; 32]` — 256-bit verified random output from the MagicBlock VRF.

---

## 3. How the Callback is Authorized

1. **Signer Verification**: The Anchor program checks:
   ```rust
   constraint = (vrf_request.oracle_authority == oracle_signer.key() 
              || oracle_signer.key() == MAGICBLOCK_VRF_PROGRAM_ID)
              @ BillRouletteErrorCode::UnauthorizedOracle
   ```
2. **Freshness & Expiration**: The request is only valid for 300 seconds (5 minutes) from creation. If `clock.unix_timestamp > vrf_request.expires_at`, it is rejected with `VrfRequestExpired`.
3. **Single-Use Enforcement**: `!vrf_request.is_fulfilled` ensures replay attacks and duplicate settlements are impossible.
4. **State Machine Integrity**: Requires `round.status == RoundStatus::RandomnessPending` and `table.status == TableStatus::SpinPending`.

---

## 4. How the Winner is Deterministically Chosen

1. **Unweighted Selection (Equal Probability 1/N)**:
   The first 16 bytes of the verified 32-byte randomness beacon are parsed as a little-endian unsigned 128-bit integer:
   ```rust
   let beacon_u128 = u128::from_le_bytes(randomness_beacon[0..16].try_into().unwrap());
   let calculated_winner_index = (beacon_u128 % (round.frozen_participant_count as u128)) as u16;
   ```
2. **Strict Verification**:
   The contract strictly checks that the passed participant account index equals `calculated_winner_index`:
   ```rust
   require_eq!(
       winning_participant.index,
       calculated_winner_index,
       BillRouletteErrorCode::WinnerIndexMismatch
   );
   ```
   **Crucial Rule**: The frontend cannot select or submit an arbitrary winner. The winner is mathematically locked to the verifiable beacon.

---

## 5. Deployment and Testing on Solana Devnet

### Prerequisites
```bash
# Configure Solana CLI for Devnet
solana config set --url https://api.devnet.solana.com

# Create keypair if needed
solana-keygen new --outfile ~/.config/solana/id.json

# Request Devnet SOL for deployment rent
solana airdrop 2 ~/.config/solana/id.json
```

### Build & Test
```bash
# Run automated specification test suite (36 tests)
npm test

# Build Anchor smart contract
anchor build
```

### Deploy to Devnet
```bash
# Deploy to Devnet cluster
anchor deploy --provider.cluster devnet

# Inspect program state
solana program show Ey54kdCeHW4PVT3cKDm2TKFmPrWWdqB2GysVSyiJpxHq
```

---

## 6. Frontend Integration & Fallback Handling

The frontend `magicBlockVrfService` mirrors the on-chain protocol:
1. **5-Stage UI State Tracker**:
   - `ROUND_LOCKED`: Bill and diners frozen; canonical digest created.
   - `VRF_REQUESTED`: Client seed submitted to MagicBlock queue.
   - `AWAITING_CALLBACK`: Live status checking with SLA watchdog.
   - `RANDOMNESS_VERIFIED`: RFC 9381 beacon validated.
   - `WINNER_SETTLED`: Wheel animated to predetermined winner and result recorded.
2. **Fallback & Latency Handling**:
   - If an RPC delay or Oracle latency occurs, a 4.5s watchdog informs the user and enables smooth fallback without freezing the interface.
   - Deterministic test harness emulates the official RFC 9381 interface rather than using unverified pseudorandomness.
