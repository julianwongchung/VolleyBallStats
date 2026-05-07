"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import {
  displayTeam,
  playerById,
  points,
  sumStats,
  teamById,
  teamTotalsForMatch
} from "@/lib/data/selectors";
import { formatDate } from "@/lib/utils";
import { statKeys, statShortLabels } from "@/types/domain";

export function StatisticsPage() {
  const { data } = useApp();
  const [matchFilter, setMatchFilter] = useState(data.matches[0]?.id ?? "all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");

  const selectedMatch = data.matches.find((match) => match.id === matchFilter);

  const filteredStats = useMemo(() => {
    return data.matchStats
      .filter((stat) => (matchFilter === "all" ? true : stat.matchId === matchFilter))
      .filter((stat) => (teamFilter === "all" ? true : stat.teamId === teamFilter))
      .filter((stat) => (playerFilter === "all" ? true : stat.playerId === playerFilter));
  }, [data.matchStats, matchFilter, playerFilter, teamFilter]);

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
            <select value={matchFilter} onChange={(event) => setMatchFilter(event.target.value)}>
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
          <h2>Player Summary</h2>
        </div>
        {filteredStats.length === 0 ? (
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
            {filteredStats.map((stat) => {
              const player = playerById(data, stat.playerId);
              const team = teamById(data, stat.teamId);
              return (
                <div className="table-row stats-grid" key={stat.id}>
                  <strong>{player?.name ?? "Unknown"}</strong>
                  <span>{team?.name ?? "Unknown"}</span>
                  {statKeys.map((key) => (
                    <span key={key} data-label={statShortLabels[key]}>
                      {stat[key]}
                    </span>
                  ))}
                  <b>{points(stat)}</b>
                </div>
              );
            })}
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
