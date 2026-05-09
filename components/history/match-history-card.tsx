"use client";

import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import type { Match, Team } from "@/types/domain";
import { formatDate } from "@/lib/utils";

export function MatchHistoryCard({
  match,
  teamA,
  teamB,
  isAdmin,
  onDelete
}: {
  match: Match;
  teamA?: Team;
  teamB?: Team;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  return (
    <article className="history-card">
      <div className="history-teams">
        <HistoryTeam team={teamA} align="left" />
        <div className="history-score">
          <strong>
            {match.teamAScore ?? "-"} - {match.teamBScore ?? "-"}
          </strong>
          <span>Completed</span>
        </div>
        <HistoryTeam team={teamB} align="right" />
      </div>
      <div className="history-meta">
        <span>{formatDate(match.matchDate)}</span>
        <div className="history-actions">
          <Link className="secondary-button compact-button" href={`/history/${match.id}`}>
            <Eye size={16} />
            View Details
          </Link>
          {isAdmin ? (
            <button className="danger-button compact-button" type="button" onClick={onDelete}>
              <Trash2 size={16} />
              Delete
            </button>
          ) : null}
        </div>
      </div>
      {match.remarks ? (
        <p className="history-remarks">
          <strong>Remarks</strong>
          {match.remarks}
        </p>
      ) : null}
    </article>
  );
}

function HistoryTeam({ team, align }: { team?: Team; align: "left" | "right" }) {
  return (
    <div className={`history-team history-team-${align}`}>
      <div className="history-logo">{team?.logoUrl ? <img src={team.logoUrl} alt="" /> : team?.name?.slice(0, 2)}</div>
      <strong>{team?.name ?? "Unknown"}</strong>
    </div>
  );
}
