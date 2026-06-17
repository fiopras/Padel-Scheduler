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
