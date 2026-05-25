"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ClipboardList, Edit3, Plus, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import {
  comparisonTotalsForMatch,
  displayTeam,
  playersForTeam,
  statFor,
  teamById
} from "@/lib/data/selectors";
import { formatDate, todayIsoDate } from "@/lib/utils";
import type { Match, MatchInput, MatchStatus, Player, StatKey, Team } from "@/types/domain";
import { statKeys, statShortLabels } from "@/types/domain";

const blankMatch: MatchInput = {
  teamAId: "",
  teamBId: "",
  matchDate: "",
  status: "scheduled",
  teamAScore: 0,
  teamBScore: 0,
  remarks: "",
  videoUrl: ""
};

type ScoreEvent = {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  statKey: StatKey;
  scoringTeamId: string;
  delta: 1 | -1;
  previousServingTeamId?: string;
  rotatedTeamId?: string;
};

type CourtPosition = "1" | "2" | "3" | "4" | "5" | "6";
type CourtLineup = Partial<Record<CourtPosition, string>>;

const courtPositions: CourtPosition[] = ["4", "3", "2", "5", "6", "1"];
const rotationOrder: CourtPosition[] = ["1", "6", "5", "4", "3", "2"];
const courtActionKeys: StatKey[] = ["attack", "ace", "serveError", "block", "attackError", "receiveError"];

const courtActionDescriptions: Record<StatKey, string> = {
  attack: "Own team point",
  block: "Own team point",
  ace: "Own team point",
  dig: "No score",
  attackError: "Opponent point",
  serveError: "Opponent point",
  receiveError: "Opponent point"
};

