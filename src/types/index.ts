export type Currency = 'SOL' | 'USDC';

export type GameMode = 'individual' | 'shared';

export type TableStatus = 'OPEN' | 'LOCKED' | 'SPIN_PENDING' | 'COMPLETED' | 'CANCELLED';

export type ParticipantStatus = 'ACTIVE' | 'READY' | 'DISCONNECTED';

export interface Participant {
  id: string; // Unique participant UUID / security identifier
  name: string; // Display name (never used as security identifier)
  walletAddress?: string;
  orderAmountCents: number; // Integer minor units (e.g. 2450 = $24.50)
  joinedAt: number;
  status: ParticipantStatus;
  isHost: boolean;
  authToken?: string; // Private session token for participant authorization
}

export type EphemeralRollupStatus =
  | 'Connecting'
  | 'Session active'
  | 'Transaction pending'
  | 'State synchronized'
  | 'Delegation pending'
  | 'Operation failed';

export type EphemeralLifecyclePhase =
  | 'INITIAL'
  | 'DELEGATED'
  | 'ROLLUP_EXECUTING'
  | 'SYNCHRONIZING'
  | 'UNDELEGATING'
  | 'RETURNED_TO_BASE';

export interface EphemeralSession {
  sessionId: string;
  tableId: string;
  isDelegated: boolean;
  status: EphemeralRollupStatus;
  phase: EphemeralLifecyclePhase;
  delegationProgramId: string;
  validator: string;
  ephemeralEndpoint: string;
  routerEndpoint: string;
  ephemeralSlot: number;
  lastL1SettlementSlot?: number;
  lastSyncedAt?: number;
  isGasless: boolean;
  latencyMs: number;
  pendingTransactionsCount: number;
  error?: string;
}

export interface Table {
  id: string;
  name: string;
  roomCode: string;
  currency: Currency;
  gameMode: GameMode;
  status: TableStatus;
  hostId: string;
  hostName: string;
  hostWalletAddress?: string;
  hostAuthToken?: string; // Secret token for host-only operations
  participants: Participant[];
  sharedBillCents: number; // Used in shared mode (integer minor units)
  activeRoundId?: string;
  version: number; // Incremented on every mutation for concurrency protection
  createdAt: number;
  updatedAt: number;
  isDelegatedToRollup?: boolean;
  ephemeralSession?: EphemeralSession;
}

export type VerificationState =
  | 'blockchain_pending'      // Standard state when contract is not yet deployed on-chain
  | 'vrf_oracle_requested'    // MagicBlock VRF Oracle CPI call in flight
  | 'verified_on_chain'       // Validated Devnet tx signature with program proof
  | 'dev_cryptographic_test'; // Local deterministic cryptographic seed for sandbox test

export interface FrozenParticipant {
  id: string;
  name: string;
  orderAmountCents: number;
  walletAddress?: string;
  isHost: boolean;
}

export type VRFLifecycleState =
  | 'IDLE'
  | 'ROUND_LOCKED'
  | 'VRF_REQUESTED'
  | 'AWAITING_CALLBACK'
  | 'RANDOMNESS_VERIFIED'
  | 'WINNER_SETTLED'
  | 'ERROR';

export interface PreparedRound {
  roundId: string;
  id?: string; // alias for roundId
  tableId: string;
  tableName: string;
  roomCode: string;
  currency: Currency;
  frozenBillCents: number;
  totalBillCents?: number; // alias for frozenBillCents
  frozenParticipants: FrozenParticipant[];
  participants?: FrozenParticipant[]; // alias for frozenParticipants
  deterministicInputDigest: string; // SHA-256 canonical hash of inputs
  preparedAt: number;
  createdAt?: number; // alias for preparedAt
  status: 'PREPARED' | 'SPINNING' | 'RESOLVED' | 'CANCELLED';
  selectedParticipantId?: string;
  selectedParticipantName?: string;
  selectedParticipantWallet?: string;
  selectedParticipantIndex?: number;
  randomnessSeedHex?: string;
  vrfRequestId?: string;
  vrfBeaconHex?: string;
  vrfProofHex?: string;
  vrfProgramId?: string;
  vrfLifecycleState?: VRFLifecycleState;
  transactionSignature?: string;
  verificationStatus: VerificationState;
  slot?: number;
  isDevelopmentOnly: boolean;
  notes?: string;
}

export interface RouletteRound extends PreparedRound {
  // Alias for backward compatibility
}

export interface VRFRequest {
  requestId: string;
  clientSeedHex: string;
  alphaHex: string;
  oracleStatus: 'unsubmitted' | 'oracle_dispatched' | 'fulfilled' | 'failed';
  magicBlockAccount: string;
  rawRandomnessHex?: string;
  derivedWinnerIndex: number;
  timestamp: number;
  expiresAt?: number;
  proofHex?: string;
}

export interface SolanaTransactionInfo {
  signature: string;
  slot?: number;
  confirmed: boolean;
  cluster: 'devnet';
  explorerUrl?: string;
  programId: string;
}

export type SupportedWalletId = 'phantom' | 'solflare' | 'backpack' | 'standard';

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  walletName: string | null;
  walletId?: SupportedWalletId | null;
  balanceLamports: number | null;
  balanceUsdcBaseUnits?: number | null;
  isConnecting: boolean;
  error: string | null;
  network: 'devnet';
  isExternal?: boolean;
}
