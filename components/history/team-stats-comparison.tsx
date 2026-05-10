"use client";

import { useState } from "react";
import { BarChart3, X } from "lucide-react";
import type { TeamComparisonTotals } from "@/lib/data/selectors";
import type { MatchStat } from "@/types/domain";
import { statKeys, statShortLabels } from "@/types/domain";

const rows = [
  { key: "attack", label: "Attack" },
  { key: "block", label: "Block" },
  { key: "ace", label: "Serve / Ace" },
  { key: "opponentError", label: "Opponent Error" },
  { key: "total", label: "Total" }
] as const;

export function TeamStatsComparison({
  teamA,
  teamAStats = [],
  teamB,
  teamBStats = [],
  playerNameFor
}: {
  teamA: TeamComparisonTotals;
  teamAStats?: MatchStat[];
  teamB: TeamComparisonTotals;
  teamBStats?: MatchStat[];
  playerNameFor: (playerId: string) => string;
}) {
  return (
    <section className="comparison-panel" aria-label="Match team statistics comparison">
      <div className="comparison-header">
        <TeamHeader playerNameFor={playerNameFor} side="left" stats={teamAStats} totals={teamA} />
        <div className="comparison-title">
          <span>Match Stats</span>
        </div>
        <TeamHeader playerNameFor={playerNameFor} side="right" stats={teamBStats} totals={teamB} />
      </div>

      <div className="comparison-rows">
        {rows.map((row) => {
          const valueA = teamA[row.key];
          const valueB = teamB[row.key];
          const max = Math.max(valueA, valueB, 1);
          const aHigher = valueA >= valueB;
          const bHigher = valueB >= valueA;

          return (
            <div className="comparison-row" key={row.key}>
              <div className="comparison-value-block left">
                <span className={`number-box ${aHigher ? "number-high" : "number-low"}`}>{valueA}</span>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${aHigher ? "bar-high" : "bar-low"}`}
                    style={{ width: `${(valueA / max) * 100}%` }}
                  />
                </div>
              </div>
              <strong>{row.label}</strong>
              <div className="comparison-value-block right">
                <span className={`number-box ${bHigher ? "number-high" : "number-low"}`}>{valueB}</span>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${bHigher ? "bar-high" : "bar-low"}`}
                    style={{ width: `${(valueB / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TeamHeader({
  totals,
  side,
  stats,
  playerNameFor
}: {
  totals: TeamComparisonTotals;
  side: "left" | "right";
  stats: MatchStat[];
  playerNameFor: (playerId: string) => string;
}) {
  const [showStats, setShowStats] = useState(false);
  const sortedStats = [...stats].sort((a, b) => {
    const pointsA = a.attack + a.block + a.ace;
    const pointsB = b.attack + b.block + b.ace;
    return pointsB - pointsA || playerNameFor(a.playerId).localeCompare(playerNameFor(b.playerId));
  });

  return (
    <div className={`comparison-team comparison-team-${side}`}>
      <div className="comparison-team-tools">
        <div className="comparison-logo">
          {totals.team.logoUrl ? <img src={totals.team.logoUrl} alt="" /> : totals.team.name.slice(0, 2)}
        </div>
        <div className={`player-stats-popover player-stats-popover-${side}`}>
          <button
            aria-expanded={showStats}
            className="icon-button compact-icon-button"
            title={`View ${totals.team.name} player stats`}
            type="button"
            onClick={() => setShowStats((value) => !value)}
          >
            <BarChart3 size={16} />
          </button>
          {showStats ? (
            <section className="player-stats-panel" aria-label={`${totals.team.name} player stats`}>
              <div className="player-stats-heading">
                <strong>{totals.team.name} Stats</strong>
                <button type="button" title="Close player stats" onClick={() => setShowStats(false)}>
                  <X size={16} />
                </button>
              </div>
              {sortedStats.length === 0 ? (
                <p className="player-stats-empty">No player stats recorded.</p>
              ) : (
                <div className="player-stats-table">
                  <div className="player-stats-row player-stats-head">
                    <span>Player</span>
                    {statKeys.map((key) => (
                      <span key={key}>{statShortLabels[key]}</span>
                    ))}
                    <span>PTS</span>
                  </div>
                  {sortedStats.map((stat) => (
                    <div className="player-stats-row" key={stat.id}>
                      <strong>{playerNameFor(stat.playerId)}</strong>
                      {statKeys.map((key) => (
                        <span key={key}>{stat[key]}</span>
                      ))}
                      <b>{stat.attack + stat.block + stat.ace}</b>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
      <strong>{totals.team.name}</strong>
    </div>
  );
}
