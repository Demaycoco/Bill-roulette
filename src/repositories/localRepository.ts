import { Table, PreparedRound } from '../types';
import { ITableRepository, IRoundRepository } from './types';
import { ConcurrentModificationError, TableNotFoundError } from '../errors';

const TABLES_STORAGE_KEY = 'bill_roulette_tables_v2';
const ROUNDS_STORAGE_KEY = 'bill_roulette_rounds_v2';

let broadcast: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcast = new BroadcastChannel('bill_roulette_repo_events');
  } catch {
    broadcast = null;
  }
}

export class LocalTableRepository implements ITableRepository {
  private getStore(): Record<string, Table> {
    try {
      const raw = localStorage.getItem(TABLES_STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private setStore(store: Record<string, Table>) {
    try {
      localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(store));
      if (broadcast) {
        broadcast.postMessage({ type: 'TABLE_MUTATED', timestamp: Date.now() });
      }
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  public async create(table: Table): Promise<Table> {
    const store = this.getStore();
    if (store[table.id]) {
      throw new Error(`Table with ID ${table.id} already exists.`);
    }

    // Normalize room code uppercase
    table.roomCode = table.roomCode.trim().toUpperCase();
    table.version = 1;
    table.createdAt = Date.now();
    table.updatedAt = Date.now();

    store[table.id] = table;
    this.setStore(store);
    return { ...table };
  }

  public async findById(id: string): Promise<Table | null> {
    const store = this.getStore();
    const table = store[id];
    return table ? { ...table } : null;
  }

  public async findByRoomCode(roomCode: string): Promise<Table | null> {
    const normalized = roomCode.trim().toUpperCase();
    const store = this.getStore();
    const match = Object.values(store).find((t) => t.roomCode.toUpperCase() === normalized);
    return match ? { ...match } : null;
  }

  public async update(table: Table, expectedVersion?: number): Promise<Table> {
    const store = this.getStore();
    const existing = store[table.id];

    if (!existing) {
      throw new TableNotFoundError(table.id);
    }

    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new ConcurrentModificationError();
    }

    table.version = (existing.version || 0) + 1;
    table.updatedAt = Date.now();

    store[table.id] = table;
    this.setStore(store);
    return { ...table };
  }

  public async delete(id: string): Promise<void> {
    const store = this.getStore();
    delete store[id];
    this.setStore(store);
  }

  public async listAll(): Promise<Table[]> {
    const store = this.getStore();
    return Object.values(store).sort((a, b) => b.createdAt - a.createdAt);
  }
}

export class LocalRoundRepository implements IRoundRepository {
  private getStore(): PreparedRound[] {
    try {
      const raw = localStorage.getItem(ROUNDS_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private setStore(store: PreparedRound[]) {
    try {
      localStorage.setItem(ROUNDS_STORAGE_KEY, JSON.stringify(store));
      if (broadcast) {
        broadcast.postMessage({ type: 'ROUND_MUTATED', timestamp: Date.now() });
      }
    } catch {
      // Storage unavailable
    }
  }

  public async save(round: PreparedRound): Promise<PreparedRound> {
    const store = this.getStore();
    const index = store.findIndex((r) => r.roundId === round.roundId);
    if (index >= 0) {
      store[index] = round;
    } else {
      store.unshift(round);
    }
    this.setStore(store);
    return { ...round };
  }

  public async findById(roundId: string): Promise<PreparedRound | null> {
    const store = this.getStore();
    return store.find((r) => r.roundId === roundId) || null;
  }

  public async findByTableId(tableId: string): Promise<PreparedRound[]> {
    const store = this.getStore();
    return store.filter((r) => r.tableId === tableId);
  }

  public async listAll(): Promise<PreparedRound[]> {
    return this.getStore();
  }

  public async clear(): Promise<void> {
    this.setStore([]);
  }
}

export const localTableRepository = new LocalTableRepository();
export const localRoundRepository = new LocalRoundRepository();