export function MatchesPage() {
  const { data, isAdmin, createMatch, updateMatch, deleteMatch, resetMatchStats, setMatchPlayer, updateStat } = useApp();
  const [editing, setEditing] = useState<Match | null>(null);
  const [form, setForm] = useState<MatchInput>(blankMatch);
  const [selectedMatchId, setSelectedMatchId] = useState(data.matches[0]?.id ?? "");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [recordingMatchId, setRecordingMatchId] = useState("");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());
  const [playersCollapsed, setPlayersCollapsed] = useState(true);
  const [scoreDetailsOpen, setScoreDetailsOpen] = useState(false);
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const pendingStatKeysRef = useRef<Set<string>>(new Set());
  const [courtLineups, setCourtLineups] = useState<Record<string, CourtLineup>>({});
  const [servingTeamIds, setServingTeamIds] = useState<Record<string, string>>({});
  const [draggedCourtPlayerId, setDraggedCourtPlayerId] = useState("");
  const [selectedCourtPlayerId, setSelectedCourtPlayerId] = useState("");
  const [courtActionPlayerId, setCourtActionPlayerId] = useState("");
  const [error, setError] = useState("");

  const selectedMatch = useMemo(
    () => data.matches.find((match) => match.id === selectedMatchId) ?? data.matches[0],
    [data.matches, selectedMatchId]
  );
  const isRecordingStats = Boolean(recordingMatchId && selectedMatch?.id === recordingMatchId);
  const selectedMatchScore = selectedMatch ? calculatedMatchScore(data, selectedMatch) : { teamA: 0, teamB: 0 };
  const selectedMatchTeamIds = selectedMatch ? [selectedMatch.teamAId, selectedMatch.teamBId] : [];
  const servingTeamId = selectedMatch ? servingTeamIds[selectedMatch.id] ?? selectedMatch.teamAId : "";
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
  const activeCourtLineupKey = selectedMatch && activeTeamId ? courtLineupKey(selectedMatch.id, activeTeamId) : "";
  const activeCourtLineup = activeCourtLineupKey ? courtLineups[activeCourtLineupKey] ?? {} : {};
  const courtAssignedPlayerIds = new Set(Object.values(activeCourtLineup).filter(Boolean));
  const courtBenchPlayers = playingPlayers.filter((player) => !courtAssignedPlayerIds.has(player.id));
  const courtActionPlayer = playingPlayers.find((player) => player.id === courtActionPlayerId);
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
      setForm(newMatchDefaults());
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
      remarks: match.remarks ?? "",
      videoUrl: match.videoUrl ?? ""
    });
    setSelectedMatchId(match.id);
    setSelectedTeamId(match.teamAId);
  }

  function toggleDateGroup(date: string) {
    setExpandedDates((current) => {
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
    if (!selected) {
      removeCourtPlayer(playerId);
      setCourtActionPlayerId((current) => (current === playerId ? "" : current));
    }
  }

  async function changePlayerStat(playerId: string, statKey: StatKey, nextValue: number) {
    if (!selectedMatch || !activeTeamId) return;
    const pendingKey = statUpdateKey(selectedMatch.id, activeTeamId, playerId, statKey);
    if (pendingStatKeysRef.current.has(pendingKey)) return;

    const existing = statFor(data, selectedMatch.id, activeTeamId, playerId);
    const currentValue = existing?.[statKey] ?? 0;
    const safeNextValue = Math.max(0, nextValue);
    const difference = safeNextValue - currentValue;
    if (difference === 0) return;

    const scoringTeamId = scoringTeamForStat(selectedMatch, activeTeamId, statKey);
    if (!scoringTeamId) return;

    const direction: 1 | -1 = difference > 0 ? 1 : -1;
    pendingStatKeysRef.current.add(pendingKey);

    try {
      await updateStat(selectedMatch.id, activeTeamId, playerId, statKey, Math.max(0, currentValue + direction));
      const rotation = direction > 0 ? rotateForPoint(selectedMatch, scoringTeamId) : null;

      setScoreEvents((current) => [
        ...current,
        {
          id: `${selectedMatch.id}-${playerId}-${statKey}-${current.length}`,
          matchId: selectedMatch.id,
          teamId: activeTeamId,
          playerId,
          statKey,
          scoringTeamId,
          delta: direction,
          previousServingTeamId: rotation?.previousServingTeamId,
          rotatedTeamId: rotation?.rotatedTeamId ?? undefined
        }
      ]);
    } finally {
      pendingStatKeysRef.current.delete(pendingKey);
    }
  }

  async function recordCourtPlayerAction(playerId: string, statKey: StatKey) {
    if (!selectedMatch || !activeTeamId) return;
    const currentValue = statFor(data, selectedMatch.id, activeTeamId, playerId)?.[statKey] ?? 0;
    setCourtActionPlayerId("");
    await changePlayerStat(playerId, statKey, currentValue + 1);
  }

  function selectMatchRecord(match: Match) {
    setSelectedMatchId(match.id);
    setSelectedTeamId(match.teamAId);
    setRecordingMatchId("");
    setCourtActionPlayerId("");
  }

  function startRecordStats(match: Match) {
    const confirmed = confirmAction("Record player stats for this match?");
    if (!confirmed) return;
    setSelectedMatchId(match.id);
    setSelectedTeamId(match.teamAId);
    setPlayersCollapsed(true);
    setRecordingMatchId(match.id);
    setCourtActionPlayerId("");
  }

  function assignCourtPlayer(position: CourtPosition, playerId: string) {
    if (!activeCourtLineupKey || !playerId) return;

    setCourtLineups((current) => {
      const nextLineup: CourtLineup = { ...(current[activeCourtLineupKey] ?? {}) };
      courtPositions.forEach((item) => {
        if (nextLineup[item] === playerId) delete nextLineup[item];
      });
      nextLineup[position] = playerId;
      return { ...current, [activeCourtLineupKey]: nextLineup };
    });
    setSelectedCourtPlayerId("");
  }

  function removeCourtPlayer(playerId: string) {
    if (!activeCourtLineupKey || !playerId) return;

    setCourtLineups((current) => {
      const nextLineup: CourtLineup = { ...(current[activeCourtLineupKey] ?? {}) };
      courtPositions.forEach((position) => {
        if (nextLineup[position] === playerId) delete nextLineup[position];
      });
      return { ...current, [activeCourtLineupKey]: nextLineup };
    });
    setSelectedCourtPlayerId((current) => (current === playerId ? "" : current));
    setCourtActionPlayerId((current) => (current === playerId ? "" : current));
  }

  function onCourtDrop(event: React.DragEvent, position: CourtPosition) {
    event.preventDefault();
    const playerId = event.dataTransfer.getData("text/plain") || draggedCourtPlayerId;
    assignCourtPlayer(position, playerId);
    setDraggedCourtPlayerId("");
  }

  function onCourtBenchDrop(event: React.DragEvent) {
    event.preventDefault();
    const playerId = event.dataTransfer.getData("text/plain") || draggedCourtPlayerId;
    removeCourtPlayer(playerId);
    setDraggedCourtPlayerId("");
  }

  async function resetSelectedMatch() {
    if (!selectedMatch) return;
    const confirmed = confirmAction("Reset all player stats, score details, live score, and court rotation for this match?");
    if (!confirmed) return;

    await resetMatchStats(selectedMatch.id);
    setScoreEvents((current) => current.filter((event) => event.matchId !== selectedMatch.id));
    setServingTeamIds((current) => {
      const next = { ...current };
      delete next[selectedMatch.id];
      return next;
    });
    setCourtLineups((current) => {
      const next = { ...current };
      delete next[courtLineupKey(selectedMatch.id, selectedMatch.teamAId)];
      delete next[courtLineupKey(selectedMatch.id, selectedMatch.teamBId)];
      return next;
    });
    setSelectedCourtPlayerId("");
    setDraggedCourtPlayerId("");
    setCourtActionPlayerId("");
  }

  async function undoLastScoreAction() {
    if (!selectedMatch) return;
    const lastEvent = [...scoreEvents].reverse().find((event) => event.matchId === selectedMatch.id);
    if (!lastEvent) return;

    const existing = statFor(data, lastEvent.matchId, lastEvent.teamId, lastEvent.playerId);
    const currentValue = existing?.[lastEvent.statKey] ?? 0;
    const nextValue = Math.max(0, currentValue - lastEvent.delta);

    await updateStat(lastEvent.matchId, lastEvent.teamId, lastEvent.playerId, lastEvent.statKey, nextValue);

    if (lastEvent.rotatedTeamId) {
      reverseRotateCourtLineup(lastEvent.matchId, lastEvent.rotatedTeamId);
    }
    if (lastEvent.previousServingTeamId) {
      setServingTeamIds((current) => ({ ...current, [lastEvent.matchId]: lastEvent.previousServingTeamId! }));
    }
    setScoreEvents((current) => {
      const targetIndex = current.findLastIndex((event) => event.id === lastEvent.id);
      if (targetIndex < 0) return current;
      return current.filter((_, index) => index !== targetIndex);
    });
  }

  function rotateForPoint(match: Match, scoringTeamId: string) {
    const previousServingTeamId = servingTeamIds[match.id] ?? match.teamAId;
    if (previousServingTeamId === scoringTeamId) {
      return { previousServingTeamId, rotatedTeamId: undefined };
    }

    rotateCourtLineup(match.id, scoringTeamId);
    setServingTeamIds((current) => ({ ...current, [match.id]: scoringTeamId }));
    return { previousServingTeamId, rotatedTeamId: scoringTeamId };
  }

  function rotateCourtLineup(matchId: string, teamId: string) {
    const lineupKey = courtLineupKey(matchId, teamId);
    setCourtLineups((current) => {
      const lineup = current[lineupKey];
      if (!lineup) return current;

      const nextLineup: CourtLineup = {};
      rotationOrder.forEach((position, index) => {
        const nextPosition = rotationOrder[(index + 1) % rotationOrder.length];
        if (lineup[position]) nextLineup[nextPosition] = lineup[position];
      });
      return { ...current, [lineupKey]: nextLineup };
    });
  }

  function reverseRotateCourtLineup(matchId: string, teamId: string) {
    const lineupKey = courtLineupKey(matchId, teamId);
    setCourtLineups((current) => {
      const lineup = current[lineupKey];
      if (!lineup) return current;

      const nextLineup: CourtLineup = {};
      rotationOrder.forEach((position, index) => {
        const previousPosition = rotationOrder[(index - 1 + rotationOrder.length) % rotationOrder.length];
        if (lineup[position]) nextLineup[previousPosition] = lineup[position];
      });
      return { ...current, [lineupKey]: nextLineup };
    });
  }

  const selectedMatchEvents = selectedMatch ? scoreEvents.filter((event) => event.matchId === selectedMatch.id) : [];

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
          YouTube video link
          <input
            placeholder="https://www.youtube.com/watch?v=..."
            type="url"
            value={form.videoUrl ?? ""}
            onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
          />
        </label>
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
            const collapsed = !expandedDates.has(group.date);

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
                      const score = calculatedMatchScore(data, match);

                      return (
                        <div className="match-row" key={match.id}>
                        <button
                          className="match-select match-record-main"
                          type="button"
                          onClick={() => selectMatchRecord(match)}
                        >
                          <span
                            className="match-score-line"
                            aria-label={`${displayTeam(teamA)} vs ${displayTeam(teamB)}`}
                          >
                            <b>{score.teamA}</b>
                            <TeamLogo team={teamA} />
                            <span className="match-versus">vs</span>
                            <TeamLogo team={teamB} />
                            <b>{score.teamB}</b>
                          </span>
                          <span className="match-remarks">{match.remarks || "No remarks"}</span>
                        </button>
                        <div className="match-record-footer">
                          <span className={`status status-${match.status}`}>{match.status.replace("_", " ")}</span>
                          <div className="match-record-actions">
                            <button type="button" onClick={() => startRecordStats(match)} title="Record player stats">
                              <ClipboardList size={16} />
                            </button>
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

      {isRecordingStats ? (
      <section className="section-block">
        <div className="section-heading">
          <h2>Record Player Stats</h2>
        </div>
        {selectedMatch ? (
          <>
            <button
              aria-label="Show score calculation details"
              className="match-context"
              type="button"
              onClick={() => setScoreDetailsOpen(true)}
            >
              <span className="match-live-team match-live-team-left" title={displayTeam(teamById(data, selectedMatch.teamAId))}>
                <TeamLogo team={teamById(data, selectedMatch.teamAId)} />
              </span>
              <div className="match-live-score" aria-label="Live score">
                <b className="team-a-score">{selectedMatchScore.teamA}</b>
                <span>:</span>
                <b className="team-b-score">{selectedMatchScore.teamB}</b>
              </div>
              <span className="match-live-team match-live-team-right" title={displayTeam(teamById(data, selectedMatch.teamBId))}>
                <TeamLogo team={teamById(data, selectedMatch.teamBId)} />
              </span>
              <span className={`status status-${selectedMatch.status}`}>{selectedMatch.status.replace("_", " ")}</span>
            </button>
            <p className="stat-match-remarks">{selectedMatch.remarks || "No remarks"}</p>
            <div className="stat-scoring-rule" aria-label="Scoring rules">
              <span>
                <b>ATK / BLK / ACE</b> own team +1
              </span>
              <span>
                <b>AE / SE / RE</b> opponent +1
              </span>
              <small>Each tap changes exactly 1 point.</small>
            </div>
            <div className="segmented">
              {[selectedMatch.teamAId, selectedMatch.teamBId].map((teamId) => (
                <button
                  className={teamId === activeTeamId ? "active" : ""}
                  key={teamId}
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(teamId);
                    setCourtActionPlayerId("");
                  }}
                >
                  {displayTeam(teamById(data, teamId))}
                </button>
              ))}
            </div>
            <div className="serving-team-control" aria-label="Serving team">
              <strong>Serving</strong>
              {[selectedMatch.teamAId, selectedMatch.teamBId].map((teamId) => (
                <button
                  className={teamId === servingTeamId ? "active" : ""}
                  key={teamId}
                  type="button"
                  onClick={() => setServingTeamIds((current) => ({ ...current, [selectedMatch.id]: teamId }))}
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
            <section className="court-lineup-card" aria-label="Court positions">
              <div className="court-lineup-heading">
                <div>
                  <h3>Court Positions</h3>
                  <p>{displayTeam(teamById(data, activeTeamId))}</p>
                </div>
                <span>{courtAssignedPlayerIds.size}/6</span>
              </div>
              <p className="court-rotation-note">
                Tap an on-court player to record ATK, ACE, SE, BLK, AE, or RE. Drag or select players below to fill the six positions.
              </p>
              {activePlayers.length > 0 && playingPlayers.length === 0 ? (
                <EmptyState title="No players selected" body="Select players above before placing them on court." />
              ) : null}
              <div className="court-board">
                {courtPositions.map((position) => {
                  const playerId = activeCourtLineup[position];
                  const player = playingPlayers.find((item) => item.id === playerId);

                  return (
                    <button
                      aria-label={`Position ${position}`}
                      className={`court-position court-position-${position} ${player ? "filled" : ""}`}
                      key={position}
                      type="button"
                      onClick={() => {
                        if (player) {
                          setCourtActionPlayerId(player.id);
                          return;
                        }
                        if (selectedCourtPlayerId) assignCourtPlayer(position, selectedCourtPlayerId);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => onCourtDrop(event, position)}
                    >
                      <b>{position}</b>
                      {player ? (
                        <span
                          draggable
                          onClick={(event) => {
                            event.stopPropagation();
                            setCourtActionPlayerId(player.id);
                          }}
                          onDragStart={(event) => {
                            setDraggedCourtPlayerId(player.id);
                            event.dataTransfer.setData("text/plain", player.id);
                          }}
                        >
                          {player.name}
                          <small>#{player.jerseyNumber} {player.position}</small>
                        </span>
                      ) : (
                        <em>{selectedCourtPlayerId ? "Tap to place" : "Add player"}</em>
                      )}
                    </button>
                  );
                })}
              </div>
              <div
                className="court-player-bench"
                onDragOver={(event) => event.preventDefault()}
                onDrop={onCourtBenchDrop}
              >
                <strong>Available Players</strong>
                {courtBenchPlayers.length === 0 ? (
                  <p>{playingPlayers.length === 0 ? "Select players above first." : "All selected players are on court."}</p>
                ) : (
                  <div>
                    {courtBenchPlayers.map((player) => (
                      <button
                        className={selectedCourtPlayerId === player.id ? "active" : ""}
                        draggable
                        key={player.id}
                        type="button"
                        onClick={() => setSelectedCourtPlayerId((current) => (current === player.id ? "" : player.id))}
                        onDragStart={(event) => {
                          setDraggedCourtPlayerId(player.id);
                          event.dataTransfer.setData("text/plain", player.id);
                        }}
                      >
                        {player.name}
                        <small>#{player.jerseyNumber} {player.position}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <EmptyState title="No match selected" body="Create or select a match to start entering stats." />
        )}
      </section>
      ) : null}
      {scoreDetailsOpen && selectedMatch ? (
        <ScoreDetailsDialog
          data={data}
          events={selectedMatchEvents}
          match={selectedMatch}
          onClose={() => setScoreDetailsOpen(false)}
          onReset={() => void resetSelectedMatch()}
          onUndo={() => void undoLastScoreAction()}
        />
      ) : null}
      {courtActionPlayer ? (
        <CourtActionDialog
          player={courtActionPlayer}
          onAction={(statKey) => void recordCourtPlayerAction(courtActionPlayer.id, statKey)}
          onClose={() => setCourtActionPlayerId("")}
        />
      ) : null}
    </PageShell>
  );
}

function normalizeMatch(input: MatchInput): MatchInput {
  return {
    ...input,
    teamAScore: Number(input.teamAScore ?? 0),
    teamBScore: Number(input.teamBScore ?? 0),
    videoUrl: input.videoUrl?.trim() || null
  };
}

function newMatchDefaults(): MatchInput {
  return {
    ...blankMatch,
    matchDate: todayIsoDate()
  };
}

function calculatedMatchScore(data: ReturnType<typeof useApp>["data"], match: Match) {
  const totals = comparisonTotalsForMatch(data, match);
  return {
    teamA: totals?.teamA.total ?? 0,
    teamB: totals?.teamB.total ?? 0
  };
}

function CourtActionDialog({
  player,
  onAction,
  onClose
}: {
  player: Player;
  onAction: (statKey: StatKey) => void;
  onClose: () => void;
}) {
  return (
    <div className="court-action-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label={`Record action for ${player.name}`}
        aria-modal="true"
        className="court-action-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="court-action-heading">
          <div>
            <span>Record point</span>
            <strong>{player.name}</strong>
            <small>
              #{player.jerseyNumber} {player.position}
            </small>
          </div>
          <button aria-label="Close action menu" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="court-action-grid">
          {courtActionKeys.map((key) => {
            const opponentPoint = isOpponentPointStat(key);
            return (
              <button
                className={opponentPoint ? "opponent-point" : "own-point"}
                key={key}
                type="button"
                onClick={() => onAction(key)}
              >
                <b>{statShortLabels[key]}</b>
                <span>{courtActionDescriptions[key]}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ScoreDetailsDialog({
  data,
  events,
  match,
  onClose,
  onReset,
  onUndo
}: {
  data: ReturnType<typeof useApp>["data"];
  events: ScoreEvent[];
  match: Match;
  onClose: () => void;
  onReset: () => void;
  onUndo: () => void;
}) {
  const teamA = teamById(data, match.teamAId);
  const teamB = teamById(data, match.teamBId);
  const rows = events.length > 0 ? liveScoreDetailRows(data, match, events) : scoreDetailRows(data, match);
  const score = calculatedMatchScore(data, match);

  return (
    <div className="score-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Score calculation details"
        aria-modal="true"
        className="score-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="score-dialog-heading">
          <div>
            <strong>
              {displayTeam(teamA)} {score.teamA} : {score.teamB} {displayTeam(teamB)}
            </strong>
            <span>Point Calculation</span>
          </div>
          <div className="score-dialog-actions">
            <button disabled={events.length === 0} type="button" className="score-dialog-undo" onClick={onUndo} title="Undo last action">
              <Undo2 size={17} />
              <span>Undo</span>
            </button>
            <button type="button" className="score-dialog-reset" onClick={onReset} title="Reset match stats">
              <RotateCcw size={17} />
              <span>Reset</span>
            </button>
            <button type="button" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <p className="score-dialog-note">
          {events.length > 0
            ? "ATK, BLK, ACE score for the player's team. AE, SE, RE score for the opponent. Each row is one tap only."
            : "ATK, BLK, ACE score for the player's team. AE, SE, RE score for the opponent."}
        </p>
        {rows.length === 0 ? (
          <EmptyState title="No points recorded" body="Record player stats to build the score details." />
        ) : (
          <div className="score-detail-list">
            {rows.map((row) => (
              <div className={`score-detail-row score-detail-row-${row.side}`} key={row.id}>
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.description}</span>
                </div>
                <b className={`score-sequence-${row.side}`}>{row.scoreAfter}</b>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function liveScoreDetailRows(data: ReturnType<typeof useApp>["data"], match: Match, events: ScoreEvent[]) {
  const finalScore = calculatedMatchScore(data, match);
  let teamAScore = finalScore.teamA;
  let teamBScore = finalScore.teamB;

  events.forEach((event) => {
    if (event.scoringTeamId === match.teamAId) teamAScore -= event.delta;
    if (event.scoringTeamId === match.teamBId) teamBScore -= event.delta;
  });

  return events.map((event, index) => {
    const teamName = displayTeam(teamById(data, event.scoringTeamId));
    const label = scoreEventLabel(data, event);
    if (event.scoringTeamId === match.teamAId) teamAScore += event.delta;
    if (event.scoringTeamId === match.teamBId) teamBScore += event.delta;

    return {
      id: event.id,
      title: `${label.code} - ${label.title}`,
      description:
        event.delta > 0
          ? `Point ${index + 1}: ${label.pointReason} to ${teamName}`
          : `Point ${index + 1}: correction removes point from ${teamName}`,
      scoreAfter: `${teamAScore}-${teamBScore}`,
      side: event.scoringTeamId === match.teamAId ? "team-a" : "team-b"
    };
  });
}

function scoreEventLabel(data: ReturnType<typeof useApp>["data"], event: ScoreEvent) {
  const player = data.players.find((item) => item.id === event.playerId);
  const playerName = player?.name ?? "Unknown player";

  switch (event.statKey) {
    case "attack":
      return { code: "ATK", title: `${playerName} attack score`, pointReason: "attack point" };
    case "block":
      return { code: "BLK", title: `${playerName} block score`, pointReason: "block point" };
    case "ace":
      return { code: "ACE", title: `${playerName} ace score`, pointReason: "ace point" };
    case "attackError":
      return { code: "AE", title: `${playerName} attack error`, pointReason: "opponent attack error point" };
    case "serveError":
      return { code: "SE", title: `${playerName} serve error`, pointReason: "opponent serve error point" };
    case "receiveError":
      return { code: "RE", title: `${playerName} receive error`, pointReason: "opponent receive error point" };
    case "dig":
      return { code: "DIG", title: `${playerName} dig`, pointReason: "no score" };
  }
}

function scoreDetailRows(data: ReturnType<typeof useApp>["data"], match: Match) {
  const teamAName = displayTeam(teamById(data, match.teamAId));
  const teamBName = displayTeam(teamById(data, match.teamBId));
  let teamAScore = 0;
  let teamBScore = 0;
  let sequence = 0;

  return data.matchStats
    .filter((stat) => stat.matchId === match.id)
    .flatMap((stat) => {
      const player = data.players.find((item) => item.id === stat.playerId);
      const playerName = player?.name ?? "Unknown player";
      const teamName = stat.teamId === match.teamAId ? teamAName : teamBName;
      const opponentName = stat.teamId === match.teamAId ? teamBName : teamAName;

      return [
        ...scoreRows(stat.attack, "ATK", `${playerName} attack score`, "attack point", teamName, stat.teamId),
        ...scoreRows(stat.block, "BLK", `${playerName} block score`, "block point", teamName, stat.teamId),
        ...scoreRows(stat.ace, "ACE", `${playerName} ace score`, "ace point", teamName, stat.teamId),
        ...scoreRows(
          stat.attackError,
          "AE",
          `${playerName} attack error`,
          "opponent attack error point",
          opponentName,
          oppositeTeamId(match, stat.teamId)
        ),
        ...scoreRows(
          stat.serveError,
          "SE",
          `${playerName} serve error`,
          "opponent serve error point",
          opponentName,
          oppositeTeamId(match, stat.teamId)
        ),
        ...scoreRows(
          stat.receiveError,
          "RE",
          `${playerName} receive error`,
          "opponent receive error point",
          opponentName,
          oppositeTeamId(match, stat.teamId)
        )
      ];
    });

  function scoreRows(
    count: number,
    code: string,
    title: string,
    pointReason: string,
    scoringTeamName: string,
    scoringTeamId: string | null
  ) {
    return Array.from({ length: count }, () => {
      sequence += 1;
      if (scoringTeamId === match.teamAId) teamAScore += 1;
      if (scoringTeamId === match.teamBId) teamBScore += 1;

      return {
        id: `${sequence}-${title}`,
        title: `${code} - ${title}`,
        description: `${pointReason} to ${scoringTeamName}`,
        scoreAfter: `${teamAScore}-${teamBScore}`,
        side: scoringTeamId === match.teamAId ? "team-a" : "team-b"
      };
    });
  }
}

function statUpdateKey(matchId: string, teamId: string, playerId: string, statKey: StatKey) {
  return `${matchId}:${teamId}:${playerId}:${statKey}`;
}

function courtLineupKey(matchId: string, teamId: string) {
  return `${matchId}:${teamId}`;
}

function scoringTeamForStat(match: Match, teamId: string, statKey: StatKey) {
  if (statKey === "attack" || statKey === "block" || statKey === "ace") return teamId;
  if (statKey === "attackError" || statKey === "serveError" || statKey === "receiveError") {
    return oppositeTeamId(match, teamId);
  }
  return null;
}

function isOpponentPointStat(statKey: StatKey) {
  return statKey === "attackError" || statKey === "serveError" || statKey === "receiveError";
}

function oppositeTeamId(match: Match, teamId: string) {
  if (teamId === match.teamAId) return match.teamBId;
  if (teamId === match.teamBId) return match.teamAId;
  return null;
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
