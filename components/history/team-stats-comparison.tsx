"use client";

import type { TeamComparisonTotals } from "@/lib/data/selectors";

const rows = [
  { key: "attack", label: "Attack" },
  { key: "block", label: "Block" },
  { key: "ace", label: "Serve / Ace" },
  { key: "opponentError", label: "Opponent Error" },
  { key: "total", label: "Total" }
] as const;

export function TeamStatsComparison({
  teamA,
  teamB
}: {
  teamA: TeamComparisonTotals;
  teamB: TeamComparisonTotals;
}) {
  return (
    <section className="comparison-panel" aria-label="Match team statistics comparison">
      <div className="comparison-header">
        <TeamHeader side="left" totals={teamA} />
        <div className="comparison-title">
          <span>Match Stats</span>
        </div>
        <TeamHeader side="right" totals={teamB} />
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

function TeamHeader({ totals, side }: { totals: TeamComparisonTotals; side: "left" | "right" }) {
  return (
    <div className={`comparison-team comparison-team-${side}`}>
      <div className="comparison-logo">
        {totals.team.logoUrl ? <img src={totals.team.logoUrl} alt="" /> : totals.team.name.slice(0, 2)}
      </div>
      <strong>{totals.team.name}</strong>
    </div>
  );
}
