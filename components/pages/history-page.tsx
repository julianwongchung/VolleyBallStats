"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { MatchHistoryCard } from "@/components/history/match-history-card";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { teamById } from "@/lib/data/selectors";
import { formatDate } from "@/lib/utils";

export function HistoryPage() {
  const { data, isAdmin, deleteMatch } = useApp();
  const [teamFilter, setTeamFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [toggledDateGroups, setToggledDateGroups] = useState<Set<string>>(() => new Set());

  const completedDates = useMemo(() => {
    return Array.from(
      new Set(data.matches.filter((match) => match.status === "completed").map((match) => match.matchDate))
    ).sort((a, b) => b.localeCompare(a));
  }, [data.matches]);
  const activeDateFilter = completedDates.includes(dateFilter) ? dateFilter : "";

  const matches = useMemo(() => {
    return data.matches
      .filter((match) => match.status === "completed")
      .filter((match) => (teamFilter === "all" ? true : match.teamAId === teamFilter || match.teamBId === teamFilter))
      .filter((match) => (activeDateFilter ? match.matchDate === activeDateFilter : true))
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate));
  }, [activeDateFilter, data.matches, teamFilter]);
  const matchGroups = useMemo(() => {
    const groups = new Map<string, typeof matches>();
    matches.forEach((match) => {
      const groupMatches = groups.get(match.matchDate) ?? [];
      groupMatches.push(match);
      groups.set(match.matchDate, groupMatches);
    });

    return Array.from(groups, ([date, groupMatches]) => ({ date, matches: groupMatches }));
  }, [matches]);

  function toggleDateGroup(date: string) {
    setToggledDateGroups((current) => {
      const next = new Set(current);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }

  function isGroupCollapsed(date: string) {
    const defaultCollapsed = !activeDateFilter && isAtLeastSevenDaysOld(date);
    return toggledDateGroups.has(date) ? !defaultCollapsed : defaultCollapsed;
  }

  return (
    <PageShell title="History">
      <section className="filter-panel">
        <div className="filter-heading">
          <strong>Completed Matches</strong>
        </div>
        <div className="history-filter-grid">
          <label>
            Date
            <select value={activeDateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="">Completed Date</option>
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
        {matchGroups.map((group) => {
          const collapsed = isGroupCollapsed(group.date);

          return (
            <div className="history-date-group" key={group.date}>
              <button
                aria-expanded={!collapsed}
                className="history-date-heading"
                type="button"
                onClick={() => toggleDateGroup(group.date)}
              >
                <div>
                  <ChevronDown className={collapsed ? "collapsed" : ""} size={18} />
                  <strong>{formatDate(group.date)}</strong>
                </div>
                <span>
                  {group.matches.length} match{group.matches.length === 1 ? "" : "es"}
                </span>
              </button>
              {collapsed
                ? null
                : group.matches.map((match) => (
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
          );
        })}
      </section>
    </PageShell>
  );
}

function isAtLeastSevenDaysOld(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const matchDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysOld = Math.floor((today.getTime() - matchDate.getTime()) / 86_400_000);
  return daysOld >= 7;
}
