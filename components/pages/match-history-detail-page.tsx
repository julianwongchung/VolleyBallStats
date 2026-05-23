"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Save, Share2, Trash2, Youtube } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { TeamStatsComparison } from "@/components/history/team-stats-comparison";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { comparisonTotalsForMatch, playerById } from "@/lib/data/selectors";
import { formatDate } from "@/lib/utils";
import type { MatchInput, MatchStatus } from "@/types/domain";

export function MatchHistoryDetailPage({ matchId }: { matchId: string }) {
  const router = useRouter();
  const { data, isAdmin, isLoading, updateMatch, deleteMatch } = useApp();
  const match = data.matches.find((item) => item.id === matchId);
  const comparison = useMemo(() => (match ? comparisonTotalsForMatch(data, match) : null), [data, match]);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
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

  async function shareMatch() {
    if (!match || !comparison) return;
    setShareStatus("");
    setIsSharing(true);
    try {
      const result = await shareMatchStats({
        comparison,
        matchDate: match.matchDate,
        remarks: match.remarks ?? "",
        url: window.location.href
      });
      setShareStatus(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setShareStatus("Share cancelled.");
        return;
      }
      setShareStatus(err instanceof Error ? err.message : "Unable to share match stats.");
    } finally {
      setIsSharing(false);
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
        ) : comparison ? (
          <button
            className="secondary-button compact-button"
            disabled={isSharing}
            type="button"
            onClick={() => void shareMatch()}
          >
            <Share2 size={16} />
            {isSharing ? "Sharing" : "Share"}
          </button>
        ) : null}
      </div>
      {!isAdmin && shareStatus ? <p className="share-status">{shareStatus}</p> : null}

      {comparison ? (
        <>
          <TeamStatsComparison
            playerNameFor={(playerId) => playerById(data, playerId)?.name ?? "Unknown player"}
            teamA={comparison.teamA}
            teamAStats={data.matchStats.filter((stat) => stat.matchId === match.id && stat.teamId === match.teamAId)}
            teamB={comparison.teamB}
            teamBStats={data.matchStats.filter((stat) => stat.matchId === match.id && stat.teamId === match.teamBId)}
          />
          {match.remarks ? <MatchRemarks remarks={match.remarks} /> : null}
          {match.videoUrl ? <MatchVideoEmbed url={match.videoUrl} /> : null}
        </>
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
            YouTube video link
            <input
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
              value={form.videoUrl ?? ""}
              onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
            />
          </label>
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
    remarks: match?.remarks ?? "",
    videoUrl: match?.videoUrl ?? ""
  };
}

function MatchRemarks({ remarks }: { remarks: string }) {
  return (
    <section className="match-detail-remarks" aria-label="Match remarks">
      <strong>Remarks</strong>
      <p>{remarks}</p>
    </section>
  );
}

function MatchVideoEmbed({ url }: { url: string }) {
  const embedUrl = getYouTubeEmbedUrl(url);

  return (
    <section className="match-video-card" aria-label="Match video">
      <div className="match-video-heading">
        <Youtube size={20} />
        <strong>Match Video</strong>
      </div>
      {embedUrl ? (
        <div className="match-video-frame">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedUrl}
            title="Match video"
          />
        </div>
      ) : null}
      <a href={url} target="_blank" rel="noreferrer">
        Watch on YouTube
        <ExternalLink size={16} />
      </a>
    </section>
  );
}

function getYouTubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);
    let videoId = "";

    if (host === "youtu.be") {
      videoId = pathParts[0] ?? "";
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (pathParts[0] === "embed" || pathParts[0] === "shorts" || pathParts[0] === "live") {
        videoId = pathParts[1] ?? "";
      } else {
        videoId = url.searchParams.get("v") ?? "";
      }
    }

    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

type MatchShareInput = {
  comparison: NonNullable<ReturnType<typeof comparisonTotalsForMatch>>;
  matchDate: string;
  remarks: string;
  url: string;
};

async function shareMatchStats({ comparison, matchDate, remarks, url }: MatchShareInput) {
  const file = await createMatchStatsImage({ comparison, matchDate, remarks });
  const title = `${comparison.teamA.team.name} vs ${comparison.teamB.team.name} Match Stats`;
  const text = `${title} - ${comparison.teamA.total}:${comparison.teamB.total}`;

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text });
    return "Share sheet opened.";
  }

  if (navigator.share) {
    await navigator.share({ title, text, url });
    return "Share sheet opened.";
  }

  downloadFile(file);
  return "Image downloaded. Share it in WhatsApp or Telegram.";
}

