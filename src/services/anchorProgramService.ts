import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';

/**
 * Anchor IDL & Program specifications for the Bill Roulette protocol.
 * Program Target: Solana Mainnet Beta
 */
export const BILL_ROULETTE_PROGRAM_ID = new PublicKey('4CPvi4nTGzeivoroWf9jusJPTEisQTZVRwrQY9WTW4mS');
export const MAGICBLOCK_VRF_PROGRAM_ID = new PublicKey('Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz');
export const MAGICBLOCK_DELEGATION_PROGRAM_ID = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh');
export const MAGICBLOCK_UNDELEGATE_DISCRIMINATOR = new Uint8Array([196, 28, 41, 206, 48, 37, 51, 167]);

export interface AnchorTableAccount {
  host: string;
  tableId: string;
  currency: string;
  gameMode: number; // 0 = Individual, 1 = Shared
  status: 'Open' | 'Locked' | 'SpinPending' | 'Completed' | 'Cancelled';
  sharedBillCents: number;
  participantCount: number;
  totalRoundsCreated: number;
  activeRoundId: string;
  bump: number;
}

export interface AnchorParticipantRecord {
  table: string;
  wallet: string;
  participantId: string;
  displayName: string;
  orderAmountCents: number;
  index: number;
  isHost: boolean;
  isActive: boolean;
  joinedAt: number;
  bump: number;
}

export interface AnchorRoundAccount {
  table: string;
  roundId: string;
  status: 'Created' | 'Locked' | 'RandomnessPending' | 'Completed' | 'Cancelled';
  frozenBillCents: number;
  frozenParticipantCount: number;
  participantCommitment: string;
  vrfRequestAccount: string;
  randomnessBeacon: string;
  selectedParticipantIndex: number;
  selectedParticipantWallet: string;
  selectedParticipantId: string;
  lockedAt: number;
  settledAt: number;
  bump: number;
}

/**
 * Comprehensive Anchor IDL specification for Bill Roulette
 */
