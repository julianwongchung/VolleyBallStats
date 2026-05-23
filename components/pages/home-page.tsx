"use client";

import Link from "next/link";
import { Award, CalendarCheck, Flame, ShieldCheck, Trophy, Users, UserRound } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { displayTeam, recentMatches, teamById, topByStat, topScorer } from "@/lib/data/selectors";
import { formatDateBadge } from "@/lib/utils";
import { PageShell } from "@/components/ui/page-shell";
import type { Match, Team } from "@/types/domain";

export function HomePage() {
  const { data } = useApp();
  const teams = data.teams.filter((team) => !team.archived);
  const players = data.players.filter((player) => !player.archived);
  const completedMatches = data.matches.filter((match) => match.status === "completed");
  const scorer = topScorer(data);
  const blocker = topByStat(data, "block");
  const totalAces = data.matchStats.reduce((sum, stat) => sum + stat.ace, 0);
  const upcomingMatches = recentMatches(data.matches.filter((match) => match.status !== "completed"));
  const recentCompletedMatches = recentMatches(data.matches.filter((match) => match.status === "completed"));

  return (
    <PageShell title="Home">
      <section className="metric-grid">
        <Metric icon={<Users size={20} />} label="Teams" value={teams.length} />
        <Metric icon={<UserRound size={20} />} label="Players" value={players.length} />
        <Metric icon={<CalendarCheck size={20} />} label="Matches Played" value={completedMatches.length} />
        <Metric icon={<Flame size={20} />} label="Total Aces" value={totalAces} />
      </section>

      <section className="section-block">
        <div className="section-heading home-recent-heading">
          <div>
            <h2>Recent & Upcoming</h2>
            <p>Latest volleyball matches</p>
          </div>
          <Link href="/statistics">View stats</Link>
        </div>
        <HomeMatchGroup
          emptyText="No upcoming matches yet."
          matches={upcomingMatches}
          title="Upcoming Match"
          teams={data.teams}
        />
        <HomeMatchGroup
          emptyText="No completed matches yet."
          matches={recentCompletedMatches}
          title="Completed Match"
          teams={data.teams}
        />
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

function HomeMatchGroup({
  emptyText,
  matches,
  teams,
  title
}: {
  emptyText: string;
  matches: Match[];
  teams: Team[];
  title: string;
}) {
  return (
    <div className="home-match-group">
      <h3>{title}</h3>
      <div className="home-recent-list">
        {matches.length === 0 ? <p className="home-recent-empty">{emptyText}</p> : null}
        {matches.map((match) => {
          const teamA = teams.find((team) => team.id === match.teamAId);
          const teamB = teams.find((team) => team.id === match.teamBId);
          return <HomeMatchCard key={match.id} match={match} teamA={teamA} teamB={teamB} />;
        })}
      </div>
    </div>
  );
}

function HomeMatchCard({ match, teamA, teamB }: { match: Match; teamA?: Team; teamB?: Team }) {
  const isCompleted = match.status === "completed";
  const dateParts = formatMatchCardDate(match.matchDate);
  const scoreA = match.teamAScore ?? 0;
  const scoreB = match.teamBScore ?? 0;
  const content = (
    <>
      <div className="home-match-main">
        <span className={`status home-recent-status status-${match.status}`}>{match.status.replace("_", " ")}</span>
        <HomeMatchTeam team={teamA} />
        <span className="home-match-vs">vs</span>
        <HomeMatchTeam team={teamB} />
      </div>
      <div className={`home-match-side ${isCompleted ? "home-match-side-completed" : "home-match-side-scheduled"}`}>
        {isCompleted ? (
          <>
            <strong>{scoreA}</strong>
            <strong className="muted-score">{scoreB}</strong>
          </>
        ) : (
          <>
            <strong>{dateParts.day}</strong>
            <span>{dateParts.month}</span>
            <small>{dateParts.time}</small>
          </>
        )}
      </div>
    </>
  );

  if (!isCompleted) return <article className="home-recent-card home-recent-card-static">{content}</article>;

  return (
    <Link className="home-recent-card" href={`/history/${match.id}`}>
      {content}
    </Link>
  );
}

function HomeMatchTeam({ team }: { team?: Team }) {
  return (
    <div className="home-match-team">
      <span className="home-match-logo">{team?.logoUrl ? <img src={team.logoUrl} alt="" /> : initials(team?.name)}</span>
      <strong>{displayTeam(team)}</strong>
    </div>
  );
}

function initials(name?: string) {
  return (name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatMatchCardDate(value: string) {
  return formatDateBadge(value);
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
