import { Table, PreparedRound } from '../types';
import { ITableRepository, IRoundRepository } from './types';
import {
  TableNotFoundError,
  TableLockedError,
  InvalidOrderError,
  ConcurrentModificationError,
  NetworkFailureError,
  BillRouletteError,
} from '../errors';

function mapApiError(err: unknown): Error {
  if (err instanceof BillRouletteError) return err;
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    const errorObj = err as { code: string; message: string; statusCode?: number };
    switch (errorObj.code) {
      case 'TABLE_NOT_FOUND':
        return new TableNotFoundError(errorObj.message);
      case 'TABLE_LOCKED':
        return new TableLockedError(errorObj.message);
      case 'INVALID_ORDER':
        return new InvalidOrderError(errorObj.message);
      case 'CONCURRENT_MODIFICATION':
        return new ConcurrentModificationError();
      default:
        return new BillRouletteError(errorObj.message, errorObj.code, errorObj.statusCode || 400);
    }
  }
  return new NetworkFailureError(err instanceof Error ? err.message : 'Unknown network failure');
}

export class ApiTableRepository implements ITableRepository {
  private baseUrl = '/api/tables';

  public async create(table: Table): Promise<Table> {
    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(table),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw errorData;
      }
      return await res.json();
    } catch (err) {
      throw mapApiError(err);
    }
  }

  public async findById(id: string): Promise<Table | null> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw await res.json().catch(() => ({}));
      return await res.json();
    } catch (err) {
      if ((err as { code?: string }).code === 'TABLE_NOT_FOUND') return null;
      throw mapApiError(err);
    }
  }

  public async findByRoomCode(roomCode: string): Promise<Table | null> {
    try {
      const res = await fetch(`${this.baseUrl}/code/${encodeURIComponent(roomCode.trim().toUpperCase())}`);
      if (res.status === 404) return null;
      if (!res.ok) throw await res.json().catch(() => ({}));
      return await res.json();
    } catch (err) {
      if ((err as { code?: string }).code === 'TABLE_NOT_FOUND') return null;
      throw mapApiError(err);
    }
  }

  public async update(table: Table, expectedVersion?: number): Promise<Table> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(table.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, expectedVersion }),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return await res.json();
    } catch (err) {
      throw mapApiError(err);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
    } catch (err) {
      throw mapApiError(err);
    }
  }

  public async listAll(): Promise<Table[]> {
    try {
      const res = await fetch(this.baseUrl);
      if (!res.ok) throw await res.json().catch(() => ({}));
      return await res.json();
    } catch (err) {
      throw mapApiError(err);
    }
  }
}

export class ApiRoundRepository implements IRoundRepository {
  private baseUrl = '/api/rounds';

  public async save(round: PreparedRound): Promise<PreparedRound> {
    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(round),
      });
      if (!res.ok) throw await res.json().catch(() => ({}));
      return await res.json();
    } catch (err) {
      throw mapApiError(err);
    }
  }

  public async findById(roundId: string): Promise<PreparedRound | null> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(roundId)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw await res.json().catch(() => ({}));
      return await res.json();
    } catch (err) {
      throw mapApiError(err);
    }
  }

  public async findByTableId(tableId: string): Promise<PreparedRound[]> {
    try {
      const res = await fetch(`${this.baseUrl}?tableId=${encodeURIComponent(tableId)}`);
      if (!res.ok) throw await res.json().catch(() => ({}));
      return await res.json();
    } catch (err) {
      throw mapApiError(err);
    }
  }

  public async listAll(): Promise<PreparedRound[]> {
    try {
      const res = await fetch(this.baseUrl);
      if (!res.ok) throw await res.json().catch(() => ({}));
      return await res.json();
    } catch (err) {
      throw mapApiError(err);
    }
  }

  public async clear(): Promise<void> {
    try {
      await fetch(this.baseUrl, { method: 'DELETE' });
    } catch {
      // ignore
    }
  }
}

export const apiTableRepository = new ApiTableRepository();
export const apiRoundRepository = new ApiRoundRepository();