export const BILL_ROULETTE_IDL = {
  version: '0.1.0',
  name: 'bill_roulette',
  instructions: [
    {
      name: 'createTable',
      accounts: [
        { name: 'table', isMut: true, isSigner: false },
        { name: 'hostParticipant', isMut: true, isSigner: false },
        { name: 'host', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'tableId', type: 'string' },
        { name: 'currency', type: 'string' },
        { name: 'gameMode', type: 'u8' },
        { name: 'hostParticipantId', type: 'string' },
        { name: 'hostDisplayName', type: 'string' },
        { name: 'initialHostOrder', type: 'u64' },
      ],
    },
    {
      name: 'joinTable',
      accounts: [
        { name: 'table', isMut: true, isSigner: false },
        { name: 'participantRecord', isMut: true, isSigner: false },
        { name: 'participant', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'participantId', type: 'string' },
        { name: 'displayName', type: 'string' },
        { name: 'orderAmountCents', type: 'u64' },
      ],
    },
    {
      name: 'updateParticipantOrder',
      accounts: [
        { name: 'table', isMut: false, isSigner: false },
        { name: 'participantRecord', isMut: true, isSigner: false },
        { name: 'participant', isMut: false, isSigner: true },
      ],
      args: [
        { name: 'newOrderAmountCents', type: 'u64' },
      ],
    },
    {
      name: 'updateSharedBill',
      accounts: [
        { name: 'table', isMut: true, isSigner: false },
        { name: 'host', isMut: false, isSigner: true },
      ],
      args: [
        { name: 'newSharedBillCents', type: 'u64' },
      ],
    },
    {
      name: 'lockRound',
      accounts: [
        { name: 'table', isMut: true, isSigner: false },
        { name: 'round', isMut: true, isSigner: false },
        { name: 'host', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'roundId', type: 'string' },
        { name: 'frozenBillCents', type: 'u64' },
        { name: 'participantCommitment', type: { array: ['u8', 32] } },
      ],
    },
    {
      name: 'requestRandomness',
      accounts: [
        { name: 'table', isMut: true, isSigner: false },
        { name: 'round', isMut: true, isSigner: false },
        { name: 'vrfRequest', isMut: true, isSigner: false },
        { name: 'oracleAuthority', isMut: false, isSigner: false },
        { name: 'host', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'callerSeed', type: { array: ['u8', 32] } },
      ],
    },
    {
      name: 'callbackFulfillRandomness',
      accounts: [
        { name: 'table', isMut: true, isSigner: false },
        { name: 'round', isMut: true, isSigner: false },
        { name: 'vrfRequest', isMut: true, isSigner: false },
        { name: 'winningParticipantRecord', isMut: false, isSigner: false },
        { name: 'oracleSigner', isMut: false, isSigner: true },
      ],
      args: [
        { name: 'randomnessBeacon', type: { array: ['u8', 32] } },
      ],
    },
    {
      name: 'cancelTable',
      accounts: [
        { name: 'table', isMut: true, isSigner: false },
        { name: 'host', isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      name: 'delegateTable',
      accounts: [
        { name: 'table', isMut: true, isSigner: false },
        { name: 'host', isMut: false, isSigner: true },
        { name: 'validator', isMut: false, isSigner: false },
        { name: 'delegationProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'undelegateTable',
      accounts: [
        { name: 'table', isMut: true, isSigner: false },
        { name: 'host', isMut: false, isSigner: true },
        { name: 'delegationProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'Table',
      type: {
        kind: 'struct',
        fields: [
          { name: 'host', type: 'publicKey' },
          { name: 'tableId', type: 'string' },
          { name: 'currency', type: 'string' },
          { name: 'gameMode', type: 'u8' },
          { name: 'status', type: { defined: 'TableStatus' } },
          { name: 'sharedBillCents', type: 'u64' },
          { name: 'participantCount', type: 'u16' },
          { name: 'totalRoundsCreated', type: 'u32' },
          { name: 'activeRoundId', type: 'string' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'ParticipantRecord',
      type: {
        kind: 'struct',
        fields: [
          { name: 'table', type: 'publicKey' },
          { name: 'wallet', type: 'publicKey' },
          { name: 'participantId', type: 'string' },
          { name: 'displayName', type: 'string' },
          { name: 'orderAmountCents', type: 'u64' },
          { name: 'index', type: 'u16' },
          { name: 'isHost', type: 'bool' },
          { name: 'isActive', type: 'bool' },
          { name: 'joinedAt', type: 'i64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'Round',
      type: {
        kind: 'struct',
        fields: [
          { name: 'table', type: 'publicKey' },
          { name: 'roundId', type: 'string' },
          { name: 'status', type: { defined: 'RoundStatus' } },
          { name: 'frozenBillCents', type: 'u64' },
          { name: 'frozenParticipantCount', type: 'u16' },
          { name: 'participantCommitment', type: { array: ['u8', 32] } },
          { name: 'vrfRequestAccount', type: 'publicKey' },
          { name: 'randomnessBeacon', type: { array: ['u8', 32] } },
          { name: 'selectedParticipantIndex', type: 'u16' },
          { name: 'selectedParticipantWallet', type: 'publicKey' },
          { name: 'selectedParticipantId', type: 'string' },
          { name: 'lockedAt', type: 'i64' },
          { name: 'settledAt', type: 'i64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'VrfRequestAssociation',
      type: {
        kind: 'struct',
        fields: [
          { name: 'round', type: 'publicKey' },
          { name: 'oracleAuthority', type: 'publicKey' },
          { name: 'callerSeed', type: { array: ['u8', 32] } },
          { name: 'requestId', type: { array: ['u8', 32] } },
          { name: 'requestedAt', type: 'i64' },
          { name: 'expiresAt', type: 'i64' },
          { name: 'isFulfilled', type: 'bool' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
  ],
};

class AnchorProgramService {
  /**
   * Status of on-chain deployment target on Solana Mainnet Beta
   * Program: 4CPvi4nTGzeivoroWf9jusJPTEisQTZVRwrQY9WTW4mS
   */
  public isProgramDeployedOnMainnet(): boolean {
    // Verified on-chain: Account is not found on Solana Mainnet Beta (Genesis: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d).
    // Blocker: Custom program must be deployed to Solana Mainnet Beta using Anchor/Solana CLI.
    return false;
  }

  public isProgramDeployedOnDevnet(): boolean {
    return false;
  }

  /**
   * Derive Table PDA: seeds = [b"table", host.key(), tableId.as_bytes()]
   */
  public findTablePDA(host: PublicKey, tableId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('table'), host.toBuffer(), Buffer.from(tableId)],
      BILL_ROULETTE_PROGRAM_ID
    );
  }

  /**
   * Derive ParticipantRecord PDA: seeds = [b"participant", table.key(), &index.to_le_bytes()]
   */
  public findParticipantPDA(tablePDA: PublicKey, index: number): [PublicKey, number] {
    const indexBuf = Buffer.alloc(2);
    indexBuf.writeUInt16LE(index, 0);
    return PublicKey.findProgramAddressSync(
      [Buffer.from('participant'), tablePDA.toBuffer(), indexBuf],
      BILL_ROULETTE_PROGRAM_ID
    );
  }

  /**
   * Derive Roulette Round PDA: seeds = [b"round", table.key(), roundId.as_bytes()]
   */
  public findRoundPDA(tablePDA: PublicKey, roundId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('round'), tablePDA.toBuffer(), Buffer.from(roundId)],
      BILL_ROULETTE_PROGRAM_ID
    );
  }

  /**
   * Derive VRF Request Association PDA: seeds = [b"vrf_request", round.key()]
   */
  public findVrfRequestPDA(roundPDA: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vrf_request'), roundPDA.toBuffer()],
      BILL_ROULETTE_PROGRAM_ID
    );
  }

  // Anchor 8-byte instruction discriminators (sha256("global:<name>")[0..8])
  private static readonly DISCRIMINATOR_CREATE_TABLE = Buffer.from([214, 142, 131, 250, 242, 83, 135, 185]);
  private static readonly DISCRIMINATOR_JOIN_TABLE = Buffer.from([14, 117, 84, 51, 95, 146, 171, 70]);
  private static readonly DISCRIMINATOR_UPDATE_ORDER = Buffer.from([39, 49, 204, 167, 20, 221, 10, 241]);
  private static readonly DISCRIMINATOR_LOCK_ROUND = Buffer.from([68, 124, 43, 230, 30, 44, 248, 227]);
  private static readonly DISCRIMINATOR_REQUEST_RANDOMNESS = Buffer.from([213, 5, 173, 166, 37, 236, 31, 18]);

  /**
   * Helper to encode strings as Borsh (4-byte LE length prefix + UTF-8 bytes)
   */
  private encodeBorshString(str: string): Buffer {
    const strBuf = Buffer.from(str, 'utf8');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32LE(strBuf.length, 0);
    return Buffer.concat([lenBuf, strBuf]);
  }

  /**
   * Helper to encode u64 integers as Borsh (8-byte LE)
   */
  private encodeBorshU64(value: number | bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(value), 0);
    return buf;
  }

  /**
   * 1. Build Create Table Transaction Instruction
   */
  public buildCreateTableInstruction(params: {
    host: PublicKey;
    tableId: string;
    currency: string;
    gameMode: number;
    hostParticipantId: string;
    hostDisplayName: string;
    initialHostOrderCents: number;
  }): import('@solana/web3.js').TransactionInstruction {
    const [tablePDA] = this.findTablePDA(params.host, params.tableId);
    const [hostParticipantPDA] = this.findParticipantPDA(tablePDA, 0);

    const data = Buffer.concat([
      AnchorProgramService.DISCRIMINATOR_CREATE_TABLE,
      this.encodeBorshString(params.tableId),
      this.encodeBorshString(params.currency),
      Buffer.from([params.gameMode]),
      this.encodeBorshString(params.hostParticipantId),
      this.encodeBorshString(params.hostDisplayName),
      this.encodeBorshU64(params.initialHostOrderCents),
    ]);

    return {
      programId: BILL_ROULETTE_PROGRAM_ID,
      keys: [
        { pubkey: tablePDA, isSigner: false, isWritable: true },
        { pubkey: hostParticipantPDA, isSigner: false, isWritable: true },
        { pubkey: params.host, isSigner: true, isWritable: true },
        { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      data,
    };
  }

  /**
   * 2. Build Join Table Transaction Instruction
   */
  public buildJoinTableInstruction(params: {
    tablePDA: PublicKey;
    participant: PublicKey;
    participantId: string;
    displayName: string;
    orderAmountCents: number;
    assignedIndex: number;
  }): import('@solana/web3.js').TransactionInstruction {
    const [participantRecordPDA] = this.findParticipantPDA(params.tablePDA, params.assignedIndex);

    const data = Buffer.concat([
      AnchorProgramService.DISCRIMINATOR_JOIN_TABLE,
      this.encodeBorshString(params.participantId),
      this.encodeBorshString(params.displayName),
      this.encodeBorshU64(params.orderAmountCents),
    ]);

    return {
      programId: BILL_ROULETTE_PROGRAM_ID,
      keys: [
        { pubkey: params.tablePDA, isSigner: false, isWritable: true },
        { pubkey: participantRecordPDA, isSigner: false, isWritable: true },
        { pubkey: params.participant, isSigner: true, isWritable: true },
        { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      data,
    };
  }

  /**
   * 3. Build Update Participant Order Transaction Instruction
   */
  public buildUpdateOrderInstruction(params: {
    tablePDA: PublicKey;
    participantRecordPDA: PublicKey;
    participant: PublicKey;
    newOrderAmountCents: number;
  }): import('@solana/web3.js').TransactionInstruction {
    const data = Buffer.concat([
      AnchorProgramService.DISCRIMINATOR_UPDATE_ORDER,
      this.encodeBorshU64(params.newOrderAmountCents),
    ]);

    return {
      programId: BILL_ROULETTE_PROGRAM_ID,
      keys: [
        { pubkey: params.tablePDA, isSigner: false, isWritable: false },
        { pubkey: params.participantRecordPDA, isSigner: false, isWritable: true },
        { pubkey: params.participant, isSigner: true, isWritable: false },
      ],
      data,
    };
  }

  /**
   * 4. Build Lock Round Transaction Instruction
   */
  public buildLockRoundInstruction(params: {
    tablePDA: PublicKey;
    host: PublicKey;
    roundId: string;
    frozenBillCents: number;
    participantCommitment: Uint8Array;
  }): import('@solana/web3.js').TransactionInstruction {
    const [roundPDA] = this.findRoundPDA(params.tablePDA, params.roundId);
    const commitmentBuf = Buffer.alloc(32);
    commitmentBuf.set(params.participantCommitment.subarray(0, 32));

    const data = Buffer.concat([
      AnchorProgramService.DISCRIMINATOR_LOCK_ROUND,
      this.encodeBorshString(params.roundId),
      this.encodeBorshU64(params.frozenBillCents),
      commitmentBuf,
    ]);

    return {
      programId: BILL_ROULETTE_PROGRAM_ID,
      keys: [
        { pubkey: params.tablePDA, isSigner: false, isWritable: true },
        { pubkey: roundPDA, isSigner: false, isWritable: true },
        { pubkey: params.host, isSigner: true, isWritable: true },
        { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      data,
    };
  }

  /**
   * 5. Build Request Randomness (VRF) Instruction
   */
  public buildRequestRandomnessInstruction(params: {
    tablePDA: PublicKey;
    roundPDA: PublicKey;
    host: PublicKey;
    callerSeed: Uint8Array;
    oracleAuthority?: PublicKey;
  }): import('@solana/web3.js').TransactionInstruction {
    const [vrfRequestPDA] = this.findVrfRequestPDA(params.roundPDA);
    const oracleAuth = params.oracleAuthority || MAGICBLOCK_VRF_PROGRAM_ID;

    const seedBuf = Buffer.alloc(32);
    seedBuf.set(params.callerSeed.subarray(0, 32));

    const data = Buffer.concat([
      AnchorProgramService.DISCRIMINATOR_REQUEST_RANDOMNESS,
      seedBuf,
    ]);

    return {
      programId: BILL_ROULETTE_PROGRAM_ID,
      keys: [
        { pubkey: params.tablePDA, isSigner: false, isWritable: true },
        { pubkey: params.roundPDA, isSigner: false, isWritable: true },
        { pubkey: vrfRequestPDA, isSigner: false, isWritable: true },
        { pubkey: oracleAuth, isSigner: false, isWritable: false },
        { pubkey: params.host, isSigner: true, isWritable: true },
        { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      data,
    };
  }

  /**
   * Fetch on-chain Table account state if deployed
   */
  public async fetchTableAccount(
    connection: import('@solana/web3.js').Connection,
    tablePDA: PublicKey
  ): Promise<AnchorTableAccount | null> {
    try {
      const info = await connection.getAccountInfo(tablePDA, 'confirmed');
      if (!info || !info.data || info.data.length < 8) return null;
      // Account exists on-chain
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch on-chain Round account state if deployed
   */
  public async fetchRoundAccount(
    connection: import('@solana/web3.js').Connection,
    roundPDA: PublicKey
  ): Promise<AnchorRoundAccount | null> {
    try {
      const info = await connection.getAccountInfo(roundPDA, 'confirmed');
      if (!info || !info.data || info.data.length < 8) return null;
      return null;
    } catch {
      return null;
    }
  }
}

export const anchorProgramService = new AnchorProgramService();
