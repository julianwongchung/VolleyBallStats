import type { AppData } from "@/types/domain";

const now = new Date("2026-05-01T08:00:00.000Z").toISOString();

export const seedData: AppData = {
  teams: [
    {
      id: "team-sharks",
      name: "Sharks",
      logoUrl: null,
      logoPath: null,
      description: "Fast tempo offense with strong serve pressure.",
      archived: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "team-eagles",
      name: "Eagles",
      logoUrl: null,
      logoPath: null,
      description: "Balanced rotation with reliable passing.",
      archived: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "team-waves",
      name: "Waves",
      logoUrl: null,
      logoPath: null,
      description: "Defensive team with long rally control.",
      archived: false,
      createdAt: now,
      updatedAt: now
    }
  ],
  players: [
    {
      id: "player-aiden",
      name: "Aiden Morales",
      jerseyNumber: 1,
      position: "OH",
      photoUrl: null,
      photoPath: null,
      archived: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "player-jordan",
      name: "Jordan Kim",
      jerseyNumber: 5,
      position: "MB",
      photoUrl: null,
      photoPath: null,
      archived: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "player-liam",
      name: "Liam Reyes",
      jerseyNumber: 8,
      position: "OPP",
      photoUrl: null,
      photoPath: null,
      archived: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "player-sophie",
      name: "Sophie Chen",
      jerseyNumber: 11,
      position: "S",
      photoUrl: null,
      photoPath: null,
      archived: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "player-mateo",
      name: "Mateo Lopez",
      jerseyNumber: 14,
      position: "L",
      photoUrl: null,
      photoPath: null,
      archived: false,
      createdAt: now,
      updatedAt: now
    }
  ],
  playerTeams: [
    { id: "pt-aiden-sharks", playerId: "player-aiden", teamId: "team-sharks", createdAt: now },
    { id: "pt-jordan-sharks", playerId: "player-jordan", teamId: "team-sharks", createdAt: now },
    { id: "pt-liam-eagles", playerId: "player-liam", teamId: "team-eagles", createdAt: now },
    { id: "pt-sophie-waves", playerId: "player-sophie", teamId: "team-waves", createdAt: now },
    { id: "pt-mateo-eagles", playerId: "player-mateo", teamId: "team-eagles", createdAt: now },
    { id: "pt-mateo-waves", playerId: "player-mateo", teamId: "team-waves", createdAt: now }
  ],
  matches: [
    {
      id: "match-001",
      teamAId: "team-sharks",
      teamBId: "team-eagles",
      matchDate: "2026-05-01",
      status: "completed",
      teamAScore: 3,
      teamBScore: 1,
      remarks: "Strong serve pressure carried the first two sets.",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "match-002",
      teamAId: "team-waves",
      teamBId: "team-sharks",
      matchDate: "2026-05-05",
      status: "in_progress",
      teamAScore: 1,
      teamBScore: 1,
      remarks: "Match paused after two close sets.",
      createdAt: now,
      updatedAt: now
    }
  ],
  matchStats: [
    {
      id: "stat-001",
      matchId: "match-001",
      teamId: "team-sharks",
      playerId: "player-aiden",
      attack: 18,
      block: 3,
      ace: 4,
      dig: 10,
      attackError: 2,
      serveError: 1,
      receiveError: 1,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "stat-002",
      matchId: "match-001",
      teamId: "team-sharks",
      playerId: "player-jordan",
      attack: 10,
      block: 5,
      ace: 1,
      dig: 6,
      attackError: 1,
      serveError: 0,
      receiveError: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "stat-003",
      matchId: "match-001",
      teamId: "team-eagles",
      playerId: "player-liam",
      attack: 15,
      block: 2,
      ace: 2,
      dig: 8,
      attackError: 3,
      serveError: 1,
      receiveError: 2,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "stat-004",
      matchId: "match-001",
      teamId: "team-eagles",
      playerId: "player-mateo",
      attack: 2,
      block: 0,
      ace: 1,
      dig: 17,
      attackError: 0,
      serveError: 1,
      receiveError: 1,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "stat-005",
      matchId: "match-002",
      teamId: "team-waves",
      playerId: "player-sophie",
      attack: 7,
      block: 1,
      ace: 3,
      dig: 12,
      attackError: 1,
      serveError: 0,
      receiveError: 1,
      createdAt: now,
      updatedAt: now
    }
  ]
};
