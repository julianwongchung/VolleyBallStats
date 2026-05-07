"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { seedData } from "@/data/seed-data";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { uid } from "@/lib/utils";
import type {
  AppData,
  Match,
  MatchInput,
  MatchStat,
  Player,
  PlayerInput,
  PlayerTeam,
  StatKey,
  Team,
  TeamInput
} from "@/types/domain";

type SessionState = {
  isConfigured: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  userEmail: string | null;
};

type AppContextValue = SessionState & {
  data: AppData;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginAsDemoAdmin: () => void;
  logout: () => Promise<void>;
  createTeam: (input: TeamInput, logo?: File | null) => Promise<void>;
  updateTeam: (id: string, input: TeamInput, logo?: File | null) => Promise<void>;
  archiveTeam: (id: string, archived: boolean) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  createPlayer: (input: PlayerInput, photo?: File | null) => Promise<void>;
  updatePlayer: (id: string, input: PlayerInput, photo?: File | null) => Promise<void>;
  archivePlayer: (id: string, archived: boolean) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  createMatch: (input: MatchInput) => Promise<void>;
  updateMatch: (id: string, input: MatchInput) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  updateStat: (matchId: string, teamId: string, playerId: string, key: StatKey, value: number) => Promise<void>;
};

const STORAGE_KEY = "volleystats-demo-data-v1";
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(seedData);
  const [session, setSession] = useState<SessionState>({
    isConfigured: isSupabaseConfigured,
    isAdmin: false,
    isLoading: true,
    userEmail: null
  });

  const supabase = useMemo(() => createClient(), []);

  const saveLocal = useCallback((nextData: AppData) => {
    setData(nextData);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    }
  }, []);

  const loadSupabaseData = useCallback(async () => {
    if (!supabase) return;

    const [teamsRes, playersRes, playerTeamsRes, matchesRes, statsRes] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("players").select("*").order("name"),
      supabase.from("player_teams").select("*"),
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
      supabase.from("match_stats").select("*")
    ]);

    const error =
      teamsRes.error || playersRes.error || playerTeamsRes.error || matchesRes.error || statsRes.error;
    if (error) throw new Error(error.message);

    setData({
      teams: (teamsRes.data ?? []).map(mapTeam),
      players: (playersRes.data ?? []).map(mapPlayer),
      playerTeams: (playerTeamsRes.data ?? []).map(mapPlayerTeam),
      matches: (matchesRes.data ?? []).map(mapMatch),
      matchStats: (statsRes.data ?? []).map(mapMatchStat)
    });
  }, [supabase]);

  const refreshAdmin = useCallback(
    async (email?: string | null) => {
      if (!supabase) return false;
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setSession((current) => ({ ...current, isAdmin: false, userEmail: null }));
        return false;
      }

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id,email")
        .eq("user_id", user.id)
        .maybeSingle();

      const isAdmin = Boolean(adminRow);
      setSession((current) => ({
        ...current,
        isAdmin,
        userEmail: email ?? user.email ?? null
      }));
      return isAdmin;
    },
    [supabase]
  );

  const refresh = useCallback(async () => {
    if (supabase) {
      await loadSupabaseData();
    }
  }, [loadSupabaseData, supabase]);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        if (supabase) {
          await refreshAdmin();
          await loadSupabaseData();
        } else if (typeof window !== "undefined") {
          const saved = window.localStorage.getItem(STORAGE_KEY);
          if (saved) setData(JSON.parse(saved) as AppData);
        }
      } catch (error) {
        console.warn("Using seeded fallback data because Supabase data could not be loaded.", error);
      } finally {
        if (active) {
          setSession((current) => ({ ...current, isLoading: false }));
        }
      }
    }

    boot();
    return () => {
      active = false;
    };
  }, [loadSupabaseData, refreshAdmin, supabase]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!email || !password) throw new Error("Email and password are required.");
      if (!supabase) {
        setSession({ isConfigured: false, isAdmin: true, isLoading: false, userEmail: email });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const isAdmin = await refreshAdmin(email);
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account is not listed in admin_users.");
      }
      await loadSupabaseData();
    },
    [loadSupabaseData, refreshAdmin, supabase]
  );

  const loginAsDemoAdmin = useCallback(() => {
    setSession({ isConfigured: false, isAdmin: true, isLoading: false, userEmail: "demo@local" });
  }, []);

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession((current) => ({ ...current, isAdmin: false, userEmail: null }));
  }, [supabase]);

  const replacePlayerTeams = useCallback(
    async (playerId: string, teamIds: string[]) => {
      if (!supabase) return;
      const { error: deleteError } = await supabase.from("player_teams").delete().eq("player_id", playerId);
      if (deleteError) throw new Error(deleteError.message);
      if (teamIds.length === 0) return;
      const { error } = await supabase
        .from("player_teams")
        .insert(teamIds.map((teamId) => ({ player_id: playerId, team_id: teamId })));
      if (error) throw new Error(error.message);
    },
    [supabase]
  );

  const uploadTeamLogo = useCallback(
    async (teamId: string, file: File) => {
      if (!supabase) return;
      const path = `${teamId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type
      });
      if (error) throw new Error(error.message);
      const { data: publicUrl } = supabase.storage.from("team-logos").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("teams")
        .update({ logo_path: path, logo_url: publicUrl.publicUrl })
        .eq("id", teamId);
      if (updateError) throw new Error(updateError.message);
    },
    [supabase]
  );

  const uploadPlayerPhoto = useCallback(
    async (playerId: string, file: File) => {
      if (!supabase) return;
      const path = `${playerId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("player-photos").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type
      });
      if (error) throw new Error(error.message);
      const { data: publicUrl } = supabase.storage.from("player-photos").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("players")
        .update({ photo_path: path, photo_url: publicUrl.publicUrl })
        .eq("id", playerId);
      if (updateError) throw new Error(updateError.message);
    },
    [supabase]
  );

  const createTeam = useCallback(
    async (input: TeamInput, logo?: File | null) => {
      requireName(input.name, "Team name");
      const timestamp = new Date().toISOString();

      if (supabase) {
        const { data: inserted, error } = await supabase
          .from("teams")
          .insert({
            name: input.name.trim(),
            description: input.description?.trim() || null,
            archived: Boolean(input.archived)
          })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        if (logo) await uploadTeamLogo(inserted.id, logo);
        await loadSupabaseData();
        return;
      }

      const team: Team = {
        id: uid("team"),
        name: input.name.trim(),
        description: input.description?.trim() || null,
        logoUrl: logo ? URL.createObjectURL(logo) : null,
        logoPath: null,
        archived: Boolean(input.archived),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      saveLocal({ ...data, teams: [...data.teams, team] });
    },
    [data, loadSupabaseData, saveLocal, supabase, uploadTeamLogo]
  );

  const updateTeam = useCallback(
    async (id: string, input: TeamInput, logo?: File | null) => {
      requireName(input.name, "Team name");
      if (supabase) {
        const patch: Record<string, unknown> = {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          archived: Boolean(input.archived),
          updated_at: new Date().toISOString()
        };
        const { error } = await supabase.from("teams").update(patch).eq("id", id);
        if (error) throw new Error(error.message);
        if (logo) await uploadTeamLogo(id, logo);
        await loadSupabaseData();
        return;
      }

      saveLocal({
        ...data,
        teams: data.teams.map((team) =>
          team.id === id
            ? {
                ...team,
                name: input.name.trim(),
                description: input.description?.trim() || null,
                archived: Boolean(input.archived),
                logoUrl: logo ? URL.createObjectURL(logo) : team.logoUrl,
                updatedAt: new Date().toISOString()
              }
            : team
        )
      });
    },
    [data, loadSupabaseData, saveLocal, supabase, uploadTeamLogo]
  );

  const archiveTeam = useCallback(
    async (id: string, archived: boolean) => {
      if (supabase) {
        const { error } = await supabase
          .from("teams")
          .update({ archived, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw new Error(error.message);
        await loadSupabaseData();
        return;
      }
      saveLocal({
        ...data,
        teams: data.teams.map((team) =>
          team.id === id ? { ...team, archived, updatedAt: new Date().toISOString() } : team
        )
      });
    },
    [data, loadSupabaseData, saveLocal, supabase]
  );

  const deleteTeam = useCallback(
    async (id: string) => {
      if (supabase) {
        const { error } = await supabase.from("teams").delete().eq("id", id);
        if (error) throw new Error(error.message);
        await loadSupabaseData();
        return;
      }
      saveLocal({
        ...data,
        teams: data.teams.filter((team) => team.id !== id),
        playerTeams: data.playerTeams.filter((link) => link.teamId !== id),
        matches: data.matches.filter((match) => match.teamAId !== id && match.teamBId !== id),
        matchStats: data.matchStats.filter((stat) => stat.teamId !== id)
      });
    },
    [data, loadSupabaseData, saveLocal, supabase]
  );

  const createPlayer = useCallback(
    async (input: PlayerInput, photo?: File | null) => {
      validatePlayer(input);
      const timestamp = new Date().toISOString();

      if (supabase) {
        const { data: inserted, error } = await supabase
          .from("players")
          .insert({
            name: input.name.trim(),
            jersey_number: input.jerseyNumber,
            position: input.position?.trim() || null,
            archived: Boolean(input.archived)
          })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        await replacePlayerTeams(inserted.id, input.teamIds);
        if (photo) await uploadPlayerPhoto(inserted.id, photo);
        await loadSupabaseData();
        return;
      }

      const playerId = uid("player");
      const player: Player = {
        id: playerId,
        name: input.name.trim(),
        jerseyNumber: input.jerseyNumber,
        position: input.position?.trim() || null,
        photoUrl: photo ? URL.createObjectURL(photo) : null,
        photoPath: null,
        archived: Boolean(input.archived),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const links = input.teamIds.map((teamId) => ({
        id: uid("pt"),
        playerId,
        teamId,
        createdAt: timestamp
      }));
      saveLocal({ ...data, players: [...data.players, player], playerTeams: [...data.playerTeams, ...links] });
    },
    [data, loadSupabaseData, replacePlayerTeams, saveLocal, supabase, uploadPlayerPhoto]
  );

  const updatePlayer = useCallback(
    async (id: string, input: PlayerInput, photo?: File | null) => {
      validatePlayer(input);
      if (supabase) {
        const { error } = await supabase
          .from("players")
          .update({
            name: input.name.trim(),
            jersey_number: input.jerseyNumber,
            position: input.position?.trim() || null,
            archived: Boolean(input.archived),
            updated_at: new Date().toISOString()
          })
          .eq("id", id);
        if (error) throw new Error(error.message);
        await replacePlayerTeams(id, input.teamIds);
        if (photo) await uploadPlayerPhoto(id, photo);
        await loadSupabaseData();
        return;
      }

      const timestamp = new Date().toISOString();
      const links = input.teamIds.map((teamId) => ({
        id: uid("pt"),
        playerId: id,
        teamId,
        createdAt: timestamp
      }));
      saveLocal({
        ...data,
        players: data.players.map((player) =>
          player.id === id
            ? {
                ...player,
                name: input.name.trim(),
                jerseyNumber: input.jerseyNumber,
                position: input.position?.trim() || null,
                archived: Boolean(input.archived),
                photoUrl: photo ? URL.createObjectURL(photo) : player.photoUrl,
                updatedAt: timestamp
              }
            : player
        ),
        playerTeams: [...data.playerTeams.filter((link) => link.playerId !== id), ...links]
      });
    },
    [data, loadSupabaseData, replacePlayerTeams, saveLocal, supabase, uploadPlayerPhoto]
  );

  const archivePlayer = useCallback(
    async (id: string, archived: boolean) => {
      if (supabase) {
        const { error } = await supabase
          .from("players")
          .update({ archived, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw new Error(error.message);
        await loadSupabaseData();
        return;
      }
      saveLocal({
        ...data,
        players: data.players.map((player) =>
          player.id === id ? { ...player, archived, updatedAt: new Date().toISOString() } : player
        )
      });
    },
    [data, loadSupabaseData, saveLocal, supabase]
  );

  const deletePlayer = useCallback(
    async (id: string) => {
      if (supabase) {
        const { error } = await supabase.from("players").delete().eq("id", id);
        if (error) throw new Error(error.message);
        await loadSupabaseData();
        return;
      }
      saveLocal({
        ...data,
        players: data.players.filter((player) => player.id !== id),
        playerTeams: data.playerTeams.filter((link) => link.playerId !== id),
        matchStats: data.matchStats.filter((stat) => stat.playerId !== id)
      });
    },
    [data, loadSupabaseData, saveLocal, supabase]
  );

  const createMatch = useCallback(
    async (input: MatchInput) => {
      validateMatch(input);
      const timestamp = new Date().toISOString();
      if (supabase) {
        const { error } = await supabase.from("matches").insert(toMatchRow(input));
        if (error) throw new Error(error.message);
        await loadSupabaseData();
        return;
      }
      const match: Match = {
        id: uid("match"),
        ...input,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      saveLocal({ ...data, matches: [match, ...data.matches] });
    },
    [data, loadSupabaseData, saveLocal, supabase]
  );

  const updateMatch = useCallback(
    async (id: string, input: MatchInput) => {
      validateMatch(input);
      if (supabase) {
        const { error } = await supabase
          .from("matches")
          .update({ ...toMatchRow(input), updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw new Error(error.message);
        await loadSupabaseData();
        return;
      }
      saveLocal({
        ...data,
        matches: data.matches.map((match) =>
          match.id === id ? { ...match, ...input, updatedAt: new Date().toISOString() } : match
        )
      });
    },
    [data, loadSupabaseData, saveLocal, supabase]
  );

  const deleteMatch = useCallback(
    async (id: string) => {
      if (supabase) {
        const { error } = await supabase.from("matches").delete().eq("id", id);
        if (error) throw new Error(error.message);
        await loadSupabaseData();
        return;
      }
      saveLocal({
        ...data,
        matches: data.matches.filter((match) => match.id !== id),
        matchStats: data.matchStats.filter((stat) => stat.matchId !== id)
      });
    },
    [data, loadSupabaseData, saveLocal, supabase]
  );

  const updateStat = useCallback(
    async (matchId: string, teamId: string, playerId: string, key: StatKey, value: number) => {
      const nextValue = Math.max(0, Number.isFinite(value) ? value : 0);
      const timestamp = new Date().toISOString();

      if (supabase) {
        const existing = data.matchStats.find(
          (stat) => stat.matchId === matchId && stat.teamId === teamId && stat.playerId === playerId
        );
        const row = toMatchStatRow({
          ...(existing ?? emptyStat(matchId, teamId, playerId)),
          [key]: nextValue,
          updatedAt: timestamp
        });
        const query = existing
          ? supabase.from("match_stats").update(row).eq("id", existing.id)
          : supabase.from("match_stats").insert(row);
        const { error } = await query;
        if (error) throw new Error(error.message);
        await loadSupabaseData();
        return;
      }

      const existing = data.matchStats.find(
        (stat) => stat.matchId === matchId && stat.teamId === teamId && stat.playerId === playerId
      );
      const nextStats = existing
        ? data.matchStats.map((stat) =>
            stat.id === existing.id ? { ...stat, [key]: nextValue, updatedAt: timestamp } : stat
          )
        : [
            ...data.matchStats,
            {
              ...emptyStat(matchId, teamId, playerId),
              id: uid("stat"),
              [key]: nextValue,
              createdAt: timestamp,
              updatedAt: timestamp
            }
          ];
      saveLocal({ ...data, matchStats: nextStats });
    },
    [data, loadSupabaseData, saveLocal, supabase]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ...session,
      data,
      refresh,
      login,
      loginAsDemoAdmin,
      logout,
      createTeam,
      updateTeam,
      archiveTeam,
      deleteTeam,
      createPlayer,
      updatePlayer,
      archivePlayer,
      deletePlayer,
      createMatch,
      updateMatch,
      deleteMatch,
      updateStat
    }),
    [
      archivePlayer,
      archiveTeam,
      createMatch,
      createPlayer,
      createTeam,
      data,
      deleteMatch,
      deletePlayer,
      deleteTeam,
      login,
      loginAsDemoAdmin,
      logout,
      refresh,
      session,
      updateMatch,
      updatePlayer,
      updateStat,
      updateTeam
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider.");
  return context;
}

function requireName(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required.`);
}

function validatePlayer(input: PlayerInput) {
  requireName(input.name, "Player name");
  if (!Number.isInteger(input.jerseyNumber) || input.jerseyNumber < 0 || input.jerseyNumber > 99) {
    throw new Error("Jersey number must be between 0 and 99.");
  }
  if (input.teamIds.length === 0) throw new Error("Assign at least one team.");
}

function validateMatch(input: MatchInput) {
  if (!input.teamAId || !input.teamBId) throw new Error("Choose both teams.");
  if (input.teamAId === input.teamBId) throw new Error("Team A and Team B must be different.");
  if (!input.matchDate) throw new Error("Match date is required.");
}

function emptyStat(matchId: string, teamId: string, playerId: string): MatchStat {
  const timestamp = new Date().toISOString();
  return {
    id: uid("stat"),
    matchId,
    teamId,
    playerId,
    attack: 0,
    block: 0,
    ace: 0,
    dig: 0,
    attackError: 0,
    serveError: 0,
    receiveError: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function mapTeam(row: Record<string, any>): Team {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    logoPath: row.logo_path,
    description: row.description,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPlayer(row: Record<string, any>): Player {
  return {
    id: row.id,
    name: row.name,
    jerseyNumber: row.jersey_number,
    photoUrl: row.photo_url,
    photoPath: row.photo_path,
    position: row.position,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPlayerTeam(row: Record<string, any>): PlayerTeam {
  return {
    id: row.id,
    playerId: row.player_id,
    teamId: row.team_id,
    createdAt: row.created_at
  };
}

function mapMatch(row: Record<string, any>): Match {
  return {
    id: row.id,
    teamAId: row.team_a_id,
    teamBId: row.team_b_id,
    matchDate: row.match_date,
    status: row.status,
    teamAScore: row.team_a_score,
    teamBScore: row.team_b_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMatchStat(row: Record<string, any>): MatchStat {
  return {
    id: row.id,
    matchId: row.match_id,
    teamId: row.team_id,
    playerId: row.player_id,
    attack: row.attack,
    block: row.block,
    ace: row.ace,
    dig: row.dig,
    attackError: row.attack_error,
    serveError: row.serve_error,
    receiveError: row.receive_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toMatchRow(input: MatchInput) {
  return {
    team_a_id: input.teamAId,
    team_b_id: input.teamBId,
    match_date: input.matchDate,
    status: input.status,
    team_a_score: input.teamAScore ?? null,
    team_b_score: input.teamBScore ?? null
  };
}

function toMatchStatRow(stat: MatchStat) {
  return {
    match_id: stat.matchId,
    team_id: stat.teamId,
    player_id: stat.playerId,
    attack: stat.attack,
    block: stat.block,
    ace: stat.ace,
    dig: stat.dig,
    attack_error: stat.attackError,
    serve_error: stat.serveError,
    receive_error: stat.receiveError,
    updated_at: stat.updatedAt
  };
}
