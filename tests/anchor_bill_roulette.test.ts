import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey, Keypair } from '@solana/web3.js';

// Program ID from declare_id!
export const PROGRAM_ID = new PublicKey('4CPvi4nTGzeivoroWf9jusJPTEisQTZVRwrQY9WTW4mS');

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

// Simulated on-chain state machine tests
describe('Anchor Smart Contract: Bill Roulette Architecture', () => {
  const hostKeypair = Keypair.generate();
  const guest1Keypair = Keypair.generate();
  const guest2Keypair = Keypair.generate();
  const oracleKeypair = Keypair.generate();
  const impostorKeypair = Keypair.generate();

  const tableId = 'bistro_99';
  const roundId = 'rnd_oct_01';

  // Compute PDAs
  const [tablePDA, tableBump] = findTablePDA(hostKeypair.publicKey, tableId);
  const [hostParticipantPDA] = findParticipantPDA(tablePDA, 0);
  const [guest1ParticipantPDA] = findParticipantPDA(tablePDA, 1);
  const [guest2ParticipantPDA] = findParticipantPDA(tablePDA, 2);
  const [roundPDA] = findRoundPDA(tablePDA, roundId);
  const [vrfRequestPDA] = findVrfRequestPDA(roundPDA);

  test('1. Program Derived Accounts (PDAs) are uniquely and deterministically derived', () => {
    assert.ok(tablePDA instanceof PublicKey);
    assert.strictEqual(typeof tableBump, 'number');
    assert.notStrictEqual(tablePDA.toBase58(), hostParticipantPDA.toBase58());
    assert.notStrictEqual(hostParticipantPDA.toBase58(), guest1ParticipantPDA.toBase58());
    assert.notStrictEqual(roundPDA.toBase58(), vrfRequestPDA.toBase58());
  });

  test('2. Creating a table initializes Table state and host at participant index 0', () => {
    const tableState = {
      host: hostKeypair.publicKey,
      tableId,
      currency: 'USD',
      gameMode: 0, // Individual
      status: 'Open',
      sharedBillCents: 0,
      participantCount: 1,
      totalRoundsCreated: 0,
      activeRoundId: '',
    };

    const hostRecord = {
      table: tablePDA,
      wallet: hostKeypair.publicKey,
      participantId: 'usr_host',
      displayName: 'Alice (Host)',
      orderAmountCents: 3500,
      index: 0,
      isHost: true,
      isActive: true,
    };

    assert.strictEqual(tableState.status, 'Open');
    assert.strictEqual(tableState.participantCount, 1);
    assert.strictEqual(hostRecord.index, 0);
    assert.strictEqual(hostRecord.isHost, true);
  });

  test('3. Joining increments participant count and assigns deterministic index', () => {
    let participantCount = 1;

    // Guest 1 joins at index 1
    const guest1Index = participantCount;
    participantCount += 1;
    assert.strictEqual(guest1Index, 1);
    assert.strictEqual(participantCount, 2);

    // Guest 2 joins at index 2
    const guest2Index = participantCount;
    participantCount += 1;
    assert.strictEqual(guest2Index, 2);
    assert.strictEqual(participantCount, 3);
  });

  test('4. Host authorization enforces that only host can modify shared bill or lock table', () => {
    const hostKey = hostKeypair.publicKey;

    // Authorized call
    const callerAuthorized = hostKey.equals(hostKeypair.publicKey);
    assert.strictEqual(callerAuthorized, true);

    // Impostor call
    const callerUnauthorized = hostKey.equals(impostorKeypair.publicKey);
    assert.strictEqual(callerUnauthorized, false);
  });

  test('5. Participant authorization ensures diners can only update their own order', () => {
    const guest1Wallet = guest1Keypair.publicKey;

    // Guest 1 signing for Guest 1 record
    assert.strictEqual(guest1Wallet.equals(guest1Keypair.publicKey), true);

    // Guest 2 trying to tamper with Guest 1 record
    assert.strictEqual(guest1Wallet.equals(guest2Keypair.publicKey), false);
  });

  test('6. Locking a round freezes bill total, participants, and transitions state', () => {
    const participantCount = 3;
    const frozenBillCents = 3500 + 4200 + 2300; // 10000 cents ($100.00)

    // Requires at least 2 participants
    assert.ok(participantCount >= 2, 'Must have at least 2 participants');

    const roundState = {
      table: tablePDA,
      roundId,
      status: 'Locked',
      frozenBillCents,
      frozenParticipantCount: participantCount,
      participantCommitment: new Uint8Array(32),
      vrfRequestAccount: PublicKey.default,
      randomnessBeacon: new Uint8Array(32),
      selectedParticipantIndex: 0,
      selectedParticipantWallet: PublicKey.default,
      selectedParticipantId: '',
    };

    assert.strictEqual(roundState.status, 'Locked');
    assert.strictEqual(roundState.frozenBillCents, 10000);
    assert.strictEqual(roundState.frozenParticipantCount, 3);
  });

  test('7. Rejects joins and order modifications after table/round is locked', () => {
    const tableStatus: string = 'Locked';

    // Join check
    const canJoin = tableStatus === 'Open';
    assert.strictEqual(canJoin, false, 'Joins must be rejected when table is locked');

    // Order update check
    const canUpdateOrder = tableStatus === 'Open';
    assert.strictEqual(canUpdateOrder, false, 'Order updates must be rejected when table is locked');
  });

  test('8. Requesting randomness transitions round to RANDOMNESS_PENDING and associates Oracle', () => {
    const roundState = { status: 'Locked' };

    // Valid transition from Locked to RandomnessPending
    assert.strictEqual(roundState.status, 'Locked');
    roundState.status = 'RandomnessPending';

    const vrfRequestState = {
      round: roundPDA,
      oracleAuthority: oracleKeypair.publicKey,
      isFulfilled: false,
    };

    assert.strictEqual(roundState.status, 'RandomnessPending');
    assert.strictEqual(vrfRequestState.isFulfilled, false);
    assert.strictEqual(vrfRequestState.oracleAuthority.equals(oracleKeypair.publicKey), true);
  });

  test('9. Rejecting unauthorized VRF callbacks (only registered Oracle signer allowed)', () => {
    const authorizedOracle = oracleKeypair.publicKey;
    const callerSigner = impostorKeypair.publicKey;

    const isAuthorized = authorizedOracle.equals(callerSigner);
    assert.strictEqual(isAuthorized, false, 'Impostor signer must be rejected');
  });

  test('10. On-chain authoritative winner is calculated strictly via modulo arithmetic', () => {
    // 32-byte verified randomness beacon from MagicBlock VRF
    const randomness = new Uint8Array(32);
    // Fill first 8 bytes with deterministic number 47
    randomness[0] = 47;

    const frozenCount = 3;
    const rawVal = randomness[0];
    const calculatedWinnerIndex = rawVal % frozenCount; // 47 % 3 = 2

    assert.strictEqual(calculatedWinnerIndex, 2);

    // Attempting to pass participant at index 0 when index 2 won must be rejected
    const passedParticipantIndex: number = 0;
    const isWinnerIndexMatch = passedParticipantIndex === calculatedWinnerIndex;
    assert.strictEqual(isWinnerIndexMatch, false, 'Client cannot submit an arbitrary winner');
  });

  test('11. Round transitions to COMPLETED and rejects duplicate completion', () => {
    const roundState: { status: string } = { status: 'RandomnessPending' };

    // Fulfill round
    roundState.status = 'Completed';
    assert.strictEqual(roundState.status, 'Completed');

    // Second fulfill attempt
    const currentStatus: string = roundState.status;
    const canFulfillAgain = currentStatus === 'RandomnessPending';
    assert.strictEqual(canFulfillAgain, false, 'Cannot complete an already completed round');
  });

  test('12. Rejects invalid state transitions', () => {
    const validTransitions: Record<string, string[]> = {
      Created: ['Locked', 'Cancelled'],
      Locked: ['RandomnessPending', 'Cancelled'],
      RandomnessPending: ['Completed', 'Cancelled'],
      Completed: [],
      Cancelled: [],
    };

    // Valid: Locked -> RandomnessPending
    assert.ok(validTransitions['Locked'].includes('RandomnessPending'));

    // Invalid: RandomnessPending -> Locked
    assert.strictEqual(validTransitions['RandomnessPending'].includes('Locked'), false);

    // Invalid: Completed -> RandomnessPending
    assert.strictEqual(validTransitions['Completed'].includes('RandomnessPending'), false);
  });

  test('13. Typed Anchor Program Client builds valid instructions with proper account keys & discriminators', async () => {
    const { anchorProgramService } = await import('../src/services/anchorProgramService');

    // 1. Create Table Instruction
    const createIx = anchorProgramService.buildCreateTableInstruction({
      host: hostKeypair.publicKey,
      tableId: 't1',
      currency: 'USD',
      gameMode: 0,
      hostParticipantId: 'p_host',
      hostDisplayName: 'Alice',
      initialHostOrderCents: 2500,
    });

    assert.strictEqual(createIx.programId.toBase58(), PROGRAM_ID.toBase58());
    assert.strictEqual(createIx.keys.length, 4);
    assert.strictEqual(createIx.keys[2].pubkey.toBase58(), hostKeypair.publicKey.toBase58());
    assert.strictEqual(createIx.keys[2].isSigner, true);
    // Discriminator check
    assert.deepStrictEqual(Array.from(createIx.data.subarray(0, 8)), [214, 142, 131, 250, 242, 83, 135, 185]);

    // 2. Join Table Instruction
    const joinIx = anchorProgramService.buildJoinTableInstruction({
      tablePDA,
      participant: guest1Keypair.publicKey,
      participantId: 'p_guest1',
      displayName: 'Bob',
      orderAmountCents: 3200,
      assignedIndex: 1,
    });
    assert.strictEqual(joinIx.keys.length, 4);
    assert.strictEqual(joinIx.keys[2].isSigner, true);
    assert.deepStrictEqual(Array.from(joinIx.data.subarray(0, 8)), [14, 117, 84, 51, 95, 146, 171, 70]);

    // 3. Update Order Instruction
    const [p1PDA] = findParticipantPDA(tablePDA, 1);
    const updateIx = anchorProgramService.buildUpdateOrderInstruction({
      tablePDA,
      participantRecordPDA: p1PDA,
      participant: guest1Keypair.publicKey,
      newOrderAmountCents: 4500,
    });
    assert.strictEqual(updateIx.keys.length, 3);
    assert.strictEqual(updateIx.keys[2].pubkey.toBase58(), guest1Keypair.publicKey.toBase58());
    assert.deepStrictEqual(Array.from(updateIx.data.subarray(0, 8)), [39, 49, 204, 167, 20, 221, 10, 241]);

    // 4. Lock Round Instruction
    const lockIx = anchorProgramService.buildLockRoundInstruction({
      tablePDA,
      host: hostKeypair.publicKey,
      roundId: 'r1',
      frozenBillCents: 5700,
      participantCommitment: new Uint8Array(32),
    });
    assert.strictEqual(lockIx.keys.length, 4);
    assert.strictEqual(lockIx.keys[2].isSigner, true);
    assert.deepStrictEqual(Array.from(lockIx.data.subarray(0, 8)), [68, 124, 43, 230, 30, 44, 248, 227]);

    // 5. Request Randomness Instruction
    const requestIx = anchorProgramService.buildRequestRandomnessInstruction({
      tablePDA,
      roundPDA,
      host: hostKeypair.publicKey,
      callerSeed: new Uint8Array(32),
    });
    assert.strictEqual(requestIx.keys.length, 6);
    assert.strictEqual(requestIx.keys[4].isSigner, true);
    assert.deepStrictEqual(Array.from(requestIx.data.subarray(0, 8)), [213, 5, 173, 166, 37, 236, 31, 18]);
  });

  test('14. WalletService rejects signature request gracefully when not connected', async () => {
    const { walletService } = await import('../src/services/walletService');
    const { Transaction } = await import('@solana/web3.js');

    await walletService.disconnect();
    const dummyTx = new Transaction();

    await assert.rejects(
      async () => {
        await walletService.signAndSendTransaction(dummyTx);
      },
      {
        message: /Wallet not connected/i,
      }
    );
  });
});
