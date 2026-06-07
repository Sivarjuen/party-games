// Shared types and utilities for Pages Functions

export interface Env {
  DB: D1Database;
}

export interface ScoreEntry {
  id: number;
  player_name: string;
  score: number;
  created_at: string;
}

export interface SubmitBody {
  player_name: string;
  score: number;
}

export interface LeaderboardResponse {
  daily: ScoreEntry[];
  weekly: ScoreEntry[];
  monthly: ScoreEntry[];
  allTime: ScoreEntry[];
  playerRanks?: {
    daily: { rank: number; entry: ScoreEntry } | null;
    weekly: { rank: number; entry: ScoreEntry } | null;
    monthly: { rank: number; entry: ScoreEntry } | null;
    allTime: { rank: number; entry: ScoreEntry } | null;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function getTimeFilter(period: 'daily' | 'weekly' | 'monthly'): string {
  const now = new Date();
  let start: Date;

  switch (period) {
    case 'daily':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      break;
    case 'weekly': {
      const day = now.getUTCDay();
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
      break;
    }
    case 'monthly':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      break;
  }

  // Format as "YYYY-MM-DD HH:MM:SS" to match SQLite's datetime('now') format
  return start.toISOString().replace('T', ' ').replace('.000Z', '');
}

export async function getTopScores(db: D1Database, since: string | null, limit: number): Promise<ScoreEntry[]> {
  let query: string;
  let params: unknown[];

  if (since) {
    query = `SELECT id, player_name, MAX(score) as score, created_at FROM scores WHERE created_at >= ? GROUP BY player_name ORDER BY score DESC, created_at ASC LIMIT ?`;
    params = [since, limit];
  } else {
    query = `SELECT id, player_name, MAX(score) as score, created_at FROM scores GROUP BY player_name ORDER BY score DESC, created_at ASC LIMIT ?`;
    params = [limit];
  }

  const result = await db.prepare(query).bind(...params).all<ScoreEntry>();
  return result.results ?? [];
}

export async function getPlayerRank(
  db: D1Database,
  playerId: number,
  since: string | null
): Promise<{ rank: number; entry: ScoreEntry } | null> {
  // Get the player's entry to find their name
  const entry = await db.prepare(`SELECT id, player_name, score, created_at FROM scores WHERE id = ?`)
    .bind(playerId)
    .first<ScoreEntry>();

  if (!entry) return null;

  // Get the player's best score in the time period
  let bestQuery: string;
  let bestParams: unknown[];

  if (since) {
    bestQuery = `SELECT id, player_name, MAX(score) as score, created_at FROM scores WHERE player_name = ? AND created_at >= ?`;
    bestParams = [entry.player_name, since];
  } else {
    bestQuery = `SELECT id, player_name, MAX(score) as score, created_at FROM scores WHERE player_name = ?`;
    bestParams = [entry.player_name];
  }

  const best = await db.prepare(bestQuery).bind(...bestParams).first<ScoreEntry>();
  if (!best) return null;

  // Count how many players have a higher best score
  let countQuery: string;
  let countParams: unknown[];

  if (since) {
    countQuery = `SELECT COUNT(DISTINCT player_name) as rank FROM scores WHERE created_at >= ? AND score > ?`;
    countParams = [since, best.score];
  } else {
    countQuery = `SELECT COUNT(DISTINCT player_name) as rank FROM scores WHERE score > ?`;
    countParams = [best.score];
  }

  const result = await db.prepare(countQuery).bind(...countParams).first<{ rank: number }>();
  const rank = (result?.rank ?? 0) + 1;

  return { rank, entry: best };
}
