import type { AppData, Match, MatchStat, Player, StatKey, Team } from "@/types/domain";
import { statKeys } from "@/types/domain";

export function teamById(data: AppData, id: string) {
  return data.teams.find((team) => team.id === id);
}

export function playerById(data: AppData, id: string) {
  return data.players.find((player) => player.id === id);
}

export function teamsForPlayer(data: AppData, playerId: string) {
  const teamIds = new Set(data.playerTeams.filter((link) => link.playerId === playerId).map((link) => link.teamId));
  return data.teams.filter((team) => teamIds.has(team.id));
}

export function playersForTeam(data: AppData, teamId: string) {
  const playerIds = new Set(data.playerTeams.filter((link) => link.teamId === teamId).map((link) => link.playerId));
  return data.players.filter((player) => playerIds.has(player.id));
}

export function statFor(data: AppData, matchId: string, teamId: string, playerId: string) {
  return data.matchStats.find(
    (stat) => stat.matchId === matchId && stat.teamId === teamId && stat.playerId === playerId
  );
}

export function sumStats(stats: MatchStat[]) {
  return statKeys.reduce(
    (totals, key) => {
      totals[key] = stats.reduce((sum, stat) => sum + stat[key], 0);
      return totals;
    },
    {} as Record<StatKey, number>
  );
}

export function points(stat: MatchStat) {
  return stat.attack + stat.block + stat.ace;
}

export function recentMatches(matches: Match[]) {
  return [...matches].sort((a, b) => b.matchDate.localeCompare(a.matchDate)).slice(0, 5);
}

export function topByStat(data: AppData, key: StatKey): { player: Player; total: number } | null {
  const totals = new Map<string, number>();
  data.matchStats.forEach((stat) => totals.set(stat.playerId, (totals.get(stat.playerId) ?? 0) + stat[key]));
  let best: { player: Player; total: number } | null = null;
  for (const [playerId, total] of totals) {
    const player = playerById(data, playerId);
    if (player && (!best || total > best.total)) best = { player, total };
  }
  return best;
}

export function topScorer(data: AppData): { player: Player; total: number } | null {
  const totals = new Map<string, number>();
  data.matchStats.forEach((stat) => totals.set(stat.playerId, (totals.get(stat.playerId) ?? 0) + points(stat)));
  let best: { player: Player; total: number } | null = null;
  for (const [playerId, total] of totals) {
    const player = playerById(data, playerId);
    if (player && (!best || total > best.total)) best = { player, total };
  }
  return best;
}

export function teamTotalsForMatch(data: AppData, matchId: string) {
  return data.teams
    .map((team) => {
      const stats = data.matchStats.filter((stat) => stat.matchId === matchId && stat.teamId === team.id);
      return {
        team,
        stats,
        totals: sumStats(stats),
        points: stats.reduce((sum, stat) => sum + points(stat), 0)
      };
    })
    .filter((row) => row.stats.length > 0);
}

export function displayTeam(team?: Team) {
  return team?.name ?? "Unknown team";
}
