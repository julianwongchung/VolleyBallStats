"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, Edit3, Plus, Trash2, Upload, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { playersForTeam, teamById, teamsForPlayer } from "@/lib/data/selectors";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/types/domain";

const playerPositions = ["OP", "MB", "SET", "SUB", "LB", "COACH"];
const positionDisplayLabels: Record<string, string> = {
  LIBERO: "LB",
  "MIDDLE BLOCKER": "MB",
  OPEN: "OP",
  SETTER: "SET",
  Set: "SET",
  SUBSET: "SUB"
};

const blankPlayer = {
  name: "",
  jerseyNumber: 1,
  position: "",
  archived: false,
  teamIds: [] as string[]
};

export function TeamPlayersPage({ teamId }: { teamId: string }) {
  const { data, isAdmin, createPlayer, updatePlayer, archivePlayer, deletePlayer } = useApp();
  const [editing, setEditing] = useState<Player | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...blankPlayer, teamIds: [teamId] });
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const team = teamById(data, teamId);

  const assignableTeams = useMemo(() => {
    return data.teams
      .filter((item) => !item.archived || item.id === teamId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.teams, teamId]);

  const players = useMemo(() => {
    return playersForTeam(data, teamId)
      .filter((player) => isAdmin || !player.archived)
      .sort(
        (a, b) =>
          Number(a.archived) - Number(b.archived) ||
          a.jerseyNumber - b.jerseyNumber ||
          a.name.localeCompare(b.name)
      );
  }, [data, isAdmin, teamId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const input = { ...form, teamIds: form.teamIds.includes(teamId) ? form.teamIds : [...form.teamIds, teamId] };
      if (editing) {
        await updatePlayer(editing.id, input, photo);
      } else {
        await createPlayer(input, photo);
      }
      setEditing(null);
      setFormOpen(false);
      setForm({ ...blankPlayer, teamIds: [teamId] });
      setPhoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save player.");
    }
  }

  function startEdit(player: Player) {
    setEditing(player);
    setForm({
      name: player.name,
      jerseyNumber: player.jerseyNumber,
      position: player.position ?? "",
      archived: player.archived,
      teamIds: data.playerTeams.filter((link) => link.playerId === player.id).map((link) => link.teamId)
    });
    setPhoto(null);
    setError("");
    setFormOpen(true);
  }

  function cancelEdit() {
    setEditing(null);
    setFormOpen(false);
    setForm({ ...blankPlayer, teamIds: [teamId] });
    setPhoto(null);
    setError("");
  }

  function startCreate() {
    setEditing(null);
    setForm({ ...blankPlayer, teamIds: [teamId] });
    setPhoto(null);
    setError("");
    setFormOpen(true);
  }

  function toggleTeam(nextTeamId: string) {
    if (nextTeamId === teamId) return;
    setForm((current) => ({
      ...current,
      teamIds: current.teamIds.includes(nextTeamId)
        ? current.teamIds.filter((id) => id !== nextTeamId)
        : [...current.teamIds, nextTeamId]
    }));
  }

  if (!team) {
    return (
      <PageShell title="Players">
        <EmptyState title="Team not found" body="Go back to Players and choose another team." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`${team.name} Players`}
      action={
        <>
          {isAdmin ? (
            <button className="primary-button" type="button" onClick={startCreate}>
              <Plus size={17} />
              Add Player
            </button>
          ) : null}
          <Link className="secondary-button" href={isAdmin ? "/players" : "/teams"}>
            Teams
          </Link>
        </>
      }
    >
      {isAdmin && formOpen ? (
        <div className="modal-backdrop" onClick={cancelEdit}>
          <section
            aria-labelledby="team-player-form-title"
            aria-modal="true"
            className="modal-window"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-header">
              <h2 id="team-player-form-title">{editing ? "Edit Player" : `Add ${team.name} Player`}</h2>
              <button aria-label="Close player form" className="icon-button" onClick={cancelEdit} type="button">
                <X size={18} />
              </button>
            </div>
            <form className="form-panel" onSubmit={(event) => void submit(event)}>
              {error ? <p className="form-error">{error}</p> : null}
              <div className="form-grid">
                <label>
                  Player name
                  <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </label>
                <label>
                  Jersey #
                  <input
                    max={99}
                    min={0}
                    required
                    type="number"
                    value={form.jerseyNumber}
                    onChange={(event) => setForm({ ...form, jerseyNumber: Number(event.target.value) })}
                  />
                </label>
              </div>
              <label>
                Position
                <select value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })}>
                  <option value="">Select position</option>
                  {form.position && !playerPositions.includes(form.position) ? (
                    <option value={form.position}>{form.position}</option>
                  ) : null}
                  {playerPositions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </label>
              <div className="check-grid" aria-label="Assigned teams">
                {assignableTeams.map((item) => (
                  <label key={item.id} className="checkbox-row">
                    <input
                      checked={form.teamIds.includes(item.id) || item.id === teamId}
                      disabled={item.id === teamId}
                      type="checkbox"
                      onChange={() => toggleTeam(item.id)}
                    />
                    {item.name}
                  </label>
                ))}
              </div>
              <label className="file-input">
                <Upload size={16} />
                <span>{photo ? photo.name : "Upload profile photo"}</span>
                <input accept="image/*" type="file" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
              </label>
              <label className="checkbox-row">
                <input
                  checked={form.archived}
                  type="checkbox"
                  onChange={(event) => setForm({ ...form, archived: event.target.checked })}
                />
                Archived
              </label>
              <button className="primary-button" type="submit">
                <Plus size={17} />
                {editing ? "Save Player" : "Add Player"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {isAdmin ? (
        <section className="player-list">
          {players.length === 0 ? <EmptyState title="No players found" body="Add players to this team to show them here." /> : null}
          {players.map((player) => (
            <article className={cn("player-list-row", player.archived && "muted-card")} key={player.id}>
              <strong className="player-jersey">{player.jerseyNumber}</strong>
              <div className="player-list-name">
                <strong>{player.name}</strong>
                {player.archived ? <span className="status status-cancelled">archived</span> : null}
              </div>
              <span className="player-position">{displayPosition(player.position) || "-"}</span>
              <PlayerTeamLogos teams={teamsForPlayer(data, player.id)} />
              <div className="row-actions">
                <button type="button" onClick={() => startEdit(player)} title="Edit player">
                  <Edit3 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => void archivePlayer(player.id, !player.archived)}
                  title={player.archived ? "Unarchive player" : "Archive player"}
                >
                  <Archive size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmAction(`Delete ${player.name}?`)) void deletePlayer(player.id);
                  }}
                  title="Delete player"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <GuestRosterList players={players} team={team} />
      )}
    </PageShell>
  );
}

function GuestRosterList({ players, team }: { players: Player[]; team: Team }) {
  if (players.length === 0) {
    return <EmptyState title="No players found" body="No players have been assigned to this team yet." />;
  }

  return (
    <section className="player-list guest-player-list">
      {players.map((player) => (
        <article className="player-list-row" key={player.id}>
          <strong className="player-jersey">{player.jerseyNumber}</strong>
          <div className="player-list-name">
            <strong>{player.name}</strong>
          </div>
          <span className="player-position">{displayPosition(player.position) || "-"}</span>
          <PlayerTeamLogos teams={[team]} />
        </article>
      ))}
    </section>
  );
}

function PlayerTeamLogos({ teams }: { teams: Team[] }) {
  if (teams.length === 0) return <span className="player-team-empty">No team</span>;

  return (
    <div className="player-team-logos" aria-label="Teams">
      {teams.map((team) => (
        <span className="player-team-logo" key={team.id} title={team.name} aria-label={team.name}>
          {team.logoUrl ? <img src={team.logoUrl} alt="" /> : initials(team.name)}
        </span>
      ))}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function displayPosition(position?: string | null) {
  if (!position) return "";
  return positionDisplayLabels[position] ?? position;
}
