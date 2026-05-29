"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ChevronDown, ChevronRight, Edit3, Plus, Trash2, Upload, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { playersForTeam } from "@/lib/data/selectors";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/types/domain";

const playerPositions = ["OP", "MB", "SET", "SUB", "LB", "COACH"];

const blankPlayer = {
  name: "",
  jerseyNumber: 1,
  position: "",
  archived: false,
  teamIds: [] as string[]
};
const collapsedPlayerLimit = 4;

export function PlayersPage() {
  const { data, isAdmin, isLoading, createPlayer, updatePlayer, archivePlayer, deletePlayer } = useApp();
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState(blankPlayer);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [expandedTeamIds, setExpandedTeamIds] = useState<string[]>([]);

  const assignableTeams = useMemo(() => {
    return data.teams
      .filter((team) => !team.archived || form.teamIds.includes(team.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.teams, form.teamIds]);

  const groupedTeams = useMemo(() => {
    return [...data.teams].sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name));
  }, [data.teams]);

  const players = useMemo(() => {
    return data.players
      .filter((player) => isAdmin || !player.archived)
      .sort(
        (a, b) =>
          Number(a.archived) - Number(b.archived) ||
          a.name.localeCompare(b.name) ||
          a.jerseyNumber - b.jerseyNumber
      );
  }, [data.players, isAdmin]);

  const unassignedPlayers = useMemo(() => {
    const assignedPlayerIds = new Set(data.playerTeams.map((link) => link.playerId));
    return players.filter((player) => !assignedPlayerIds.has(player.id));
  }, [data.playerTeams, players]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (editing) {
        await updatePlayer(editing.id, form, photo);
      } else {
        await createPlayer(form, photo);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save player.");
    }
  }

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace("/teams");
  }, [isAdmin, isLoading, router]);

  if (!isLoading && !isAdmin) return null;

  function toggleTeam(teamId: string) {
    setForm((current) => ({
      ...current,
      teamIds: current.teamIds.includes(teamId)
        ? current.teamIds.filter((id) => id !== teamId)
        : [...current.teamIds, teamId]
    }));
  }

  function startCreate() {
    setEditing(null);
    setForm(blankPlayer);
    setPhoto(null);
    setError("");
    setFormOpen(true);
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

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(blankPlayer);
    setPhoto(null);
    setError("");
  }

  function toggleExpandedTeam(teamId: string) {
    setExpandedTeamIds((current) =>
      current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]
    );
  }

  return (
    <PageShell
      title="Players"
      action={
        isAdmin ? (
          <button className="primary-button" type="button" onClick={startCreate}>
            <Plus size={17} />
            Create Player
          </button>
        ) : null
      }
    >
      {isAdmin && formOpen ? (
        <div className="modal-backdrop" onClick={closeForm}>
          <section
            aria-labelledby="player-form-title"
            aria-modal="true"
            className="modal-window"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-header">
              <h2 id="player-form-title">{editing ? "Edit Player" : "Create Player"}</h2>
              <button aria-label="Close player form" className="icon-button" onClick={closeForm} type="button">
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
                {assignableTeams.map((team) => (
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
          </section>
        </div>
      ) : null}

      <section className="player-team-groups" style={{ marginBottom: 18 }}>
        {players.length === 0 ? <EmptyState title="No players found" body="Create a player to manage team assignments." /> : null}
        {groupedTeams.map((team) => {
          const teamPlayers = playersForTeam(data, team.id)
            .filter((player) => isAdmin || !player.archived)
            .sort(
              (a, b) =>
                Number(a.archived) - Number(b.archived) ||
                a.jerseyNumber - b.jerseyNumber ||
                a.name.localeCompare(b.name)
            );
          return (
            <PlayerTeamSection
              expanded={expandedTeamIds.includes(team.id)}
              key={team.id}
              onArchivePlayer={archivePlayer}
              onDeletePlayer={deletePlayer}
              onEditPlayer={startEdit}
              onToggleExpanded={() => toggleExpandedTeam(team.id)}
              players={teamPlayers}
              team={team}
            />
          );
        })}
        {unassignedPlayers.length > 0 ? (
          <PlayerTeamSection
            expanded={expandedTeamIds.includes("unassigned")}
            onArchivePlayer={archivePlayer}
            onDeletePlayer={deletePlayer}
            onEditPlayer={startEdit}
            onToggleExpanded={() => toggleExpandedTeam("unassigned")}
            players={unassignedPlayers}
            team={null}
          />
        ) : null}
      </section>

    </PageShell>
  );
}

function PlayerTeamSection({
  expanded,
  onArchivePlayer,
  onDeletePlayer,
  onEditPlayer,
  onToggleExpanded,
  players,
  team
}: {
  expanded: boolean;
  onArchivePlayer: (id: string, archived: boolean) => Promise<void>;
  onDeletePlayer: (id: string) => Promise<void>;
  onEditPlayer: (player: Player) => void;
  onToggleExpanded: () => void;
  players: Player[];
  team: Team | null;
}) {
  const visiblePlayers = expanded ? players : players.slice(0, collapsedPlayerLimit);
  const hasOverflow = players.length > collapsedPlayerLimit;

  return (
    <section className="player-team-section">
      <div className="player-team-section-header">
        <div className="player-team-title">
          <span className="player-team-logo large" title={team?.name ?? "Unassigned"} aria-label={team?.name ?? "Unassigned"}>
            {team?.logoUrl ? <img src={team.logoUrl} alt="" /> : initials(team?.name ?? "Unassigned")}
          </span>
          <div>
            <h2>{team?.name ?? "Unassigned"}</h2>
            <p>{players.length} players</p>
          </div>
        </div>
        {hasOverflow ? (
          <button className="secondary-button compact-button" type="button" onClick={onToggleExpanded}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {expanded ? "Show fewer" : `Show all ${players.length}`}
          </button>
        ) : null}
      </div>

      <div className="player-list">
        {players.length === 0 ? <EmptyState title="No players found" body="No players assigned to this team yet." /> : null}
        {visiblePlayers.map((player) => (
          <article className={cn("player-list-row", player.archived && "muted-card")} key={player.id}>
            <strong className="player-jersey">{player.jerseyNumber}</strong>
            <div className="player-list-name">
              <strong>{player.name}</strong>
              {player.archived ? <span className="status status-cancelled">archived</span> : null}
            </div>
            <span className="player-position">{player.position || "-"}</span>
            {team ? <PlayerTeamLogo team={team} /> : <span className="player-team-empty">No team</span>}
            <div className="row-actions">
              <button type="button" onClick={() => onEditPlayer(player)} title="Edit player">
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                onClick={() => void onArchivePlayer(player.id, !player.archived)}
                title={player.archived ? "Unarchive player" : "Archive player"}
              >
                <Archive size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction(`Delete ${player.name}?`)) void onDeletePlayer(player.id);
                }}
                title="Delete player"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlayerTeamLogo({ team }: { team: Team }) {
  return (
    <div className="player-team-logos" aria-label="Team">
      <span className="player-team-logo" title={team.name} aria-label={team.name}>
        {team.logoUrl ? <img src={team.logoUrl} alt="" /> : initials(team.name)}
      </span>
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
