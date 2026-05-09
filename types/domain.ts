export type MatchStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type StatKey =
  | "attack"
  | "block"
  | "ace"
  | "dig"
  | "attackError"
  | "serveError"
  | "receiveError";

export const statKeys: StatKey[] = [
  "attack",
  "block",
  "ace",
  "attackError",
  "serveError",
  "receiveError"
];

export const statLabels: Record<StatKey, string> = {
  attack: "Attack",
  block: "Block",
  ace: "Ace",
  dig: "Dig",
  attackError: "Attack Error",
  serveError: "Serve Error",
  receiveError: "Receive Error"
};

export const statShortLabels: Record<StatKey, string> = {
  attack: "ATK",
  block: "BLK",
  ace: "ACE",
  dig: "DIG",
  attackError: "AE",
  serveError: "SE",
  receiveError: "RE"
};

export type Team = {
  id: string;
  name: string;
  logoUrl?: string | null;
  logoPath?: string | null;
  description?: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Player = {
  id: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string | null;
  photoPath?: string | null;
  position?: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlayerTeam = {
  id: string;
  playerId: string;
  teamId: string;
  createdAt: string;
};

export type Match = {
  id: string;
  teamAId: string;
  teamBId: string;
  matchDate: string;
  status: MatchStatus;
  teamAScore?: number | null;
  teamBScore?: number | null;
  remarks?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchStat = {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  attack: number;
  block: number;
  ace: number;
  dig: number;
  attackError: number;
  serveError: number;
  receiveError: number;
  createdAt: string;
  updatedAt: string;
};

export type AppData = {
  teams: Team[];
  players: Player[];
  playerTeams: PlayerTeam[];
  matches: Match[];
  matchStats: MatchStat[];
};

export type AdminUser = {
  userId: string;
  email: string | null;
};

export type TeamInput = {
  name: string;
  description?: string;
  archived?: boolean;
};

export type PlayerInput = {
  name: string;
  jerseyNumber: number;
  position?: string;
  archived?: boolean;
  teamIds: string[];
};

export type MatchInput = {
  teamAId: string;
  teamBId: string;
  matchDate: string;
  status: MatchStatus;
  teamAScore?: number | null;
  teamBScore?: number | null;
  remarks?: string | null;
  videoUrl?: string | null;
};
