"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import {
  displayTeam,
  playerById,
  sumStats,
  teamById,
  teamTotalsForMatch
} from "@/lib/data/selectors";
import { formatDate } from "@/lib/utils";
import { statKeys, statShortLabels, type AppData, type StatKey } from "@/types/domain";

type PlayerSummaryRow = {
  key: string;
  playerName: string;
  teamName: string;
  stats: Record<StatKey, number>;
  points: number;
};

export function StatisticsPage() {
  const { data } = useApp();
  const [matchFilter, setMatchFilter] = useState(data.matches[0]?.id ?? "all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [summaryTeamFilter, setSummaryTeamFilter] = useState(data.matches[0]?.teamAId ?? "");

  const selectedMatch = data.matches.find((match) => match.id === matchFilter);
  const summaryTeamIds = selectedMatch ? [selectedMatch.teamAId, selectedMatch.teamBId] : [];
  const activeSummaryTeamId = selectedMatch
    ? summaryTeamIds.includes(summaryTeamFilter)
      ? summaryTeamFilter
      : selectedMatch.teamAId
    : "";

  function handleMatchFilterChange(matchId: string) {
    setMatchFilter(matchId);
    const match = data.matches.find((current) => current.id === matchId);
    setSummaryTeamFilter(match?.teamAId ?? "");
  }

  const filteredStats = useMemo(() => {
    return data.matchStats
      .filter((stat) => (matchFilter === "all" ? true : stat.matchId === matchFilter))
      .filter((stat) => (teamFilter === "all" ? true : stat.teamId === teamFilter))
      .filter((stat) => (playerFilter === "all" ? true : stat.playerId === playerFilter));
  }, [data.matchStats, matchFilter, playerFilter, teamFilter]);

  const playerSummaryRows = buildPlayerSummaryRows(
    data,
    matchFilter,
    selectedMatch ? activeSummaryTeamId : teamFilter,
    playerFilter
  );

  const totals = sumStats(filteredStats);
  const teamTotals = selectedMatch ? teamTotalsForMatch(data, selectedMatch.id) : [];

  return (
    <PageShell title="Statistics">
      <section className="filter-panel">
        <div className="filter-heading">
          <Filter size={16} />
          <strong>Filters</strong>
        </div>
        <div className="filter-grid">
          <label>
            Match
            <select value={matchFilter} onChange={(event) => handleMatchFilterChange(event.target.value)}>
              <option value="all">All matches</option>
              {data.matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {formatDate(match.matchDate)} - {displayTeam(teamById(data, match.teamAId))} vs{" "}
                  {displayTeam(teamById(data, match.teamBId))}
                </option>
              ))}
            </select>
          </label>
          <label>
            Team
            <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
              <option value="all">All teams</option>
              {data.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Player
            <select value={playerFilter} onChange={(event) => setPlayerFilter(event.target.value)}>
              <option value="all">All players</option>
              {data.players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="metric-grid stat-total-grid">
        {statKeys.map((key) => (
          <article className="metric-card" key={key}>
            <div>
              <strong>{totals[key]}</strong>
              <span>{statShortLabels[key]}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Player Summary by PTS</h2>
        </div>
        {selectedMatch ? (
          <div className="segmented summary-tabs" aria-label="Player summary team filter">
            {summaryTeamIds.map((teamId) => (
              <button
                className={teamId === activeSummaryTeamId ? "active" : ""}
                key={teamId}
                type="button"
                onClick={() => setSummaryTeamFilter(teamId)}
              >
                {displayTeam(teamById(data, teamId))}
              </button>
            ))}
          </div>
        ) : null}
        {playerSummaryRows.length === 0 ? (
          <EmptyState title="No statistics found" body="Change filters or record stats for a match." />
        ) : (
          <div className="responsive-table">
            <div className="table-head stats-grid">
              <span>Player</span>
              <span>Team</span>
              {statKeys.map((key) => (
                <span key={key}>{statShortLabels[key]}</span>
              ))}
              <span>PTS</span>
            </div>
            {playerSummaryRows.map((row) => (
              <div className="table-row stats-grid" key={row.key}>
                <strong>{row.playerName}</strong>
                <span>{row.teamName}</span>
                {statKeys.map((key) => (
                  <span key={key} data-label={statShortLabels[key]}>
                    {row.stats[key]}
                  </span>
                ))}
                <b>{row.points}</b>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Team Totals {selectedMatch ? `- ${formatDate(selectedMatch.matchDate)}` : ""}</h2>
        </div>
        {teamTotals.length === 0 ? (
          <EmptyState title="Select one match" body="Team totals are shown for a selected match." />
        ) : (
          <div className="responsive-table">
            <div className="table-head team-grid">
              <span>Team</span>
              {statKeys.map((key) => (
                <span key={key}>{statShortLabels[key]}</span>
              ))}
              <span>PTS</span>
            </div>
            {teamTotals.map((row) => (
              <div className="table-row team-grid" key={row.team.id}>
                <strong>{row.team.name}</strong>
                {statKeys.map((key) => (
                  <span key={key}>{row.totals[key]}</span>
                ))}
                <b>{row.points}</b>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function buildPlayerSummaryRows(
  data: AppData,
  matchFilter: string,
  teamFilter: string,
  playerFilter: string
) {
  const rows = new Map<string, PlayerSummaryRow>();

  for (const stat of data.matchStats) {
    if (matchFilter !== "all" && stat.matchId !== matchFilter) continue;
    if (teamFilter !== "all" && stat.teamId !== teamFilter) continue;
    if (playerFilter !== "all" && stat.playerId !== playerFilter) continue;

    const key = `${stat.teamId}:${stat.playerId}`;
    let row = rows.get(key);

    if (!row) {
      const player = playerById(data, stat.playerId);
      const team = teamById(data, stat.teamId);
      row = {
        key,
        playerName: player?.name ?? "Unknown",
        teamName: team?.name ?? "Unknown",
        stats: statKeys.reduce(
          (totals, statKey) => {
            totals[statKey] = 0;
            return totals;
          },
          {} as Record<StatKey, number>
        ),
        points: 0
      };
      rows.set(key, row);
    }

    for (const statKey of statKeys) {
      row.stats[statKey] += stat[statKey];
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      points: row.stats.attack + row.stats.block + row.stats.ace
    }))
    .sort((a, b) => b.points - a.points || a.playerName.localeCompare(b.playerName));
}
