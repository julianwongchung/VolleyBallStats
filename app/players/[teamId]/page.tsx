import { TeamPlayersPage } from "@/components/pages/team-players-page";

export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <TeamPlayersPage teamId={teamId} />;
}
