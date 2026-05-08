"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { TeamStatsComparison } from "@/components/history/team-stats-comparison";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { comparisonTotalsForMatch } from "@/lib/data/selectors";
import type { MatchInput, MatchStatus } from "@/types/domain";

export function MatchHistoryDetailPage({ matchId }: { matchId: string }) {
  const router = useRouter();
  const { data, isAdmin, isLoading, updateMatch, deleteMatch } = useApp();
  const match = data.matches.find((item) => item.id === matchId);
  const comparison = useMemo(() => (match ? comparisonTotalsForMatch(data, match) : null), [data, match]);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<MatchInput>(() => matchToInput(match));

  if (isLoading) {
    return (
      <PageShell title="MATCH TEAM STATS">
        <EmptyState title="Loading match" body="Preparing match history details." />
      </PageShell>
    );
  }

  if (!match) {
    return (
      <PageShell title="MATCH TEAM STATS">
        <Link className="secondary-button compact-button" href="/history">
          <ArrowLeft size={16} />
          Back to History
        </Link>
        <EmptyState title="Match not found" body="This match may have been deleted or is no longer available." />
      </PageShell>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await updateMatch(matchId, form);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update match.");
    }
  }

  return (
    <PageShell title="MATCH TEAM STATS">
      <div className="detail-toolbar">
        <Link className="secondary-button compact-button" href="/history">
          <ArrowLeft size={16} />
          Back
        </Link>
        {isAdmin ? (
          <div className="history-actions">
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={() => {
                setForm(matchToInput(match));
                setIsEditing((value) => !value);
              }}
            >
              Edit Match
            </button>
            <button
              className="danger-button compact-button"
              type="button"
              onClick={() => {
                if (confirmAction("Delete this match history and all related statistics?")) {
                  void deleteMatch(matchId).then(() => router.push("/history"));
                }
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        ) : null}
      </div>

      {comparison ? (
        <TeamStatsComparison teamA={comparison.teamA} teamB={comparison.teamB} />
      ) : (
        <EmptyState title="Missing team data" body="This match references a team that is not available." />
      )}

      {isAdmin && isEditing ? (
        <form className="form-panel" onSubmit={(event) => void submit(event)}>
          <div className="form-title">
            <h2>Edit Match Information</h2>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-grid">
            <label>
              Team A
              <select value={form.teamAId} required onChange={(event) => setForm({ ...form, teamAId: event.target.value })}>
                {data.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Team B
              <select value={form.teamBId} required onChange={(event) => setForm({ ...form, teamBId: event.target.value })}>
                {data.teams.map((team) => (
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
            <Save size={17} />
            Save Changes
          </button>
        </form>
      ) : null}
    </PageShell>
  );
}

function matchToInput(match: ReturnType<typeof useApp>["data"]["matches"][number] | undefined): MatchInput {
  return {
    teamAId: match?.teamAId ?? "",
    teamBId: match?.teamBId ?? "",
    matchDate: match?.matchDate ?? "",
    status: match?.status ?? "completed",
    teamAScore: match?.teamAScore ?? 0,
    teamBScore: match?.teamBScore ?? 0,
    remarks: match?.remarks ?? ""
  };
}
