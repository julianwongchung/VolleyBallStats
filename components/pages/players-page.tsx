"use client";

import { useMemo, useState } from "react";
import { Archive, Edit3, Plus, Search, Trash2, Upload } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { teamsForPlayer } from "@/lib/data/selectors";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/domain";

const blankPlayer = {
  name: "",
  jerseyNumber: 1,
  position: "",
  archived: false,
  teamIds: [] as string[]
};

export function PlayersPage() {
  const { data, isAdmin, createPlayer, updatePlayer, archivePlayer, deletePlayer } = useApp();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState(blankPlayer);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");

  const players = useMemo(() => {
    return data.players
      .filter((player) => !player.archived)
      .filter((player) => player.name.toLowerCase().includes(search.toLowerCase()))
      .filter((player) =>
        teamFilter === "all" ? true : data.playerTeams.some((link) => link.playerId === player.id && link.teamId === teamFilter)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.playerTeams, data.players, search, teamFilter]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (editing) {
        await updatePlayer(editing.id, form, photo);
      } else {
        await createPlayer(form, photo);
      }
      setEditing(null);
      setForm(blankPlayer);
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

  function toggleTeam(teamId: string) {
    setForm((current) => ({
      ...current,
      teamIds: current.teamIds.includes(teamId)
        ? current.teamIds.filter((id) => id !== teamId)
        : [...current.teamIds, teamId]
    }));
  }

  return (
    <PageShell title="Players">
      <div className="toolbar">
        <label className="search-box">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search players" />
        </label>
        <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
          <option value="all">All teams</option>
          {data.teams
            .filter((team) => !team.archived)
            .map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
        </select>
      </div>

      {isAdmin ? (
        <form className="form-panel" onSubmit={(event) => void submit(event)}>
          <div className="form-title">
            <h2>{editing ? "Edit Player" : "Create Player"}</h2>
            {editing ? (
              <button type="button" className="text-button" onClick={() => setEditing(null)}>
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
            <input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
          </label>
          <div className="check-grid" aria-label="Assigned teams">
            {data.teams
              .filter((team) => !team.archived)
              .map((team) => (
                <label key={team.id} className="checkbox-row">
                  <input checked={form.teamIds.includes(team.id)} type="checkbox" onChange={() => toggleTeam(team.id)} />
                  {team.name}
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
      ) : null}

      <section className="card-list">
        {players.length === 0 ? <EmptyState title="No players found" body="Try a different player or team filter." /> : null}
        {players.map((player) => {
          const teams = teamsForPlayer(data, player.id);
          return (
            <article className={cn("entity-card", player.archived && "muted-card")} key={player.id}>
              <div className="avatar">{player.photoUrl ? <img src={player.photoUrl} alt="" /> : player.jerseyNumber}</div>
              <div className="entity-main">
                <h2>{player.name}</h2>
                <p>
                  #{player.jerseyNumber} {player.position ? `- ${player.position}` : ""}
                </p>
                <div className="chip-row">
                  {teams.map((team) => (
                    <span className="chip" key={team.id}>
                      {team.name}
                    </span>
                  ))}
                </div>
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
          );
        })}
      </section>
    </PageShell>
  );
}
