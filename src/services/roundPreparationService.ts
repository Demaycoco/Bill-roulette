import { Table, PreparedRound, FrozenParticipant } from '../types';
import {
  TableLockedError,
  InsufficientParticipantsError,
  DuplicateRoundError,
  UnauthorizedHostError,
  InvalidOrderError,
} from '../errors';
import { calculateTableTotalCents } from '../utils/currency';

/**
 * Creates a deterministic cryptographic SHA-256 hash digest of the round inputs.
 * This canonical representation can later be passed to the on-chain Anchor program
 * or verified against MagicBlock VRF proof receipts on Solana Mainnet Beta.
 */
export async function createDeterministicRoundDigest(inputs: {
  roundId: string;
  tableId: string;
  currency: string;
  frozenBillCents: number;
  participants: FrozenParticipant[];
}): Promise<string> {
  // Canonical serialization: participants sorted by ID for deterministic hashing
  const sortedParticipants = [...inputs.participants].sort((a, b) => a.id.localeCompare(b.id));

  const canonicalPayload = JSON.stringify({
    tableId: inputs.tableId,
    roundId: inputs.roundId,
    currency: inputs.currency,
    frozenBillCents: inputs.frozenBillCents,
    participants: sortedParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      wallet: p.walletAddress || null,
      orderCents: p.orderAmountCents,
    })),
  });

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalPayload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback FNV-1a / simple 32-byte hex for environments without crypto.subtle
  let hash = 2166136261;
  for (let i = 0; i < canonicalPayload.length; i++) {
    hash ^= canonicalPayload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash).toString(16) + '00000000').slice(0, 8).repeat(8);
}

export class RoundPreparationService {
  /**
   * Validate table state and freeze inputs into a PreparedRound.
   * Enforces:
   * - Host authorization
   * - Minimum 2 eligible participants
   * - Non-negative, valid order amounts
   * - No existing active round in progress
   * - Table status transitioned to SPIN_PENDING
   */
  public async prepareRound(
    table: Table,
    requesterId: string,
    requesterAuthToken?: string
  ): Promise<{ table: Table; round: PreparedRound }> {
    // 1. Authorization: Host only
    if (table.hostId !== requesterId && (!requesterAuthToken || table.hostAuthToken !== requesterAuthToken)) {
      throw new UnauthorizedHostError();
    }

    // 2. Reject if table is not OPEN or LOCKED
    if (table.status === 'COMPLETED' || table.status === 'CANCELLED') {
      throw new TableLockedError(table.status);
    }

    // 3. Prevent duplicate active rounds
    if (table.status === 'SPIN_PENDING' && table.activeRoundId) {
      throw new DuplicateRoundError(table.id);
    }

    // 4. Validate eligible participants (must be ACTIVE or READY)
    const eligibleParticipants = table.participants.filter((p) => p.status !== 'DISCONNECTED');
    if (eligibleParticipants.length < 2) {
      throw new InsufficientParticipantsError(eligibleParticipants.length);
    }

    // Validate participant orders
    for (const p of eligibleParticipants) {
      if (!Number.isInteger(p.orderAmountCents) || p.orderAmountCents < 0) {
        throw new InvalidOrderError(`Participant "${p.name}" has an invalid order amount.`);
      }
    }

    // 5. Freeze bill amount (in integer minor units)
    const frozenBillCents = calculateTableTotalCents(table);
    if (frozenBillCents <= 0) {
      throw new InvalidOrderError('The total bill amount must be greater than zero.');
    }

    // 6. Freeze participant list snapshot
    const frozenParticipants: FrozenParticipant[] = eligibleParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      orderAmountCents: p.orderAmountCents,
      walletAddress: p.walletAddress,
      isHost: p.isHost,
    }));

    // 7. Assign unique round identifier
    const roundId = 'rnd_' + Math.random().toString(36).substring(2, 10);

    // 8. Generate deterministic round input digest
    const deterministicInputDigest = await createDeterministicRoundDigest({
      roundId,
      tableId: table.id,
      currency: table.currency,
      frozenBillCents,
      participants: frozenParticipants,
    });

    const round: PreparedRound = {
      roundId,
      tableId: table.id,
      tableName: table.name,
      roomCode: table.roomCode,
      currency: table.currency,
      frozenBillCents,
      frozenParticipants,
      deterministicInputDigest,
      preparedAt: Date.now(),
      status: 'PREPARED',
      verificationStatus: 'blockchain_pending',
      isDevelopmentOnly: true,
      notes: 'Round frozen and prepared for on-chain MagicBlock VRF selection.',
    };

    // 9. Update table state: lock and set SPIN_PENDING
    const updatedTable: Table = {
      ...table,
      status: 'SPIN_PENDING',
      activeRoundId: roundId,
      updatedAt: Date.now(),
      version: (table.version || 0) + 1,
    };

    return { table: updatedTable, round };
  }
}

export const roundPreparationService = new RoundPreparationService();
