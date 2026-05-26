"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, Edit3, Plus, Trash2, Upload, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { playersForTeam, teamById } from "@/lib/data/selectors";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/domain";

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
        <section className="card-list">
          {players.length === 0 ? <EmptyState title="No players found" body="Add players to this team to show them here." /> : null}
          {players.map((player) => (
            <article className={cn("entity-card", player.archived && "muted-card")} key={player.id}>
              <div className="avatar">{player.photoUrl ? <img src={player.photoUrl} alt="" /> : player.jerseyNumber}</div>
              <div className="entity-main">
                <h2>{player.name}</h2>
                <p>
                  #{player.jerseyNumber} {player.position ? `- ${player.position}` : ""}
                </p>
                {player.archived ? <span className="status status-cancelled">archived</span> : null}
              </div>
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
        <GuestRosterTable players={players} />
      )}
    </PageShell>
  );
}

function GuestRosterTable({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return <EmptyState title="No players found" body="No players have been assigned to this team yet." />;
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: 8,
        marginInline: "auto",
        maxWidth: 430,
        overflow: "hidden",
        width: "100%"
      }}
    >
      <table style={{ borderCollapse: "collapse", tableLayout: "fixed", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ff0050" }}>
            <th style={guestRosterHeaderStyle}>No.</th>
            <th style={{ ...guestRosterHeaderStyle, textAlign: "left", width: "54%" }}>Player Name</th>
            <th style={guestRosterHeaderStyle}>Position</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={player.id} style={{ background: index % 2 === 0 ? "#fafafa" : "#f4f4f4" }}>
              <td style={{ ...guestRosterCellStyle, color: "#ff0050", fontWeight: 500 }}>{player.jerseyNumber}</td>
              <td style={{ ...guestRosterCellStyle, fontWeight: 850, textAlign: "left" }}>{player.name}</td>
              <td style={{ ...guestRosterCellStyle, fontWeight: 850 }}>{displayPosition(player.position)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const guestRosterHeaderStyle: React.CSSProperties = {
  color: "#8a8a8a",
  fontSize: 13,
  fontWeight: 500,
  height: 40,
  padding: "0 12px",
  textAlign: "center"
};

const guestRosterCellStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: 17,
  height: 46,
  padding: "0 12px",
  textAlign: "center",
  verticalAlign: "middle"
};

function displayPosition(position?: string | null) {
  if (!position) return "";
  return positionDisplayLabels[position] ?? position;
}
