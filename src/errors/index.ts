export class BillRouletteError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class TableNotFoundError extends BillRouletteError {
  constructor(identifier: string) {
    super(`Table with identifier or room code "${identifier}" was not found.`, 'TABLE_NOT_FOUND', 404);
  }
}

export class InvalidTableCodeError extends BillRouletteError {
  constructor(code: string) {
    super(`The room code "${code}" is invalid. Codes must be 4 to 8 alphanumeric characters.`, 'INVALID_TABLE_CODE', 400);
  }
}

export class TableLockedError extends BillRouletteError {
  constructor(status: string) {
    super(`This table is currently ${status.toLowerCase()} and cannot accept new joins or order modifications.`, 'TABLE_LOCKED', 409);
  }
}

export class TableCancelledError extends BillRouletteError {
  constructor() {
    super('This table has been cancelled by the host.', 'TABLE_CANCELLED', 410);
  }
}

export class DuplicateParticipantError extends BillRouletteError {
  constructor(participantId: string) {
    super(`Participant ID "${participantId}" is already registered at this table.`, 'DUPLICATE_PARTICIPANT', 409);
  }
}

export class DuplicateWalletError extends BillRouletteError {
  constructor(walletAddress: string) {
    super(`Wallet address "${walletAddress}" is already registered by another participant at this table.`, 'DUPLICATE_WALLET', 409);
  }
}

export class InvalidOrderError extends BillRouletteError {
  constructor(reason: string) {
    super(`Invalid order amount: ${reason}`, 'INVALID_ORDER', 400);
  }
}

export class EmptyParticipantListError extends BillRouletteError {
  constructor() {
    super('Table has no participants.', 'EMPTY_PARTICIPANT_LIST', 400);
  }
}

export class InsufficientParticipantsError extends BillRouletteError {
  constructor(count: number) {
    super(`At least 2 eligible participants are required to spin the bill. Current count: ${count}.`, 'INSUFFICIENT_PARTICIPANTS', 400);
  }
}

export class ConcurrentModificationError extends BillRouletteError {
  constructor() {
    super('The table was updated by another participant. Please refresh and retry.', 'CONCURRENT_MODIFICATION', 409);
  }
}

export class DuplicateRoundError extends BillRouletteError {
  constructor(tableId: string) {
    super(`An active round is already in progress for table "${tableId}".`, 'DUPLICATE_ROUND', 409);
  }
}

export class UnauthorizedHostError extends BillRouletteError {
  constructor() {
    super('This action can only be performed by the table host.', 'UNAUTHORIZED_HOST', 403);
  }
}

export class UnauthorizedParticipantError extends BillRouletteError {
  constructor() {
    super('You do not have permission to modify this participant record.', 'UNAUTHORIZED_PARTICIPANT', 403);
  }
}

export class NetworkFailureError extends BillRouletteError {
  constructor(message = 'Failed to connect to the table server.') {
    super(message, 'NETWORK_FAILURE', 503);
  }
}
