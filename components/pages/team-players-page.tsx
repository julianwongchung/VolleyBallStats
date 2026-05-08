"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, Edit3, Plus, Trash2, Upload } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { playersForTeam, teamById } from "@/lib/data/selectors";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/domain";

const playerPositions = ["OPEN", "MIDDLE BLOCKER", "SETTER", "SUBSET", "LIBERO", "COACH"];

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
  const [form, setForm] = useState({ ...blankPlayer, teamIds: [teamId] });
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const team = teamById(data, teamId);

  const players = useMemo(() => {
    return playersForTeam(data, teamId)
      .filter((player) => !player.archived)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, teamId]);

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
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ ...blankPlayer, teamIds: [teamId] });
    setPhoto(null);
    setError("");
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
        <Link className="secondary-button" href="/players">
          Teams
        </Link>
      }
    >
      {isAdmin ? (
        <form className="form-panel" onSubmit={(event) => void submit(event)}>
          <div className="form-title">
            <h2>{editing ? "Edit Player" : `Add ${team.name} Player`}</h2>
            {editing ? (
              <button type="button" className="text-button" onClick={cancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
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
      ) : null}

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
            </div>
            {isAdmin ? (
              <div className="row-actions">
                <button type="button" onClick={() => startEdit(player)} title="Edit player">
                  <Edit3 size={16} />
                </button>
                <button type="button" onClick={() => void archivePlayer(player.id, !player.archived)} title="Archive player">
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
            ) : null}
          </article>
        ))}
      </section>
    </PageShell>
  );
}
