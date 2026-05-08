"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { MatchHistoryCard } from "@/components/history/match-history-card";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { displayTeam, teamById } from "@/lib/data/selectors";

export function HistoryPage() {
  const { data, isAdmin, deleteMatch } = useApp();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

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
      .filter((match) => (dateFilter ? match.matchDate === dateFilter : true))
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate));
  }, [data, dateFilter, search, teamFilter]);

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
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
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
        {matches.map((match) => (
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
      </section>
    </PageShell>
  );
}
