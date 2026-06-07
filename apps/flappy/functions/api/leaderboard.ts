interface Env {
  DB: D1Database;
}

interface ScoreEntry {
  id: number;
  player_name: string;
  score: number;
  created_at: string;
}

interface LeaderboardResponse {
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

const LEADERBOARD_LIMIT = 20;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function getTimeFilter(period: 'daily' | 'weekly' | 'monthly'): string {
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

  return start.toISOString().replace('T', ' ').replace('.000Z', '');
}

async function getTopScores(db: D1Database, since: string | null, limit: number): Promise<ScoreEntry[]> {
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

async function getPlayerRank(
  db: D1Database,
  playerId: number,
  since: string | null
): Promise<{ rank: number; entry: ScoreEntry } | null> {
  const entry = await db.prepare(`SELECT id, player_name, score, created_at FROM scores WHERE id = ?`)
    .bind(playerId)
    .first<ScoreEntry>();

  if (!entry) return null;

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

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');

    const dailySince = getTimeFilter('daily');
    const weeklySince = getTimeFilter('weekly');
    const monthlySince = getTimeFilter('monthly');

    const [daily, weekly, monthly, allTime] = await Promise.all([
      getTopScores(env.DB, dailySince, LEADERBOARD_LIMIT),
      getTopScores(env.DB, weeklySince, LEADERBOARD_LIMIT),
      getTopScores(env.DB, monthlySince, LEADERBOARD_LIMIT),
      getTopScores(env.DB, null, LEADERBOARD_LIMIT),
    ]);

    const response: LeaderboardResponse = { daily, weekly, monthly, allTime };

    if (playerId) {
      const pid = parseInt(playerId, 10);
      if (!isNaN(pid)) {
        const isInTop = (list: ScoreEntry[]) => list.some(e => e.id === pid);

        const [dailyRank, weeklyRank, monthlyRank, allTimeRank] = await Promise.all([
          isInTop(daily) ? null : getPlayerRank(env.DB, pid, dailySince),
          isInTop(weekly) ? null : getPlayerRank(env.DB, pid, weeklySince),
          isInTop(monthly) ? null : getPlayerRank(env.DB, pid, monthlySince),
          isInTop(allTime) ? null : getPlayerRank(env.DB, pid, null),
        ]);

        response.playerRanks = {
          daily: dailyRank,
          weekly: weeklyRank,
          monthly: monthlyRank,
          allTime: allTimeRank,
        };
      }
    }

    return jsonResponse(response);
  } catch (err) {
    console.error('Leaderboard error:', err);
    return errorResponse('Internal server error', 500);
  }
};
