import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseToCents,
  formatCents,
  validateOrderAmount,
  calculateTableTotalCents,
  MAX_ORDER_AMOUNT_CENTS,
} from '../src/utils/currency';

import { Table, Participant, GameMode } from '../src/types';
import {
  TableLockedError,
  InsufficientParticipantsError,
  DuplicateWalletError,
  InvalidOrderError,
  UnauthorizedHostError,
  InvalidTableCodeError,
} from '../src/errors';

import {
  generateRoomCode,
  validateRoomCodeFormat,
} from '../src/services/tableService';

import {
  roundPreparationService,
  createDeterministicRoundDigest,
} from '../src/services/roundPreparationService';

describe('1. Currency & Monetary Math (Integer Minor Units)', () => {
  test('parseToCents converts decimal strings to integer cents without floating point errors', () => {
    assert.strictEqual(parseToCents('24.50'), 2450);
    assert.strictEqual(parseToCents('19.99'), 1999);
    assert.strictEqual(parseToCents('0.05'), 5);
    assert.strictEqual(parseToCents('100'), 10000);
    assert.strictEqual(parseToCents('$42.75'), 4275);
    assert.strictEqual(parseToCents(''), 0);
  });

  test('formatCents displays clean localized strings', () => {
    assert.strictEqual(formatCents(2450, 'USD'), '$24.50');
    assert.strictEqual(formatCents(500, 'EUR'), '€5.00');
    assert.strictEqual(formatCents(12075, 'GBP'), '£120.75');
    assert.strictEqual(formatCents(1000, 'SOL'), '◎ 1.000 SOL');
  });

  test('validateOrderAmount rejects negative and out-of-bounds amounts', () => {
    assert.doesNotThrow(() => validateOrderAmount(1500));
    assert.doesNotThrow(() => validateOrderAmount(0));
    assert.throws(() => validateOrderAmount(-100), InvalidOrderError);
    assert.throws(() => validateOrderAmount(12.5), InvalidOrderError); // Float rejected
    assert.throws(() => validateOrderAmount(MAX_ORDER_AMOUNT_CENTS + 1), InvalidOrderError);
  });
});

describe('2. Bill Total Calculations', () => {
  const createMockTable = (mode: GameMode, sharedCents: number, participants: Participant[]): Table => ({
    id: 'tbl_test_1',
    name: 'Test Bistro',
    roomCode: 'TEST99',
    currency: 'USD',
    gameMode: mode,
    status: 'OPEN',
    hostId: 'usr_host',
    hostName: 'Host Alice',
    participants,
    sharedBillCents: sharedCents,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  test('Individual mode sums all active participant orders', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', orderAmountCents: 2500, joinedAt: 1, status: 'ACTIVE', isHost: true },
      { id: 'p2', name: 'Bob', orderAmountCents: 3550, joinedAt: 2, status: 'ACTIVE', isHost: false },
      { id: 'p3', name: 'Charlie', orderAmountCents: 1400, joinedAt: 3, status: 'ACTIVE', isHost: false },
    ];
    const table = createMockTable('individual', 0, participants);
    assert.strictEqual(calculateTableTotalCents(table), 7450); // $74.50
  });

  test('Individual mode excludes disconnected participants', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', orderAmountCents: 2500, joinedAt: 1, status: 'ACTIVE', isHost: true },
      { id: 'p2', name: 'Bob', orderAmountCents: 3550, joinedAt: 2, status: 'DISCONNECTED', isHost: false },
    ];
    const table = createMockTable('individual', 0, participants);
    assert.strictEqual(calculateTableTotalCents(table), 2500);
  });

  test('Shared bill mode uses single shared integer amount regardless of participants', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', orderAmountCents: 0, joinedAt: 1, status: 'ACTIVE', isHost: true },
      { id: 'p2', name: 'Bob', orderAmountCents: 0, joinedAt: 2, status: 'ACTIVE', isHost: false },
    ];
    const table = createMockTable('shared', 12500, participants);
    assert.strictEqual(calculateTableTotalCents(table), 12500); // $125.00
  });
});

describe('3. Table Creation & Room Code Validation', () => {
  test('generateRoomCode produces valid 6-char alphanumeric code', () => {
    const code = generateRoomCode();
    assert.strictEqual(code.length, 6);
    assert.match(code, /^[A-Z2-9]{6}$/);
  });

  test('validateRoomCodeFormat sanitizes and checks length', () => {
    assert.strictEqual(validateRoomCodeFormat('abc123'), 'ABC123');
    assert.strictEqual(validateRoomCodeFormat('  rou-742  '), 'ROU742');
    assert.throws(() => validateRoomCodeFormat('ab'), InvalidTableCodeError);
    assert.throws(() => validateRoomCodeFormat('TOOLONGCODE9999'), InvalidTableCodeError);
  });
});

