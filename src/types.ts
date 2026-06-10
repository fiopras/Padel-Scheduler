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
}

export interface TournamentConfig {
  courtCount: number;
  matchDuration: number; // in minutes
  format: 'Singles' | 'Doubles';
  winPoints: number; // points for winning a match
  drawPoints: number; // points for a draw (if applicable/tie)
}
