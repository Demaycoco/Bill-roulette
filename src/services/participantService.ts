import { Participant, Table } from '../types';
import { tableService, getCurrentUserId } from './tableService';
import { ephemeralRollupService } from './ephemeralRollupService';
import { BillRouletteError } from '../errors';

export interface JoinTableResult {
  success: boolean;
  table?: Table;
  participant?: Participant;
  error?: string;
  errorCode?: string;
}

class ParticipantService {
  /**
   * Add a new participant to an existing table
   */
  public async joinTable(params: {
    roomCode: string;
    name: string;
    orderAmountCents?: number;
    walletAddress?: string;
  }): Promise<JoinTableResult> {
    try {
      const { table, participant } = await tableService.joinTable(params);
      return { success: true, table, participant };
    } catch (err) {
      if (err instanceof BillRouletteError) {
        return { success: false, error: err.message, errorCode: err.code };
      }
      return { success: false, error: err instanceof Error ? err.message : 'Failed to join table.' };
    }
  }

  /**
   * Update order amount for a participant (accelerated via Ephemeral Rollup when delegated)
   */
  public async updateParticipantOrder(
    tableId: string,
    participantId: string,
    orderAmountCents: number
  ): Promise<{ success: boolean; table?: Table; error?: string }> {
    try {
      const requesterId = getCurrentUserId();
      const { result: table } = await ephemeralRollupService.executeRollupOperation(
        tableId,
        'updateParticipantOrder',
        () =>
          tableService.updateParticipantOrder(
            tableId,
            participantId,
            orderAmountCents,
            requesterId
          )
      );
      return { success: true, table };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update order.',
      };
    }
  }

  /**
   * Disconnect or remove participant
   */
  public async removeParticipant(
    tableId: string,
    participantId: string
  ): Promise<{ success: boolean; table?: Table; error?: string }> {
    try {
      const table = await tableService.getTable(tableId);
      if (!table) return { success: false, error: 'Table not found.' };

      const requesterId = getCurrentUserId();
      if (table.hostId !== requesterId && participantId !== requesterId) {
        return { success: false, error: 'Unauthorized to remove this participant.' };
      }

      if (table.status !== 'OPEN') {
        return { success: false, error: `Cannot remove participants while table is ${table.status}.` };
      }

      const participant = table.participants.find((p) => p.id === participantId);
      if (!participant || participant.isHost) {
        return { success: false, error: 'Host cannot be removed from table.' };
      }

      table.participants = table.participants.filter((p) => p.id !== participantId);
      const updated = await tableService.getTable(tableId); // Refresh
      return { success: true, table: updated || table };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to remove participant.' };
    }
  }
}

export const participantService = new ParticipantService();