async function createMatchStatsImage({ comparison, matchDate, remarks }: Omit<MatchShareInput, "url">) {
  const canvas = document.createElement("canvas");
  const width = 1080;
  const height = remarks ? 1500 : 1360;
  const cardX = 48;
  const cardY = 48;
  const cardWidth = width - cardX * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create share image.");

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#f4f7fb";
  ctx.fillRect(0, 0, width, height);
  roundedRect(ctx, cardX, cardY, cardWidth, height - cardY * 2, 28, "#ffffff");

  ctx.textAlign = "center";
  drawText(ctx, "VolleyStats", width / 2, 124, 34, 900, "#147bd1");
  drawText(ctx, "MATCH STATS", width / 2, 190, 28, 900, "#667085");
  drawText(ctx, formatDate(matchDate), width / 2, 238, 22, 800, "#7b8494");

  drawTeamSummary(ctx, comparison.teamA.team.name, comparison.teamA.total, 210, 330, "left");
  drawTeamSummary(ctx, comparison.teamB.team.name, comparison.teamB.total, width - 210, 330, "right");

  const shareRows = [
    { label: "ATTACK", a: comparison.teamA.attack, b: comparison.teamB.attack },
    { label: "BLOCK", a: comparison.teamA.block, b: comparison.teamB.block },
    { label: "SERVE / ACE", a: comparison.teamA.ace, b: comparison.teamB.ace },
    { label: "OPPONENT ERROR", a: comparison.teamA.opponentError, b: comparison.teamB.opponentError },
    { label: "TOTAL", a: comparison.teamA.total, b: comparison.teamB.total }
  ];

  let y = 480;
  shareRows.forEach((row) => {
    drawShareStatRow(ctx, row.label, row.a, row.b, y);
    y += 160;
  });

  if (remarks) {
    drawText(ctx, "REMARKS", cardX + 56, y + 34, 24, 900, "#1f2937", "left");
    drawWrappedText(ctx, remarks, cardX + 56, y + 78, cardWidth - 112, 25, 2);
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Unable to create share image.");

  const filename = `${sanitizeFileName(comparison.teamA.team.name)}-vs-${sanitizeFileName(comparison.teamB.team.name)}.png`;
  return new File([blob], filename, { type: "image/png" });
}

function drawTeamSummary(
  ctx: CanvasRenderingContext2D,
  name: string,
  total: number,
  x: number,
  y: number,
  align: CanvasTextAlign
) {
  ctx.textAlign = align;
  const boxX = align === "left" ? x : x - 110;
  roundedRect(ctx, boxX, y - 86, 110, 110, 20, "#eef5f5", "#d9e4e6");
  drawText(ctx, getInitials(name), boxX + 55, y - 20, 34, 950, "#0f8f59");
  drawFittedText(ctx, name, x, y + 44, 340, 36, 24, 900, "#111827", align);
  drawText(ctx, `${total}`, x, y + 98, 30, 900, "#0f8f59", align);
}

function drawShareStatRow(ctx: CanvasRenderingContext2D, label: string, valueA: number, valueB: number, y: number) {
  roundedRect(ctx, 88, y, 904, 118, 20, "#fbfcfd");
  drawText(ctx, label, 540, y + 32, 24, 900, "#111827");

  const max = Math.max(valueA, valueB, 1);
  drawValueBox(ctx, valueA, 150, y + 72, valueA >= valueB);
  drawValueBox(ctx, valueB, 930, y + 72, valueB >= valueA);
  drawBar(ctx, 245, y + 72, 265, valueA / max, valueA >= valueB);
  drawBar(ctx, 570, y + 72, 265, valueB / max, valueB >= valueA);
}

function drawValueBox(ctx: CanvasRenderingContext2D, value: number, x: number, y: number, high: boolean) {
  roundedRect(ctx, x - 45, y - 27, 90, 54, 14, high ? "#0f8f59" : "#eef2f6");
  drawText(ctx, `${value}`, x, y + 9, 28, 950, high ? "#ffffff" : "#667085");
}

function drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, ratio: number, high: boolean) {
  roundedRect(ctx, x, y - 10, width, 20, 10, "#e8edf0");
  roundedRect(ctx, x, y - 10, Math.max(8, width * ratio), 20, 10, high ? "#0f8f59" : "#aeb7c2");
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  align: CanvasTextAlign = "center"
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  weight: number,
  color: string,
  align: CanvasTextAlign
) {
  let size = maxSize;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
  }
  drawText(ctx, text, x, y, size, weight, color, align);
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  ctx.fillStyle = "#667085";
  ctx.font = "800 24px Arial, sans-serif";
  ctx.textAlign = "left";
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((currentLine, index) => {
    ctx.fillText(index === maxLines - 1 && lines.length > maxLines ? `${currentLine}...` : currentLine, x, y + index * lineHeight);
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function getInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function sanitizeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}
