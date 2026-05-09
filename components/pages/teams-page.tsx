"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, Edit3, ListFilter, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { playersForTeam } from "@/lib/data/selectors";
import { cn } from "@/lib/utils";
import type { Team } from "@/types/domain";

const blankTeam = { name: "", description: "", archived: false };

export function TeamsPage() {
  const { data, isAdmin, createTeam, updateTeam, archiveTeam, deleteTeam } = useApp();
  const [search, setSearch] = useState("");
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [selectedGuestTeam, setSelectedGuestTeam] = useState<Team | null>(null);
  const [form, setForm] = useState(blankTeam);
  const [logo, setLogo] = useState<File | null>(null);
  const [error, setError] = useState("");

  const teams = useMemo(() => {
    return data.teams
      .filter((team) => team.name.toLowerCase().includes(search.toLowerCase()))
      .filter((team) => {
        if (archiveFilter === "archived") return team.archived;
        if (archiveFilter === "all") return true;
        return !team.archived;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [archiveFilter, data.teams, search]);

  const guestTeamPlayers = useMemo(() => {
    if (!selectedGuestTeam) return [];
    return playersForTeam(data, selectedGuestTeam.id)
      .filter((player) => !player.archived)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, selectedGuestTeam]);

  useEffect(() => {
    if (!selectedGuestTeam) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedGuestTeam(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedGuestTeam]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (editing) {
        await updateTeam(editing.id, form, logo);
      } else {
        await createTeam(form, logo);
      }
      setEditing(null);
      setForm(blankTeam);
      setLogo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save team.");
    }
  }

  function startEdit(team: Team) {
    setEditing(team);
    setForm({
      name: team.name,
      description: team.description ?? "",
      archived: team.archived
    });
    setLogo(null);
  }

  return (
    <PageShell title="Teams">
      <div className="teams-toolbar">
        <label className="search-box">
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teams..." />
        </label>
        <div className="teams-filter">
          <button
            aria-expanded={filterOpen}
            aria-label="Filter teams"
            className={cn("teams-filter-button", filterOpen && "active")}
            onClick={() => setFilterOpen((current) => !current)}
            title="Filter teams"
            type="button"
          >
            <ListFilter size={16} />
          </button>
          {filterOpen ? (
            <div className="teams-filter-menu">
              {["active", "archived", "all"].map((option) => (
                <button
                  className={archiveFilter === option ? "active" : ""}
                  key={option}
                  onClick={() => {
                    setArchiveFilter(option);
                    setFilterOpen(false);
                  }}
                  type="button"
                >
                  {option === "all" ? "All" : option === "archived" ? "Archived" : "Active"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {isAdmin ? (
        <form className="form-panel" onSubmit={(event) => void submit(event)}>
          <div className="form-title">
            <h2>{editing ? "Edit Team" : "Create Team"}</h2>
            {editing ? (
              <button type="button" className="text-button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            ) : null}
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <label>
            Team name
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label className="file-input">
            <Upload size={16} />
            <span>{logo ? logo.name : "Upload team logo"}</span>
            <input accept="image/*" type="file" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} />
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
            {editing ? "Save Team" : "Add Team"}
          </button>
        </form>
      ) : null}

      <section className="team-card-grid">
        {teams.length === 0 ? <EmptyState title="No teams found" body="Try a different search or filter." /> : null}
        {teams.map((team) => (
          <article className={cn("team-tile", team.archived && "muted-card")} key={team.id}>
            {isAdmin ? (
              <Link
                aria-label={`Open ${team.name} players`}
                className="team-tile-trigger"
                href={`/players/${team.id}`}
                rel="noopener noreferrer"
                target="_blank"
                title={`${team.name} players`}
              >
                <TeamTileContent team={team} />
              </Link>
            ) : (
              <button
                aria-label={`Show ${team.name} players`}
                className="team-tile-trigger"
                onClick={() => setSelectedGuestTeam(team)}
                title={`${team.name} players`}
                type="button"
              >
                <TeamTileContent team={team} />
              </button>
            )}
            {isAdmin ? (
              <div className="team-tile-actions">
                <button type="button" onClick={() => startEdit(team)} title="Edit team">
                  <Edit3 size={16} />
                </button>
                <button type="button" onClick={() => void archiveTeam(team.id, !team.archived)} title="Archive team">
                  <Archive size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmAction(`Delete ${team.name}?`)) void deleteTeam(team.id);
                  }}
                  title="Delete team"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      {!isAdmin && selectedGuestTeam ? (
        <div className="modal-backdrop" onClick={() => setSelectedGuestTeam(null)}>
          <section
            aria-labelledby="guest-team-roster-title"
            aria-modal="true"
            className="modal-window roster-popup"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-header">
              <div className="roster-heading">
                <div className="avatar">
                  {selectedGuestTeam.logoUrl ? (
                    <img src={selectedGuestTeam.logoUrl} alt="" />
                  ) : (
                    initials(selectedGuestTeam.name)
                  )}
                </div>
                <div>
                  <h2 id="guest-team-roster-title">{selectedGuestTeam.name}</h2>
                  <p>{guestTeamPlayers.length} active players</p>
                </div>
              </div>
              <button
                aria-label="Close roster"
                className="icon-button"
                onClick={() => setSelectedGuestTeam(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="roster-list">
              {guestTeamPlayers.length === 0 ? (
                <EmptyState title="No players found" body="This team does not have an active roster yet." />
              ) : null}
              {guestTeamPlayers.map((player) => (
                <article className="roster-player" key={player.id}>
                  <div className="avatar">
                    {player.photoUrl ? <img src={player.photoUrl} alt="" /> : player.jerseyNumber}
                  </div>
                  <div>
                    <strong>{player.name}</strong>
                    <span>
                      #{player.jerseyNumber}
                      {player.position ? ` - ${player.position}` : ""}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}

function TeamTileContent({ team }: { team: Team }) {
  return (
    <>
      <span className="team-status-badge">{team.archived ? "INACTIVE" : "ACTIVE"}</span>
      <span className="team-logo-frame">{team.logoUrl ? <img src={team.logoUrl} alt="" /> : initials(team.name)}</span>
      <span className="team-tile-name">{team.name}</span>
    </>
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
