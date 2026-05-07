"use client";

import Link from "next/link";
import { Award, CalendarCheck, Flame, ShieldCheck, Trophy, Users, UserRound } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { displayTeam, recentMatches, teamById, topByStat, topScorer } from "@/lib/data/selectors";
import { formatDate } from "@/lib/utils";
import { PageShell } from "@/components/ui/page-shell";

export function HomePage() {
  const { data } = useApp();
  const teams = data.teams.filter((team) => !team.archived);
  const players = data.players.filter((player) => !player.archived);
  const completedMatches = data.matches.filter((match) => match.status === "completed");
  const scorer = topScorer(data);
  const blocker = topByStat(data, "block");
  const totalAces = data.matchStats.reduce((sum, stat) => sum + stat.ace, 0);

  return (
    <PageShell title="Home">
      <section className="metric-grid">
        <Metric icon={<Users size={20} />} label="Teams" value={teams.length} />
        <Metric icon={<UserRound size={20} />} label="Players" value={players.length} />
        <Metric icon={<CalendarCheck size={20} />} label="Matches Played" value={completedMatches.length} />
        <Metric icon={<Flame size={20} />} label="Total Aces" value={totalAces} />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Recent Matches</h2>
          <Link href="/statistics">View stats</Link>
        </div>
        <div className="list-panel">
          {recentMatches(data.matches).map((match) => (
            <Link className="match-row" key={match.id} href="/statistics">
              <div>
                <small>{formatDate(match.matchDate)}</small>
                <strong>
                  {displayTeam(teamById(data, match.teamAId))} vs {displayTeam(teamById(data, match.teamBId))}
                </strong>
              </div>
              <div className="row-end">
                <span className={`status status-${match.status}`}>{match.status.replace("_", " ")}</span>
                <b>
                  {match.teamAScore ?? "-"} - {match.teamBScore ?? "-"}
                </b>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="summary-grid">
        <SummaryCard
          icon={<Trophy size={18} />}
          label="Top Scorer"
          name={scorer?.player.name ?? "No data"}
          value={scorer?.total ?? 0}
          unit="Pts"
        />
        <SummaryCard
          icon={<ShieldCheck size={18} />}
          label="Top Blocker"
          name={blocker?.player.name ?? "No data"}
          value={blocker?.total ?? 0}
          unit="Blocks"
        />
        <SummaryCard icon={<Award size={18} />} label="Total Aces" name="All players" value={totalAces} unit="Aces" />
      </section>
    </PageShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function SummaryCard({
  icon,
  label,
  name,
  value,
  unit
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value: number;
  unit: string;
}) {
  return (
    <article className="summary-card">
      <div className="summary-label">
        {icon}
        <span>{label}</span>
      </div>
      <strong>{name}</strong>
      <p>
        {value} <span>{unit}</span>
      </p>
    </article>
  );
}
