import { Table, GameMode, Currency, Participant, PreparedRound, TableStatus } from '../types';
import { ITableRepository, IRoundRepository } from '../repositories/types';
import { localTableRepository, localRoundRepository } from '../repositories/localRepository';
import { apiTableRepository, apiRoundRepository } from '../repositories/apiRepository';
import { roundPreparationService } from './roundPreparationService';
import { ephemeralRollupService } from './ephemeralRollupService';
import { validateOrderAmount, parseToCents } from '../utils/currency';
import {
  TableNotFoundError,
  InvalidTableCodeError,
  TableLockedError,
  TableCancelledError,
  DuplicateWalletError,
  DuplicateParticipantError,
  UnauthorizedHostError,
  UnauthorizedParticipantError,
  BillRouletteError,
} from '../errors';

const CURRENT_USER_ID_KEY = 'bill_roulette_current_user_id';
const CURRENT_USER_TOKEN_KEY = 'bill_roulette_user_token';
const HOST_TOKENS_MAP_KEY = 'bill_roulette_host_tokens_map';

export function getCurrentUserId(): string {
  let uid = localStorage.getItem(CURRENT_USER_ID_KEY);
  if (!uid) {
    uid = 'usr_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(CURRENT_USER_ID_KEY, uid);
  }
  return uid;
}

export function getCurrentUserToken(): string {
  let token = localStorage.getItem(CURRENT_USER_TOKEN_KEY);
  if (!token) {
    token = 'tok_' + Math.random().toString(36).substring(2, 14) + Date.now().toString(36);
    localStorage.setItem(CURRENT_USER_TOKEN_KEY, token);
  }
  return token;
}

