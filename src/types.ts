export type GenderType = 'Laki-laki' | 'Perempuan' | 'Lainnya';
export type SkillLevelType = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Player {
  id: string;
  name: string;
  gender: GenderType;
  skillLevel: SkillLevelType;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  points: number; // accumulated points (sum of scored games / score differences)
  gamesWon: number; // individual game scores won
  gamesLost: number; // game scores conceded
  playingTime: number; // total playing time in minutes
  winRate: number; // calculated percentage
}

export interface Match {
  id: string;
  courtName: string;
  round: number;
  format: 'Singles' | 'Doubles';
  team1: string[]; // Player IDs
  team2: string[]; // Player IDs
  score1?: number; // Score of Team 1
  score2?: number; // Score of Team 2
  status: 'Scheduled' | 'In Progress' | 'Completed';
  duration: number; // in minutes
  timestamp?: string; // string representation of scheduled slot
  startTime?: number; // epoc timestamp in millisecond when the game started
  durationSeconds?: number; // exact match duration in seconds upon completion
}

export type TournamentFormat =
  | 'Americano'
  | 'Mexicano'
  | 'Mixicano'
  | 'Mixed Americano'
  | 'Team Americano'
  | 'Team Mexicano'
  | 'Super Mexicano'
  | 'King of the Court';

export type ScoringType = 'BestOf' | 'RaceTo';

export interface TournamentConfig {
  courtCount: number;
  matchDuration: number; // in minutes
  format: 'Singles' | 'Doubles';
  winPoints: number; // points for winning a match
  drawPoints: number; // points for a draw (if applicable/tie)
  tournamentFormat?: TournamentFormat;
  scoringType?: ScoringType;
  scoringValue?: number;
  partnerMap?: Record<string, string>; // pre-assigned pairings for Team formats
}

export interface PadelEvent {
  id: string;
  name: string;
  createdAt: string;
  format: TournamentFormat;
  players: Player[];
  matches: Match[];
  config: TournamentConfig & {
    scoringType: ScoringType;
    scoringValue: number;
    roundsCount: number;
  };
  partnerMap?: Record<string, string>;
  status?: 'Active' | 'Completed';
}

// ============================================================
// COTTA FINANCE TYPES
// ============================================================

export type FinanceEventStatus = 'draft' | 'active' | 'completed';
export type AttendanceStatus = 'hadir' | 'batal';
export type SplitType = 'equal' | 'custom' | 'free';
export type TaxType = 'percentage' | 'nominal';
export type PaymentMethod = 'transfer' | 'cash' | 'other';
export type CashTransactionType = 'income' | 'expense';
export type CashCategory =
  | 'court_fee'
  | 'sponsor'
  | 'bola'
  | 'operasional'
  | 'member_payment'
  | 'other';

export interface FinanceEvent {
  id: string;
  event_id: string;          // references PadelEvent.id
  event_name: string;
  session_date: string;      // ISO date string
  court_fee: number;
  additional_fee: number;
  tax_type: TaxType;
  tax_value: number;
  discount: number;
  final_total: number;       // calculated: (court_fee + additional_fee) + tax - discount
  notes?: string;
  status: FinanceEventStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceParticipant {
  id: string;
  finance_event_id: string;
  player_id: string;
  player_name: string;
  attendance_status: AttendanceStatus;
  split_type: SplitType;
  custom_amount: number;
  final_charge: number;      // calculated based on split_type
  created_at: string;
  updated_at: string;
}

export interface FinancePayment {
  id: string;
  finance_event_id: string;
  player_id: string;
  player_name: string;
  amount: number;
  payment_date: string;      // ISO date string
  payment_method: PaymentMethod;
  notes?: string;
  proof_url?: string;
  recorded_by: string;
  created_at: string;
}

export interface FinanceCashTransaction {
  id: string;
  transaction_date: string;
  type: CashTransactionType;
  category: CashCategory;
  description: string;
  amount: number;
  finance_event_id?: string;
  reference_id?: string;
  recorded_by: string;
  created_at: string;
}

export interface FinanceAuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  performed_by: string;
  performed_at: string;
}

/** Aggregated balance per player across all finance events */
export interface MemberFinanceBalance {
  player_id: string;
  player_name: string;
  total_sessions: number;
  total_charged: number;
  total_paid: number;
  outstanding: number;      // total_charged - total_paid (if positive = debt)
  credit: number;           // total_paid - total_charged (if positive = overpaid)
}

/** Dashboard summary aggregated data */
export interface FinanceDashboardSummary {
  total_cash: number;
  total_income: number;
  total_expense: number;
  total_outstanding: number;
  total_events: number;
  total_revenue: number;
  monthly_data: { month: string; income: number; expense: number }[];
  top_payers: { player_name: string; total_paid: number; sessions: number }[];
}
