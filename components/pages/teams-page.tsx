"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Edit3, ListFilter, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { playersForTeam } from "@/lib/data/selectors";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/domain";
import type { Team } from "@/types/domain";

const blankTeam = { name: "", description: "", archived: false };
const positionDisplayLabels: Record<string, string> = {
  LIBERO: "LB",
  "MIDDLE BLOCKER": "MB",
  OPEN: "OP",
  SETTER: "SET",
  Set: "SET",
  SUBSET: "SUB"
};

export function TeamsPage() {
  const { data, isAdmin, createTeam, updateTeam, archiveTeam, deleteTeam } = useApp();
  const [search, setSearch] = useState("");
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [selectedGuestTeam, setSelectedGuestTeam] = useState<Team | null>(null);
  const [form, setForm] = useState(blankTeam);
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);

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
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber || a.name.localeCompare(b.name));
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
        await updateTeam(editing.id, form, logo, removeLogo);
      } else {
        await createTeam(form, logo);
      }
      setEditing(null);
      setForm(blankTeam);
      setLogo(null);
      setRemoveLogo(false);
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
    setRemoveLogo(false);
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function cancelEdit() {
    setEditing(null);
    setForm(blankTeam);
    setLogo(null);
    setRemoveLogo(false);
    setError("");
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
        <form className="form-panel" onSubmit={(event) => void submit(event)} ref={formRef}>
          <div className="form-title">
            <h2>{editing ? "Edit Team" : "Create Team"}</h2>
            {editing ? (
              <button type="button" className="text-button" onClick={cancelEdit}>
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
            <input
              accept="image/*"
              type="file"
              onChange={(event) => {
                const nextLogo = event.target.files?.[0] ?? null;
                setLogo(nextLogo);
                if (nextLogo) setRemoveLogo(false);
              }}
            />
          </label>
          {editing ? (
            <div className="team-logo-edit">
              <div className="team-logo-edit-preview">
                {logo ? (
                  <span>{logo.name}</span>
                ) : editing.logoUrl && !removeLogo ? (
                  <img src={editing.logoUrl} alt="" />
                ) : (
                  <span>No logo</span>
                )}
              </div>
              <div>
                <strong>Current logo</strong>
                <p>{removeLogo ? "The logo will be removed when you save." : "Upload a new logo or remove the current one."}</p>
                {editing.logoUrl || logo ? (
                  <button
                    className="danger-button compact-button"
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      setRemoveLogo(true);
                    }}
                  >
                    <Trash2 size={15} />
                    Remove logo
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
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
            <button
              aria-label={`Show ${team.name} players`}
              className="team-tile-trigger"
              onClick={() => setSelectedGuestTeam(team)}
              title={`${team.name} players`}
              type="button"
            >
              <TeamTileContent team={team} />
            </button>
            {isAdmin ? (
              <div className="team-tile-actions">
                <button className="team-edit-button" type="button" onClick={() => startEdit(team)}>
                  <Edit3 size={16} />
                  <span>Edit</span>
                </button>
                <button
                  aria-label={team.archived ? "Restore team" : "Archive team"}
                  type="button"
                  onClick={() => void archiveTeam(team.id, !team.archived)}
                  title={team.archived ? "Restore team" : "Archive team"}
                >
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

      {selectedGuestTeam ? (
        <div className="modal-backdrop" onClick={() => setSelectedGuestTeam(null)}>
          <section
            aria-labelledby="guest-team-roster-title"
            aria-modal="true"
            className="modal-window roster-popup"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="roster-popup-header">
              <h2 id="guest-team-roster-title">{selectedGuestTeam.name} players</h2>
              <button
                aria-label="Close roster"
                className="icon-button"
                onClick={() => setSelectedGuestTeam(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <GuestRosterList players={guestTeamPlayers} />
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}

function TeamTileContent({ team }: { team: Team }) {
  return (
    <>
      <span className="team-logo-frame">{team.logoUrl ? <img src={team.logoUrl} alt="" /> : initials(team.name)}</span>
      <span className="team-tile-name">{team.name}</span>
    </>
  );
}

function GuestRosterList({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return <EmptyState title="No players found" body="This team does not have an active roster yet." />;
  }

  return (
    <section className="guest-roster-table">
      <div className="guest-roster-row guest-roster-head">
        <span>No.</span>
        <span>Player Name</span>
        <span>Position</span>
      </div>
      {players.map((player) => (
        <article className="guest-roster-row" key={player.id}>
          <strong className="guest-roster-number">{player.jerseyNumber}</strong>
          <strong className="guest-roster-name">{player.name}</strong>
          <strong className="guest-roster-position">{displayPosition(player.position) || "-"}</strong>
        </article>
      ))}
    </section>
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