export function saveHostToken(tableId: string, hostToken: string) {
  try {
    const raw = localStorage.getItem(HOST_TOKENS_MAP_KEY) || '{}';
    const map = JSON.parse(raw);
    map[tableId] = hostToken;
    localStorage.setItem(HOST_TOKENS_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getHostToken(tableId: string): string | undefined {
  try {
    const raw = localStorage.getItem(HOST_TOKENS_MAP_KEY) || '{}';
    const map = JSON.parse(raw);
    return map[tableId];
  } catch {
    return undefined;
  }
}

/**
 * Generate a human-readable 6-character room code (e.g. "ROU842").
 * Omits ambiguous characters like 0, O, 1, I.
 */
export function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  let code = '';
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  for (let i = 0; i < 3; i++) {
    code += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  return code;
}

/**
 * Validate format of a room code.
 */
export function validateRoomCodeFormat(code: string): string {
  if (!code || typeof code !== 'string') {
    throw new InvalidTableCodeError(code || '');
  }
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length < 4 || clean.length > 8) {
    throw new InvalidTableCodeError(code);
  }
  return clean;
}

export class TableService {
  private tableRepo: ITableRepository = localTableRepository;
  private roundRepo: IRoundRepository = localRoundRepository;
  private isSharedBackend = false;
  private updateListeners: Set<() => void> = new Set();

  constructor() {
    this.detectBackend();
    this.setupSyncListener();
  }

  private async detectBackend() {
    // Check if Express backend /api/health or /api/tables responds
    try {
      const res = await fetch('/api/tables', { method: 'GET' });
      if (res.ok) {
        this.tableRepo = apiTableRepository;
        this.roundRepo = apiRoundRepository;
        this.isSharedBackend = true;
      }
    } catch {
      // Fallback remains local repository
      this.isSharedBackend = false;
    }
  }

  private setupSyncListener() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('bill_roulette_repo_events');
        bc.onmessage = () => {
          this.notifyListeners();
        };
      } catch {
        // ignore
      }
    }
  }

  public subscribeToUpdates(callback: () => void): () => void {
    this.updateListeners.add(callback);
    return () => {
      this.updateListeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.updateListeners.forEach((l) => l());
  }

  public isUsingSharedBackend(): boolean {
    return this.isSharedBackend;
  }

  /**
   * 1. TABLE CREATION
   */
  public async createTable(params: {
    name: string;
    currency: Currency;
    gameMode: GameMode;
    hostName: string;
    hostWallet?: string;
    sharedBillCents?: number;
    initialHostOrderCents?: number;
  }): Promise<Table> {
    const hostId = getCurrentUserId();
    const hostAuthToken = getCurrentUserToken();
    const tableId = 'tbl_' + Math.random().toString(36).substring(2, 10);

    // Collision check for room code
    let roomCode = generateRoomCode();
    let collision = await this.tableRepo.findByRoomCode(roomCode);
    let attempts = 0;
    while (collision && attempts < 5) {
      roomCode = generateRoomCode();
      collision = await this.tableRepo.findByRoomCode(roomCode);
      attempts++;
    }

    const hostOrderCents = params.gameMode === 'individual' ? (params.initialHostOrderCents ?? 0) : 0;
    if (hostOrderCents > 0) {
      validateOrderAmount(hostOrderCents, 'Host order');
    }

    const sharedBillCents = params.gameMode === 'shared' ? (params.sharedBillCents ?? 0) : 0;
    if (sharedBillCents > 0) {
      validateOrderAmount(sharedBillCents, 'Shared bill');
    }

    const hostParticipant: Participant = {
      id: hostId,
      name: params.hostName.trim() || 'Host',
      isHost: true,
      walletAddress: params.hostWallet,
      orderAmountCents: hostOrderCents,
      joinedAt: Date.now(),
      status: 'ACTIVE',
      authToken: hostAuthToken,
    };

    const newTable: Table = {
      id: tableId,
      name: params.name.trim() || 'Dining Table',
      roomCode,
      currency: params.currency,
      gameMode: params.gameMode,
      status: 'OPEN',
      hostId,
      hostName: hostParticipant.name,
      hostWalletAddress: params.hostWallet,
      hostAuthToken,
      participants: [hostParticipant],
      sharedBillCents,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveHostToken(tableId, hostAuthToken);

    const created = await this.tableRepo.create(newTable);
    this.notifyListeners();
    return created;
  }

  /**
   * 2. JOINING AN EXISTING TABLE
   */
  public async joinTable(params: {
    roomCode: string;
    name: string;
    walletAddress?: string;
    orderAmountCents?: number;
  }): Promise<{ table: Table; participant: Participant }> {
    const cleanCode = validateRoomCodeFormat(params.roomCode);
    const table = await this.tableRepo.findByRoomCode(cleanCode);

    if (!table) {
      throw new TableNotFoundError(params.roomCode);
    }

    // Reject joins to non-OPEN tables
    if (table.status === 'LOCKED' || table.status === 'SPIN_PENDING') {
      throw new TableLockedError(table.status);
    }
    if (table.status === 'COMPLETED') {
      throw new TableLockedError('COMPLETED');
    }
    if (table.status === 'CANCELLED') {
      throw new TableCancelledError();
    }

    const currentUserId = getCurrentUserId();
    const currentUserToken = getCurrentUserToken();
    const cleanName = params.name.trim();

    if (!cleanName) {
      throw new BillRouletteError('Display name is required.', 'INVALID_NAME', 400);
    }

    const orderCents = Math.round(params.orderAmountCents || 0);
    if (orderCents > 0) {
      validateOrderAmount(orderCents, 'Order amount');
    }

    // Prevent duplicate wallet addresses
    if (params.walletAddress) {
      const existingWalletParticipant = table.participants.find(
        (p) => p.walletAddress && p.walletAddress.toLowerCase() === params.walletAddress?.toLowerCase() && p.id !== currentUserId
      );
      if (existingWalletParticipant) {
        throw new DuplicateWalletError(params.walletAddress);
      }
    }

    // Check if user is already participating (Session reconnection)
    const existingIndex = table.participants.findIndex((p) => p.id === currentUserId);
    if (existingIndex >= 0) {
      const participant = table.participants[existingIndex];
      participant.name = cleanName;
      participant.status = 'ACTIVE';
      if (params.walletAddress) participant.walletAddress = params.walletAddress;
      if (params.orderAmountCents !== undefined && table.gameMode === 'individual') {
        participant.orderAmountCents = orderCents;
      }
      table.participants[existingIndex] = participant;

      const updated = await this.tableRepo.update(table, table.version);
      this.notifyListeners();
      return { table: updated, participant };
    }

    // Create new participant record
    const newParticipant: Participant = {
      id: currentUserId,
      name: cleanName,
      walletAddress: params.walletAddress,
      orderAmountCents: table.gameMode === 'individual' ? orderCents : 0,
      joinedAt: Date.now(),
      status: 'ACTIVE',
      isHost: false,
      authToken: currentUserToken,
    };

    table.participants.push(newParticipant);
    const updated = await this.tableRepo.update(table, table.version);
    this.notifyListeners();
    return { table: updated, participant: newParticipant };
  }

  /**
   * 4. ORDER ENTRY (Individual participant update)
   */
  public async updateParticipantOrder(
    tableId: string,
    participantId: string,
    orderAmountCents: number,
    requesterId: string
  ): Promise<Table> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new TableNotFoundError(tableId);

    if (table.status !== 'OPEN') {
      throw new TableLockedError(table.status);
    }

    // Only the participant or host can edit their order
    const isHost = table.hostId === requesterId;
    if (participantId !== requesterId && !isHost) {
      throw new UnauthorizedParticipantError();
    }

    validateOrderAmount(orderAmountCents, 'Order amount');

    const participant = table.participants.find((p) => p.id === participantId);
    if (!participant) {
      throw new BillRouletteError(`Participant "${participantId}" not found at table.`, 'PARTICIPANT_NOT_FOUND', 404);
    }

    participant.orderAmountCents = Math.round(orderAmountCents);
    const updated = await this.tableRepo.update(table, table.version);
    this.notifyListeners();
    return updated;
  }

  /**
   * 4. ORDER ENTRY (Shared bill update by Host)
   */
  public async updateSharedBill(
    tableId: string,
    sharedBillCents: number,
    requesterId: string
  ): Promise<Table> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new TableNotFoundError(tableId);

    if (table.status !== 'OPEN') {
      throw new TableLockedError(table.status);
    }

    if (table.hostId !== requesterId) {
      throw new UnauthorizedHostError();
    }

    validateOrderAmount(sharedBillCents, 'Shared bill');
    table.sharedBillCents = Math.round(sharedBillCents);

    const updated = await this.tableRepo.update(table, table.version);
    this.notifyListeners();
    return updated;
  }

  /**
   * Table Status Transitions (Host operations)
   */
  public async lockTable(tableId: string, requesterId: string): Promise<Table> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new TableNotFoundError(tableId);

    if (table.hostId !== requesterId) throw new UnauthorizedHostError();
    if (table.status !== 'OPEN') throw new TableLockedError(table.status);

    table.status = 'LOCKED';
    const updated = await this.tableRepo.update(table, table.version);
    this.notifyListeners();
    return updated;
  }

  public async unlockTable(tableId: string, requesterId: string): Promise<Table> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new TableNotFoundError(tableId);

    if (table.hostId !== requesterId) throw new UnauthorizedHostError();
    if (table.status !== 'LOCKED') {
      throw new BillRouletteError(`Cannot unlock a table with status ${table.status}.`, 'INVALID_STATUS_TRANSITION', 400);
    }

    table.status = 'OPEN';
    const updated = await this.tableRepo.update(table, table.version);
    this.notifyListeners();
    return updated;
  }

  public async cancelTable(tableId: string, requesterId: string): Promise<Table> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new TableNotFoundError(tableId);

    if (table.hostId !== requesterId) throw new UnauthorizedHostError();

    table.status = 'CANCELLED';
    const updated = await this.tableRepo.update(table, table.version);
    this.notifyListeners();
    return updated;
  }

  /**
   * 6. ROUND PREPARATION
   */
  public async prepareRound(tableId: string, requesterId: string): Promise<{ table: Table; round: PreparedRound }> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new TableNotFoundError(tableId);

    const hostToken = getHostToken(tableId);

    // Ephemeral Rollup Account Safety:
    // Synchronize rollup state and return ownership to Solana Base Layer before
    // freezing the round, ensuring authoritative base-layer VRF randomness settlement.
    await ephemeralRollupService.ensureSafeVrfEnvironment(tableId);

    const { table: preparedTable, round } = await roundPreparationService.prepareRound(
      table,
      requesterId,
      hostToken
    );

    await this.roundRepo.save(round);
    const updated = await this.tableRepo.update(preparedTable, table.version);
    this.notifyListeners();
    return { table: updated, round };
  }

  /**
   * Delegate table to MagicBlock Ephemeral Rollup for sub-10ms gasless dining experience
   */
  public async delegateTableToRollup(tableId: string, requesterId: string) {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new TableNotFoundError(tableId);
    if (table.hostId !== requesterId) throw new UnauthorizedHostError();

    const session = await ephemeralRollupService.delegateTable(table);
    table.isDelegatedToRollup = true;
    table.ephemeralSession = session;
    const updated = await this.tableRepo.update(table, table.version);
    this.notifyListeners();
    return { table: updated, session };
  }

  /**
   * Synchronize Ephemeral Rollup state snapshot back to Solana Devnet L1
   */
  public async syncTableRollupState(tableId: string, requesterId: string) {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new TableNotFoundError(tableId);
    if (table.hostId !== requesterId) throw new UnauthorizedHostError();

    const session = await ephemeralRollupService.commitRollupState(tableId);
    table.ephemeralSession = session;
    const updated = await this.tableRepo.update(table, table.version);
    this.notifyListeners();
    return { table: updated, session };
  }

  /**
   * Undelegate table from Ephemeral Rollup back to Solana Devnet L1
   */
  public async undelegateTableFromRollup(tableId: string, requesterId: string) {
    const table = await this.tableRepo.findById(tableId);
    if (!table) throw new TableNotFoundError(tableId);
    if (table.hostId !== requesterId) throw new UnauthorizedHostError();

    const session = await ephemeralRollupService.undelegateTable(tableId);
    table.isDelegatedToRollup = false;
    table.ephemeralSession = session;
    const updated = await this.tableRepo.update(table, table.version);
    this.notifyListeners();
    return { table: updated, session };
  }

  /**
   * Complete Round (Finalize outcome)
   */
  public async completeRound(
    tableId: string,
    roundId: string,
    result: {
      selectedParticipantId: string;
      selectedParticipantName: string;
      selectedParticipantWallet?: string;
      randomnessSeedHex: string;
      transactionSignature?: string;
    }
  ): Promise<PreparedRound> {
    const table = await this.tableRepo.findById(tableId);
    const round = await this.roundRepo.findById(roundId);

    if (!round) throw new BillRouletteError('Round not found.', 'ROUND_NOT_FOUND', 404);

    round.status = 'RESOLVED';
    round.selectedParticipantId = result.selectedParticipantId;
    round.selectedParticipantName = result.selectedParticipantName;
    round.selectedParticipantWallet = result.selectedParticipantWallet;
    round.randomnessSeedHex = result.randomnessSeedHex;
    round.transactionSignature = result.transactionSignature;

    await this.roundRepo.save(round);

    if (table) {
      table.status = 'COMPLETED';
      await this.tableRepo.update(table, table.version);
    }

    this.notifyListeners();
    return round;
  }

  public async getTable(id: string): Promise<Table | null> {
    return this.tableRepo.findById(id);
  }

  public async getTableByRoomCode(code: string): Promise<Table | null> {
    try {
      const clean = validateRoomCodeFormat(code);
      return this.tableRepo.findByRoomCode(clean);
    } catch {
      return null;
    }
  }

  public async getAllTables(): Promise<Table[]> {
    return this.tableRepo.listAll();
  }

  public async getRounds(): Promise<PreparedRound[]> {
    return this.roundRepo.listAll();
  }

  public async getRoundById(roundId: string): Promise<PreparedRound | null> {
    return this.roundRepo.findById(roundId);
  }

  public async saveRound(round: PreparedRound): Promise<void> {
    await this.roundRepo.save(round);
    this.notifyListeners();
  }
}

export const tableService = new TableService();
