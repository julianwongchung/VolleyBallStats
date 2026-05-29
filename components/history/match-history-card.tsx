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
  const teamAWins = isWinningScore(match.teamAScore, match.teamBScore);
  const teamBWins = isWinningScore(match.teamBScore, match.teamAScore);

  return (
    <article className="history-card">
      <div className="history-teams">
        <HistoryTeam team={teamA} align="left" isWinner={teamAWins} />
        <div className="history-score">
          {match.remarks ? <p className="history-score-title">{match.remarks}</p> : null}
          <strong>
            {match.teamAScore ?? "-"} - {match.teamBScore ?? "-"}
          </strong>
          <span>Completed</span>
        </div>
        <HistoryTeam team={teamB} align="right" isWinner={teamBWins} />
      </div>
      <div className="history-meta">
        <span>{formatDate(match.matchDate)}</span>
        <div className="history-actions">
          <Link className="secondary-button compact-button" href={`/history/${match.id}`}>
            <Eye size={16} />
            View Details
          </Link>
          {isAdmin ? (
            <button
              aria-label="Delete match history"
              className="danger-button compact-icon-button"
              title="Delete match"
              type="button"
              onClick={onDelete}
            >
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function HistoryTeam({ team, align, isWinner }: { team?: Team; align: "left" | "right"; isWinner: boolean }) {
  return (
    <div className={`history-team history-team-${align}`}>
      <div className="history-logo">{team?.logoUrl ? <img src={team.logoUrl} alt="" /> : team?.name?.slice(0, 2)}</div>
      <div className="history-team-name">
        <strong>{team?.name ?? "Unknown"}</strong>
        {isWinner ? <span>WIN</span> : null}
      </div>
    </div>
  );
}

function isWinningScore(score: number | null | undefined, opponentScore: number | null | undefined) {
  return typeof score === "number" && typeof opponentScore === "number" && score >= 25 && score > opponentScore;
}
