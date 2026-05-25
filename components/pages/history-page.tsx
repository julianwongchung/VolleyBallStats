"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { MatchHistoryCard } from "@/components/history/match-history-card";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { displayTeam, teamById } from "@/lib/data/selectors";
import { formatDate } from "@/lib/utils";

export function HistoryPage() {
  const { data, isAdmin, deleteMatch } = useApp();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const completedDates = useMemo(() => {
    return Array.from(
      new Set(data.matches.filter((match) => match.status === "completed").map((match) => match.matchDate))
    ).sort((a, b) => b.localeCompare(a));
  }, [data.matches]);
  const activeDateFilter = completedDates.includes(dateFilter) ? dateFilter : "";

  const matches = useMemo(() => {
    return data.matches
      .filter((match) => match.status === "completed")
      .filter((match) => {
        const teamA = teamById(data, match.teamAId);
        const teamB = teamById(data, match.teamBId);
        const haystack = `${displayTeam(teamA)} ${displayTeam(teamB)}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .filter((match) => (teamFilter === "all" ? true : match.teamAId === teamFilter || match.teamBId === teamFilter))
      .filter((match) => (activeDateFilter ? match.matchDate === activeDateFilter : true))
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate));
  }, [activeDateFilter, data, search, teamFilter]);
  const matchGroups = useMemo(() => {
    const groups = new Map<string, typeof matches>();
    matches.forEach((match) => {
      const groupMatches = groups.get(match.matchDate) ?? [];
      groupMatches.push(match);
      groups.set(match.matchDate, groupMatches);
    });

    return Array.from(groups, ([date, groupMatches]) => ({ date, matches: groupMatches }));
  }, [matches]);

  return (
    <PageShell title="History">
      <section className="filter-panel">
        <div className="filter-heading">
          <strong>Completed Matches</strong>
        </div>
        <div className="history-filter-grid">
          <label className="search-box">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team name" />
          </label>
          <label>
            Date
            <select value={activeDateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="">All completed dates</option>
              {completedDates.map((date) => (
                <option key={date} value={date}>
                  {formatDate(date)}
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
        </div>
      </section>

      <section className="history-list">
        {matches.length === 0 ? (
          <EmptyState title="No completed matches" body="Completed matches will appear here after they are recorded." />
        ) : null}
        {matchGroups.map((group) => (
          <div className="history-date-group" key={group.date}>
            <div className="history-date-heading">
              <strong>{formatDate(group.date)}</strong>
              <span>
                {group.matches.length} match{group.matches.length === 1 ? "" : "es"}
              </span>
            </div>
            {group.matches.map((match) => (
              <MatchHistoryCard
                key={match.id}
                isAdmin={isAdmin}
                match={match}
                teamA={teamById(data, match.teamAId)}
                teamB={teamById(data, match.teamBId)}
                onDelete={() => {
                  if (confirmAction("Delete this match history and all related statistics?")) void deleteMatch(match.id);
                }}
              />
            ))}
          </div>
        ))}
      </section>
    </PageShell>
  );
}
