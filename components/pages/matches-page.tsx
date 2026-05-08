"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Edit3, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { StatStepper } from "@/components/ui/stat-stepper";
import {
  displayTeam,
  playersForTeam,
  statFor,
  teamById
} from "@/lib/data/selectors";
import { formatDate, todayIsoDate } from "@/lib/utils";
import type { Match, MatchInput, MatchStatus, StatKey, Team } from "@/types/domain";
import { statKeys, statShortLabels } from "@/types/domain";

const blankMatch: MatchInput = {
  teamAId: "",
  teamBId: "",
  matchDate: todayIsoDate(),
  status: "scheduled",
  teamAScore: 0,
  teamBScore: 0,
  remarks: ""
};

export function MatchesPage() {
  const { data, isAdmin, createMatch, updateMatch, deleteMatch, setMatchPlayer, updateStat } = useApp();
  const [editing, setEditing] = useState<Match | null>(null);
  const [form, setForm] = useState<MatchInput>(blankMatch);
  const [selectedMatchId, setSelectedMatchId] = useState(data.matches[0]?.id ?? "");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(() => new Set());
  const [playersCollapsed, setPlayersCollapsed] = useState(false);
  const [error, setError] = useState("");

  const selectedMatch = useMemo(
    () => data.matches.find((match) => match.id === selectedMatchId) ?? data.matches[0],
    [data.matches, selectedMatchId]
  );
  const selectedMatchTeamIds = selectedMatch ? [selectedMatch.teamAId, selectedMatch.teamBId] : [];
  const activeTeamId = selectedMatchTeamIds.includes(selectedTeamId) ? selectedTeamId : selectedMatch?.teamAId || "";
  const activePlayers = activeTeamId ? playersForTeam(data, activeTeamId).filter((player) => !player.archived) : [];
  const selectedPlayerIds = useMemo(() => {
    if (!selectedMatch || !activeTeamId) return new Set<string>();
    return new Set(
      data.matchStats
        .filter((stat) => stat.matchId === selectedMatch.id && stat.teamId === activeTeamId)
        .map((stat) => stat.playerId)
    );
  }, [activeTeamId, data.matchStats, selectedMatch]);
  const playingPlayers = activePlayers.filter((player) => selectedPlayerIds.has(player.id));
  const matchGroups = useMemo(() => {
    const groups = new Map<string, Match[]>();
    data.matches.forEach((match) => {
      const matches = groups.get(match.matchDate) ?? [];
      matches.push(match);
      groups.set(match.matchDate, matches);
    });

    return Array.from(groups, ([date, matches]) => ({ date, matches }));
  }, [data.matches]);

  if (!isAdmin) {
    return (
      <PageShell title="Match">
        <EmptyState title="Admin only" body="Log in as an admin to create matches and record player statistics." />
        <Link className="primary-button" href="/login">
          Admin Login
        </Link>
      </PageShell>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (editing) {
        await updateMatch(editing.id, normalizeMatch(form));
        setSelectedMatchId(editing.id);
      } else {
        await createMatch(normalizeMatch(form));
      }
      setEditing(null);
      setForm(blankMatch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save match.");
    }
  }

  function startEdit(match: Match) {
    setEditing(match);
    setForm({
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      matchDate: match.matchDate,
      status: match.status,
      teamAScore: match.teamAScore ?? 0,
      teamBScore: match.teamBScore ?? 0,
      remarks: match.remarks ?? ""
    });
    setSelectedMatchId(match.id);
    setSelectedTeamId(match.teamAId);
  }

  function toggleDateGroup(date: string) {
    setCollapsedDates((current) => {
      const next = new Set(current);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }

  async function toggleMatchPlayer(playerId: string, selected: boolean) {
    if (!selectedMatch || !activeTeamId) return;
    const existing = statFor(data, selectedMatch.id, activeTeamId, playerId);
    if (!selected && existing && hasRecordedStats(existing)) {
      const confirmed = confirmAction("Remove this player from the match and delete their recorded stats?");
      if (!confirmed) return;
    }
    await setMatchPlayer(selectedMatch.id, activeTeamId, playerId, selected);
  }

  return (
    <PageShell title="Match">
      <form className="form-panel" onSubmit={(event) => void submit(event)}>
        <div className="form-title">
          <h2>{editing ? "Edit Match" : "Create Match"}</h2>
          {editing ? (
            <button type="button" className="text-button" onClick={() => setEditing(null)}>
              Cancel
            </button>
          ) : null}
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-grid">
          <label>
            Team A
            <select value={form.teamAId} required onChange={(event) => setForm({ ...form, teamAId: event.target.value })}>
              <option value="">Select team</option>
              {data.teams
                .filter((team) => !team.archived)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Team B
            <select value={form.teamBId} required onChange={(event) => setForm({ ...form, teamBId: event.target.value })}>
              <option value="">Select team</option>
              {data.teams
                .filter((team) => !team.archived)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Date
            <input
              required
              type="date"
              value={form.matchDate}
              onChange={(event) => setForm({ ...form, matchDate: event.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as MatchStatus })}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Team A score
            <input
              min={0}
              type="number"
              value={form.teamAScore ?? 0}
              onChange={(event) => setForm({ ...form, teamAScore: Number(event.target.value) })}
            />
          </label>
          <label>
            Team B score
            <input
              min={0}
              type="number"
              value={form.teamBScore ?? 0}
              onChange={(event) => setForm({ ...form, teamBScore: Number(event.target.value) })}
            />
          </label>
        </div>
        <label>
          Remarks
          <textarea
            rows={3}
            value={form.remarks ?? ""}
            onChange={(event) => setForm({ ...form, remarks: event.target.value })}
          />
        </label>
        <button className="primary-button" type="submit">
          <Plus size={17} />
          {editing ? "Save Match" : "Add Match"}
        </button>
      </form>

      <section className="section-block match-record-section">
        <div className="section-heading">
          <h2>Match Records</h2>
        </div>
        <div className="match-record-list">
          {data.matches.length === 0 ? <EmptyState title="No matches yet" body="Create a match to start recording stats." /> : null}
          {matchGroups.map((group) => {
            const collapsed = collapsedDates.has(group.date);

            return (
              <article className="match-date-group" key={group.date}>
                <button
                  aria-expanded={!collapsed}
                  className="match-date-heading"
                  type="button"
                  onClick={() => toggleDateGroup(group.date)}
                >
                  <ChevronDown className={collapsed ? "collapsed" : ""} size={19} />
                  <strong>{formatDate(group.date)}</strong>
                  <span>{group.matches.length} match{group.matches.length === 1 ? "" : "es"}</span>
                </button>
                {collapsed
                  ? null
                  : group.matches.map((match) => {
                      const teamA = teamById(data, match.teamAId);
                      const teamB = teamById(data, match.teamBId);

                      return (
                        <div className="match-row" key={match.id}>
                        <button
                          className="match-select match-record-main"
                          type="button"
                          onClick={() => {
                            setSelectedMatchId(match.id);
                            setSelectedTeamId(match.teamAId);
                          }}
                        >
                          <span
                            className="match-score-line"
                            aria-label={`${displayTeam(teamA)} vs ${displayTeam(teamB)}`}
                          >
                            <b>{match.teamAScore ?? 0}</b>
                            <TeamLogo team={teamA} />
                            <span className="match-versus">vs</span>
                            <TeamLogo team={teamB} />
                            <b>{match.teamBScore ?? 0}</b>
                          </span>
                          <span className="match-remarks">{match.remarks || "No remarks"}</span>
                        </button>
                        <div className="match-record-footer">
                          <span className={`status status-${match.status}`}>{match.status.replace("_", " ")}</span>
                          <div className="match-record-actions">
                            <button type="button" onClick={() => startEdit(match)} title="Edit match">
                              <Edit3 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirmAction("Delete this match and its statistics?")) void deleteMatch(match.id);
                              }}
                              title="Delete match"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Record Player Stats</h2>
        </div>
        {selectedMatch ? (
          <>
            <div className="match-context">
              <strong>
                {displayTeam(teamById(data, selectedMatch.teamAId))} vs {displayTeam(teamById(data, selectedMatch.teamBId))}
              </strong>
              <span className={`status status-${selectedMatch.status}`}>{selectedMatch.status.replace("_", " ")}</span>
            </div>
            <div className="segmented">
              {[selectedMatch.teamAId, selectedMatch.teamBId].map((teamId) => (
                <button
                  className={teamId === activeTeamId ? "active" : ""}
                  key={teamId}
                  type="button"
                  onClick={() => setSelectedTeamId(teamId)}
                >
                  {displayTeam(teamById(data, teamId))}
                </button>
              ))}
            </div>
            <section className="match-player-picker">
              <button
                aria-expanded={!playersCollapsed}
                className="player-picker-heading"
                type="button"
                onClick={() => setPlayersCollapsed((current) => !current)}
              >
                <ChevronDown className={playersCollapsed ? "collapsed" : ""} size={18} />
                <strong>Players in this match</strong>
                <span>
                  {playingPlayers.length}/{activePlayers.length}
                </span>
              </button>
              {playersCollapsed ? null : activePlayers.length === 0 ? (
                  <EmptyState title="No players on this team" body="Assign players to the team before recording stats." />
                ) : (
                  <div className="player-picker-grid">
                    {activePlayers.map((player) => (
                      <label className="player-toggle" key={player.id}>
                        <input
                          checked={selectedPlayerIds.has(player.id)}
                          type="checkbox"
                          onChange={(event) => void toggleMatchPlayer(player.id, event.target.checked)}
                        />
                        <span>{player.name}</span>
                        <small>
                          #{player.jerseyNumber} {player.position}
                        </small>
                      </label>
                    ))}
                  </div>
                )}
            </section>
            <div className="stat-entry-list">
              {activePlayers.length > 0 && playingPlayers.length === 0 ? (
                <EmptyState title="No players selected" body="Select players above to record stats for this match." />
              ) : null}
              {playingPlayers.map((player) => {
                const stat = statFor(data, selectedMatch.id, activeTeamId, player.id);
                return (
                  <article className="stat-entry-card" key={player.id}>
                    <div className="player-line">
                      <strong>{player.name}</strong>
                      <span>
                        #{player.jerseyNumber} {player.position}
                      </span>
                    </div>
                    <div className="stat-stepper-grid">
                      {statKeys.map((key: StatKey) => (
                        <StatStepper
                          key={key}
                          label={statShortLabels[key]}
                          value={stat?.[key] ?? 0}
                          onChange={(value) => void updateStat(selectedMatch.id, activeTeamId, player.id, key, value)}
                        />
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState title="No match selected" body="Create or select a match to start entering stats." />
        )}
      </section>
    </PageShell>
  );
}

function normalizeMatch(input: MatchInput): MatchInput {
  return {
    ...input,
    teamAScore: Number(input.teamAScore ?? 0),
    teamBScore: Number(input.teamBScore ?? 0)
  };
}

function TeamLogo({ team }: { team?: Team }) {
  const name = displayTeam(team);

  return (
    <span className="match-team-logo" title={name}>
      {team?.logoUrl ? <img src={team.logoUrl} alt={name} /> : teamInitials(name)}
    </span>
  );
}

function teamInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function hasRecordedStats(stat: NonNullable<ReturnType<typeof statFor>>) {
  return statKeys.some((key) => stat[key] > 0);
}
