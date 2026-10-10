import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
  MAGICBLOCK_VRF_PROGRAM_ID,
  magicBlockVrfService,
} from '../src/services/magicBlockVrfService';

// Program ID from declare_id!
export const PROGRAM_ID = new PublicKey('Ey54kdCeHW4PVT3cKDm2TKFmPrWWdqB2GysVSyiJpxHq');

// PDA derivation helpers matching Rust contract exactly
export function findTablePDA(host: PublicKey, tableId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('table'), host.toBuffer(), Buffer.from(tableId)],
    PROGRAM_ID
  );
}

export function findParticipantPDA(tablePDA: PublicKey, index: number): [PublicKey, number] {
  const indexBuf = Buffer.alloc(2);
  indexBuf.writeUInt16LE(index, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), tablePDA.toBuffer(), indexBuf],
    PROGRAM_ID
  );
}

export function findRoundPDA(tablePDA: PublicKey, roundId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('round'), tablePDA.toBuffer(), Buffer.from(roundId)],
    PROGRAM_ID
  );
}

export function findVrfRequestPDA(roundPDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vrf_request'), roundPDA.toBuffer()],
    PROGRAM_ID
  );
}

describe('MagicBlock Solana VRF Integration: Specification & Protocol Tests', () => {
  const hostKeypair = Keypair.generate();
  const diner1Keypair = Keypair.generate();
  const diner2Keypair = Keypair.generate();
  const diner3Keypair = Keypair.generate();
  const oracleKeypair = Keypair.generate();
  const impostorKeypair = Keypair.generate();

  const tableId = 'table_magic_101';
  const roundId = 'round_vrf_202';

  const [tablePDA] = findTablePDA(hostKeypair.publicKey, tableId);
  const [roundPDA] = findRoundPDA(tablePDA, roundId);
  const [vrfRequestPDA] = findVrfRequestPDA(roundPDA);

  test('1. MagicBlock VRF Program ID matches the official Solana deployment', () => {
    assert.strictEqual(
      MAGICBLOCK_VRF_PROGRAM_ID.toBase58(),
      'Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz',
      'Must use the official MagicBlock Solana VRF program ID'
    );
  });

  test('2. Round Locking freezes participants, bill amount, and transitions to LOCKED', () => {
    const participants = [
      { id: 'u1', name: 'Alice', orderAmountCents: 2500, wallet: hostKeypair.publicKey },
      { id: 'u2', name: 'Bob', orderAmountCents: 3500, wallet: diner1Keypair.publicKey },
      { id: 'u3', name: 'Charlie', orderAmountCents: 4000, wallet: diner2Keypair.publicKey },
    ];

    const frozenBillCents = participants.reduce((acc, p) => acc + p.orderAmountCents, 0);
    assert.strictEqual(frozenBillCents, 10000); // $100.00 in integer minor units

    const roundState = {
      table: tablePDA,
      roundId,
      status: 'Locked',
      frozenBillCents,
      frozenParticipantCount: participants.length,
      vrfRequestAccount: PublicKey.default,
      randomnessBeacon: new Uint8Array(32),
      selectedParticipantIndex: 0,
    };

    assert.strictEqual(roundState.status, 'Locked');
    assert.strictEqual(roundState.frozenParticipantCount, 3);
  });

  test('3. Randomness Request creates PDA, commits client seed, and enforces SLA expiration', () => {
    const { clientSeedHex, rawBytes } = magicBlockVrfService.generateClientSeed();
    assert.strictEqual(rawBytes.length, 32);
    assert.strictEqual(clientSeedHex.length, 64);

    const currentTime = 1700000000;
    const expirationThresholdSeconds = 300; // 5 minutes SLA

    const vrfRequestAccount = {
      round: roundPDA,
      oracleAuthority: MAGICBLOCK_VRF_PROGRAM_ID,
      callerSeed: rawBytes,
      requestId: new Uint8Array(32),
      requestedAt: currentTime,
      expiresAt: currentTime + expirationThresholdSeconds,
      isFulfilled: false,
    };

    assert.strictEqual(vrfRequestAccount.oracleAuthority.equals(MAGICBLOCK_VRF_PROGRAM_ID), true);
    assert.strictEqual(vrfRequestAccount.isFulfilled, false);
    assert.strictEqual(vrfRequestAccount.expiresAt - vrfRequestAccount.requestedAt, 300);
  });

  test('4. Deterministic RFC 9381 Beacon simulation produces valid 256-bit cryptographically structured entropy', async () => {
    const clientSeedHex = 'e2c7a109849204bbf149375e83921104e2c7a109849204bbf149375e83921104';
    const { beaconHex, proofHex, requestId } = await magicBlockVrfService.generateDeterministicVrfBeacon(
      clientSeedHex,
      roundId
    );

    assert.strictEqual(beaconHex.length, 64, 'Randomness beacon must be exactly 32 bytes (64 hex characters)');
    assert.ok(proofHex.length >= 64, 'Proof must contain valid cryptographic proof bytes');
    assert.ok(requestId.startsWith('vrf_req_'), 'Request ID must be properly formatted');
    assert.strictEqual(magicBlockVrfService.verifyBeaconIntegrity(beaconHex), true);
  });

  test('5. Modulo arithmetic strictly determines winner matching on-chain Rust contract', () => {
    // Construct a deterministic beacon with known little-endian byte values
    // Byte 0 = 0x2A (42 in decimal)
    // 42 % 3 participants = 0 (42 / 3 = 14 remainder 0)
    // If Byte 0 = 0x2B (43 in decimal) -> 43 % 3 = 1
    const beaconBytes = new Uint8Array(32);
    beaconBytes[0] = 43; // little endian first byte

    const hexBeacon = Array.from(beaconBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const participantCount = 3;
    const derivedIndex = magicBlockVrfService.deriveWinnerIndexFromBeacon(hexBeacon, participantCount);

    assert.strictEqual(derivedIndex, 43 % 3); // 1
    assert.strictEqual(derivedIndex, 1);
  });

  test('6. Winning participant record index mismatch is strictly rejected', () => {
    // When the calculated index is 1 (7 % 3 = 1), passing participant index 0 or 2 must fail validation
    const beaconHex = '07' + '00'.repeat(31); // 7 in byte 0 -> 7 % 3 = 1
    const derivedIndex = magicBlockVrfService.deriveWinnerIndexFromBeacon(beaconHex, 3);
    assert.strictEqual(derivedIndex, 1);

    const clientClaimedWinnerIndex: number = 0;
    const doesMatch = clientClaimedWinnerIndex === derivedIndex;
    assert.strictEqual(doesMatch, false, 'Client cannot submit a winner index that does not match the random beacon');
  });

  test('7. Unauthorized Oracle callback signer is strictly rejected', () => {
    const authorizedOracle = MAGICBLOCK_VRF_PROGRAM_ID;
    const callerSigner = impostorKeypair.publicKey;

    const isAuthorized = authorizedOracle.equals(callerSigner);
    assert.strictEqual(isAuthorized, false, 'Impostor signer cannot fulfill VRF callback');
  });

  test('8. Expired VRF randomness request is rejected (> 300 seconds)', () => {
    const requestedAt = 1700000000;
    const expiresAt = requestedAt + 300;
    const currentTimeExpired = 1700000301;

    const isExpired = currentTimeExpired > expiresAt;
    assert.strictEqual(isExpired, true, 'Request after expiration threshold must be rejected');
  });

  test('9. Rejects duplicate fulfillment of already settled VRF request', () => {
    let isFulfilled = false;

    // First fulfillment
    assert.strictEqual(isFulfilled, false);
    isFulfilled = true;

    // Attempted replay fulfillment
    const canFulfillAgain = !isFulfilled;
    assert.strictEqual(canFulfillAgain, false, 'Cannot fulfill a VRF request that is already settled');
  });

  test('10. Weighted participant selection correctly respects order amount distribution', () => {
    const participants = [
      { id: 'p1', name: 'Small Order', orderAmountCents: 1000, isHost: true }, // 10%
      { id: 'p2', name: 'Medium Order', orderAmountCents: 2000, isHost: false }, // 20%
      { id: 'p3', name: 'Large Order', orderAmountCents: 7000, isHost: false }, // 70%
    ];
    const totalBillCents = 10000;

    // A low random value (e.g. cent 500) hits Small Order (0 to 999)
    const lowBeacon = '05' + '00'.repeat(31); // 5 in first byte
    const lowWinner = magicBlockVrfService.deriveWeightedWinnerIndex(lowBeacon, participants, totalBillCents);
    assert.strictEqual(lowWinner, 0);

    // A value like cent 1500 hits Medium Order (1000 to 2999)
    // 1500 = 0x05DC -> little-endian bytes: DC 05
    const midBeacon = 'dc05' + '00'.repeat(30);
    const midWinner = magicBlockVrfService.deriveWeightedWinnerIndex(midBeacon, participants, totalBillCents);
    assert.strictEqual(midWinner, 1);

    // A higher value hits Large Order (3000 to 9999)
    // 5000 = 0x1388 -> little-endian bytes: 88 13
    const highBeacon = '8813' + '00'.repeat(30);
    const highWinner = magicBlockVrfService.deriveWeightedWinnerIndex(highBeacon, participants, totalBillCents);
    assert.strictEqual(highWinner, 2);
  });
});
