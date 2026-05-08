import { MatchHistoryDetailPage } from "@/components/pages/match-history-detail-page";

export default async function Page({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <MatchHistoryDetailPage matchId={matchId} />;
}
