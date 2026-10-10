import { Table, PreparedRound } from '../types';

export interface ITableRepository {
  create(table: Table): Promise<Table>;
  findById(id: string): Promise<Table | null>;
  findByRoomCode(roomCode: string): Promise<Table | null>;
  update(table: Table, expectedVersion?: number): Promise<Table>;
  delete(id: string): Promise<void>;
  listAll(): Promise<Table[]>;
}

export interface IRoundRepository {
  save(round: PreparedRound): Promise<PreparedRound>;
  findById(roundId: string): Promise<PreparedRound | null>;
  findByTableId(tableId: string): Promise<PreparedRound[]>;
  listAll(): Promise<PreparedRound[]>;
  clear(): Promise<void>;
}
