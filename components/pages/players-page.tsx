"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";

const playerPositions = ["OPEN", "MIDDLE BLOCKER", "SETTER", "SUBSET", "LIBERO", "COACH"];

const blankPlayer = {
  name: "",
  jerseyNumber: 1,
  position: "",
  archived: false,
  teamIds: [] as string[]
};

export function PlayersPage() {
  const { data, isAdmin, isLoading, createPlayer } = useApp();
  const router = useRouter();
  const [form, setForm] = useState(blankPlayer);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");

  const teams = useMemo(() => {
    return data.teams
      .filter((team) => !team.archived)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.teams]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await createPlayer(form, photo);
      setForm(blankPlayer);
      setPhoto(null);
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

  return (
    <PageShell title="Players">
      {isAdmin ? (
        <form className="form-panel" onSubmit={(event) => void submit(event)}>
          <div className="form-title">
            <h2>Create Player</h2>
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
            Add Player
          </button>
        </form>
      ) : null}

      <section
        aria-label="Teams"
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))"
        }}
      >
        {teams.length === 0 ? <EmptyState title="No teams found" body="Create a team before assigning players." /> : null}
        {teams.map((team) => (
          <Link
            aria-label={`Open ${team.name} players`}
            href={`/players/${team.id}`}
            key={team.id}
            rel="noopener noreferrer"
            style={{
              aspectRatio: "1",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              boxShadow: "0 1px 0 rgba(16, 24, 40, 0.02)",
              color: "var(--accent)",
              display: "grid",
              fontSize: 20,
              fontWeight: 950,
              minHeight: 88,
              overflow: "hidden",
              placeItems: "center"
            }}
            target="_blank"
            title={team.name}
          >
            {team.logoUrl ? (
              <img src={team.logoUrl} alt="" style={{ height: "100%", objectFit: "cover", width: "100%" }} />
            ) : (
              initials(team.name)
            )}
          </Link>
        ))}
      </section>
    </PageShell>
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