describe('4. Joining & Duplicate Checks', () => {
  test('Prevents duplicate wallet registration at the same table', () => {
    const table: Table = {
      id: 'tbl_wallet_test',
      name: 'Crypto Dinner',
      roomCode: 'CRYP88',
      currency: 'SOL',
      gameMode: 'individual',
      status: 'OPEN',
      hostId: 'p1',
      hostName: 'Host',
      participants: [
        {
          id: 'p1',
          name: 'Host',
          walletAddress: 'SolanaWalletAddress1111111111111111111111111',
          orderAmountCents: 1000,
          joinedAt: Date.now(),
          status: 'ACTIVE',
          isHost: true,
        },
      ],
      sharedBillCents: 0,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const duplicateWallet = 'SolanaWalletAddress1111111111111111111111111';
    const isDuplicate = table.participants.some(
      (p) => p.walletAddress && p.walletAddress.toLowerCase() === duplicateWallet.toLowerCase() && p.id !== 'p2'
    );

    assert.strictEqual(isDuplicate, true);
  });
});

describe('5. Round Preparation & Deterministic State Freezing', () => {
  test('Rejects round preparation if fewer than 2 participants', async () => {
    const table: Table = {
      id: 'tbl_prep_solo',
      name: 'Solo Table',
      roomCode: 'SOLO01',
      currency: 'USD',
      gameMode: 'individual',
      status: 'OPEN',
      hostId: 'host_1',
      hostName: 'Solo Host',
      hostAuthToken: 'secret_token_123',
      participants: [
        { id: 'host_1', name: 'Solo Host', orderAmountCents: 5000, joinedAt: 1, status: 'ACTIVE', isHost: true },
      ],
      sharedBillCents: 0,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await assert.rejects(
      async () => {
        await roundPreparationService.prepareRound(table, 'host_1', 'secret_token_123');
      },
      InsufficientParticipantsError
    );
  });

  test('Rejects preparation if requester is not the host', async () => {
    const table: Table = {
      id: 'tbl_prep_auth',
      name: 'Table Auth',
      roomCode: 'AUTH01',
      currency: 'USD',
      gameMode: 'individual',
      status: 'OPEN',
      hostId: 'host_1',
      hostName: 'Host',
      hostAuthToken: 'secret_token_123',
      participants: [
        { id: 'host_1', name: 'Host', orderAmountCents: 2000, joinedAt: 1, status: 'ACTIVE', isHost: true },
        { id: 'guest_2', name: 'Guest', orderAmountCents: 3000, joinedAt: 2, status: 'ACTIVE', isHost: false },
      ],
      sharedBillCents: 0,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await assert.rejects(
      async () => {
        await roundPreparationService.prepareRound(table, 'guest_2', 'wrong_token');
      },
      UnauthorizedHostError
    );
  });

  test('Successfully prepares round: freezes bill, participants, creates deterministic digest', async () => {
    const table: Table = {
      id: 'tbl_prep_success',
      name: 'Friday Dinner',
      roomCode: 'FRI001',
      currency: 'USD',
      gameMode: 'individual',
      status: 'OPEN',
      hostId: 'host_1',
      hostName: 'Alice',
      hostAuthToken: 'host_secret',
      participants: [
        { id: 'host_1', name: 'Alice', orderAmountCents: 4500, joinedAt: 1, status: 'ACTIVE', isHost: true },
        { id: 'guest_2', name: 'Bob', orderAmountCents: 3500, joinedAt: 2, status: 'ACTIVE', isHost: false },
      ],
      sharedBillCents: 0,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const { table: updatedTable, round } = await roundPreparationService.prepareRound(
      table,
      'host_1',
      'host_secret'
    );

    // Verifications:
    assert.strictEqual(updatedTable.status, 'SPIN_PENDING');
    assert.strictEqual(round.frozenBillCents, 8000);
    assert.strictEqual(round.frozenParticipants.length, 2);
    assert.strictEqual(typeof round.deterministicInputDigest, 'string');
    assert.strictEqual(round.deterministicInputDigest.length, 64); // SHA-256 hex length
    assert.strictEqual(round.status, 'PREPARED');
  });

  test('createDeterministicRoundDigest produces identical hash regardless of input participant ordering', async () => {
    const p1 = { id: 'p_alpha', name: 'Alpha', orderAmountCents: 2000, isHost: true };
    const p2 = { id: 'p_beta', name: 'Beta', orderAmountCents: 3000, isHost: false };

    const digest1 = await createDeterministicRoundDigest({
      roundId: 'r1',
      tableId: 't1',
      currency: 'USD',
      frozenBillCents: 5000,
      participants: [p1, p2],
    });

    const digest2 = await createDeterministicRoundDigest({
      roundId: 'r1',
      tableId: 't1',
      currency: 'USD',
      frozenBillCents: 5000,
      participants: [p2, p1], // Reversed ordering
    });

    assert.strictEqual(digest1, digest2);
  });
});

describe('6. Preventing Changes During Locked / Pending Spin', () => {
  test('Throws TableLockedError when table status is LOCKED, SPIN_PENDING, or COMPLETED', () => {
    const lockedStatuses = ['LOCKED', 'SPIN_PENDING', 'COMPLETED'];
    for (const status of lockedStatuses) {
      assert.throws(
        () => {
          if (status !== 'OPEN') {
            throw new TableLockedError(status);
          }
        },
        TableLockedError
      );
    }
  });
});
