import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
  MAGICBLOCK_DELEGATION_PROGRAM_ID,
  MAGICBLOCK_UNDELEGATE_DISCRIMINATOR,
  MAGICBLOCK_ER_MAINNET_RPC,
  MAGICBLOCK_ROUTER_MAINNET_RPC,
  DEFAULT_EPHEMERAL_VALIDATOR,
  DEFAULT_EPHEMERAL_VRF_QUEUE,
  ephemeralRollupService,
} from '../src/services/ephemeralRollupService';
import { tableService } from '../src/services/tableService';
import { Table, EphemeralSession } from '../src/types';

export const PROGRAM_ID = new PublicKey('Ey54kdCeHW4PVT3cKDm2TKFmPrWWdqB2GysVSyiJpxHq');

describe('MagicBlock Ephemeral Rollups: Specification & Lifecycle Protocol Tests', () => {
  const hostKeypair = Keypair.generate();
  const diner1Keypair = Keypair.generate();
  const diner2Keypair = Keypair.generate();
  const unauthorizedKeypair = Keypair.generate();

  const tableId = 'table_er_test_101';

  test('1. Verified MagicBlock Delegation Program ID matches official deployment', () => {
    assert.strictEqual(
      MAGICBLOCK_DELEGATION_PROGRAM_ID.toBase58(),
      'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh',
      'Delegation Program ID must strictly match official MagicBlock deployment'
    );
  });

  test('2. Verified MagicBlock undelegation callback discriminator matches official macro', () => {
    const expected = new Uint8Array([196, 28, 41, 206, 48, 37, 51, 167]);
    assert.deepStrictEqual(
      Array.from(MAGICBLOCK_UNDELEGATE_DISCRIMINATOR),
      Array.from(expected),
      'Undelegation discriminator must match MagicBlock ephemeral macro specification'
    );
  });

  test('3. Magic Router and Ephemeral Rollup Mainnet endpoints are correctly configured', () => {
    assert.strictEqual(MAGICBLOCK_ROUTER_MAINNET_RPC, 'https://router.magicblock.app');
    assert.strictEqual(MAGICBLOCK_ER_MAINNET_RPC, 'https://mainnet.magicblock.app');
    assert.ok(DEFAULT_EPHEMERAL_VALIDATOR instanceof PublicKey);
    assert.ok(DEFAULT_EPHEMERAL_VRF_QUEUE instanceof PublicKey);
  });

  test('4. Delegation instruction builds with valid accounts: payer, delegatedAccount, ownerProgram, validator', () => {
    const [tablePDA] = ephemeralRollupService.getTablePDA(hostKeypair.publicKey, tableId);

    const ix = ephemeralRollupService.createDelegateInstruction({
      payer: hostKeypair.publicKey,
      delegatedAccount: tablePDA,
      ownerProgram: PROGRAM_ID,
      validator: DEFAULT_EPHEMERAL_VALIDATOR,
    });

    assert.strictEqual(ix.programId.toBase58(), MAGICBLOCK_DELEGATION_PROGRAM_ID.toBase58());
    assert.strictEqual(ix.keys.length, 4);
    assert.strictEqual(ix.keys[0].pubkey.toBase58(), tablePDA.toBase58());
    assert.strictEqual(ix.keys[0].isWritable, true);
    assert.strictEqual(ix.keys[1].pubkey.toBase58(), hostKeypair.publicKey.toBase58());
    assert.strictEqual(ix.keys[1].isSigner, true);
    assert.strictEqual(ix.keys[2].pubkey.toBase58(), PROGRAM_ID.toBase58());
    assert.strictEqual(ix.keys[3].pubkey.toBase58(), DEFAULT_EPHEMERAL_VALIDATOR.toBase58());
  });

  test('5. Undelegation instruction builds with valid discriminator and keys', () => {
    const [tablePDA] = ephemeralRollupService.getTablePDA(hostKeypair.publicKey, tableId);

    const ix = ephemeralRollupService.createUndelegateInstruction({
      payer: hostKeypair.publicKey,
      delegatedAccount: tablePDA,
      ownerProgram: PROGRAM_ID,
    });

    assert.strictEqual(ix.programId.toBase58(), MAGICBLOCK_DELEGATION_PROGRAM_ID.toBase58());
    assert.deepStrictEqual(Array.from(ix.data), Array.from(MAGICBLOCK_UNDELEGATE_DISCRIMINATOR));
    assert.strictEqual(ix.keys.length, 3);
  });

  test('6. Account Lifecycle: Initial Base -> Delegation -> Rollup Execution -> Commit -> Undelegation', async () => {
    const mockTable: Table = {
      id: tableId,
      name: 'Osteria Rollup',
      roomCode: 'ER9901',
      currency: 'SOL',
      gameMode: 'individual',
      status: 'OPEN',
      hostId: 'host_usr_1',
      hostName: 'Alice',
      hostWalletAddress: hostKeypair.publicKey.toBase58(),
      participants: [
        {
          id: 'host_usr_1',
          name: 'Alice',
          orderAmountCents: 2500,
          isHost: true,
          status: 'ACTIVE',
          joinedAt: Date.now(),
        },
        {
          id: 'diner_usr_2',
          name: 'Bob',
          orderAmountCents: 3000,
          isHost: false,
          status: 'ACTIVE',
          joinedAt: Date.now(),
        },
      ],
      sharedBillCents: 0,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Phase 1: Delegation
    const session = await ephemeralRollupService.delegateTable(mockTable, hostKeypair.publicKey);
    assert.strictEqual(session.isDelegated, true);
    assert.strictEqual(session.status, 'Session active');
    assert.strictEqual(session.phase, 'ROLLUP_EXECUTING');
    assert.strictEqual(session.isGasless, true, 'Transactions in ER must be gasless');
    assert.ok(session.latencyMs < 10, 'Rollup execution latency must be sub-10ms');

    const initialSlot = session.ephemeralSlot;

    // Phase 2: Rollup Execution (Ultra-fast diner order mutation)
    const { result, session: updatedSession } = await ephemeralRollupService.executeRollupOperation(
      tableId,
      'updateParticipantOrder',
      () => {
        mockTable.participants[1].orderAmountCents = 4200;
        return mockTable.participants[1].orderAmountCents;
      }
    );
    assert.strictEqual(result, 4200);
    assert.ok(updatedSession.ephemeralSlot > initialSlot);
    assert.strictEqual(updatedSession.status, 'Session active');

    // Phase 3: State Commitment (Sync to Base Layer)
    const syncedSession = await ephemeralRollupService.commitRollupState(tableId);
    assert.strictEqual(syncedSession.status, 'State synchronized');
    assert.ok(typeof syncedSession.lastL1SettlementSlot === 'number');

    // Phase 4: Undelegation (Return to Base Layer)
    const finalSession = await ephemeralRollupService.undelegateTable(tableId, hostKeypair.publicKey);
    assert.strictEqual(finalSession.isDelegated, false);
    assert.strictEqual(finalSession.phase, 'RETURNED_TO_BASE');
    assert.strictEqual(finalSession.isGasless, false, 'Base Mainnet layer uses standard gas');
  });

  test('7. VRF Compatibility: Delegated table is safely undelegated prior to Base Layer VRF settlement', async () => {
    const vrftableId = 'table_vrf_compat_202';
    const mockTable: Table = {
      id: vrftableId,
      name: 'Bistro VRF',
      roomCode: 'VRF888',
      currency: 'SOL',
      gameMode: 'individual',
      status: 'OPEN',
      hostId: 'host_usr_1',
      hostName: 'Alice',
      hostWalletAddress: hostKeypair.publicKey.toBase58(),
      participants: [
        { id: 'host_usr_1', name: 'Alice', orderAmountCents: 2000, isHost: true, status: 'ACTIVE', joinedAt: Date.now() },
        { id: 'diner_usr_2', name: 'Bob', orderAmountCents: 3000, isHost: false, status: 'ACTIVE', joinedAt: Date.now() },
      ],
      sharedBillCents: 0,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Delegate to ER
    await ephemeralRollupService.delegateTable(mockTable, hostKeypair.publicKey);
    assert.strictEqual(ephemeralRollupService.getSession(vrftableId)?.isDelegated, true);

    // Call VRF safety check
    const vrfEnvironment = await ephemeralRollupService.ensureSafeVrfEnvironment(vrftableId);
    assert.strictEqual(vrfEnvironment.mode, 'BASE_MAINNET_L1');

    // Ensure session is cleanly returned to base layer to prevent any state desync during VRF callback
    const postSession = ephemeralRollupService.getSession(vrftableId);
    assert.strictEqual(postSession?.isDelegated, false);
    assert.strictEqual(postSession?.phase, 'RETURNED_TO_BASE');
  });

  test('8. Rejects delegation if table is not in OPEN status', async () => {
    const lockedTable: Table = {
      id: 'table_locked_err',
      name: 'Locked Bistro',
      roomCode: 'LCK111',
      currency: 'SOL',
      gameMode: 'individual',
      status: 'LOCKED',
      hostId: 'host_1',
      hostName: 'Host',
      participants: [],
      sharedBillCents: 0,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await assert.rejects(
      async () => {
        await ephemeralRollupService.delegateTable(lockedTable);
      },
      /Cannot delegate table in LOCKED status/
    );
  });

  test('9. Rollup health check validates reachability and latency', async () => {
    const health = await ephemeralRollupService.getRollupHealth();
    assert.strictEqual(health.isHealthy, true);
    assert.strictEqual(health.activeEndpoint, MAGICBLOCK_ROUTER_MAINNET_RPC);
    assert.ok(health.latencyMs >= 0);
  });

  test('10. Error Recovery: Gracefully sets Operation failed status upon transaction failure', async () => {
    const failTableId = 'table_fail_recovery_303';
    const mockTable: Table = {
      id: failTableId,
      name: 'Fail Recovery Bistro',
      roomCode: 'FLR303',
      currency: 'SOL',
      gameMode: 'individual',
      status: 'OPEN',
      hostId: 'host_1',
      hostName: 'Host',
      participants: [],
      sharedBillCents: 0,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await ephemeralRollupService.delegateTable(mockTable);

    await assert.rejects(
      async () => {
        await ephemeralRollupService.executeRollupOperation(failTableId, 'failingOp', async () => {
          throw new Error('Simulated network drop on rollup RPC');
        });
      },
      /Simulated network drop on rollup RPC/
    );

    const session = ephemeralRollupService.getSession(failTableId);
    assert.strictEqual(session?.status, 'Operation failed');
    assert.strictEqual(session?.error, 'Simulated network drop on rollup RPC');
  });
});
