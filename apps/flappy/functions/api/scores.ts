interface Env {
  DB: D1Database;
}

interface SubmitBody {
  player_name: string;
  score: number;
}

const MAX_NAME_LENGTH = 12;

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

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: SubmitBody;
  try {
    body = await request.json() as SubmitBody;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const { player_name, score } = body;

  if (!player_name || typeof player_name !== 'string') {
    return errorResponse('player_name is required');
  }

  const trimmedName = player_name.trim();
  if (trimmedName.length === 0 || trimmedName.length > MAX_NAME_LENGTH) {
    return errorResponse(`player_name must be 1-${MAX_NAME_LENGTH} characters`);
  }

  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0) {
    return errorResponse('score must be a non-negative integer');
  }

  if (score > 9999) {
    return errorResponse('score exceeds maximum allowed value');
  }

  try {
    const result = await env.DB
      .prepare(`INSERT INTO scores (player_name, score) VALUES (?, ?)`)
      .bind(trimmedName, score)
      .run();

    const insertedId = result.meta?.last_row_id;

    // Clean up: keep only the player's best score per calendar day.
    // Delete any lower scores from the same player on the same day.
    await env.DB
      .prepare(`
        DELETE FROM scores WHERE player_name = ? AND id != ? 
        AND DATE(created_at) = DATE('now')
        AND score <= ?
      `)
      .bind(trimmedName, insertedId, score)
      .run();

    // If this score is lower than an existing one today, remove this one instead
    await env.DB
      .prepare(`
        DELETE FROM scores WHERE player_name = ? AND id = ?
        AND EXISTS (
          SELECT 1 FROM scores WHERE player_name = ? AND id != ?
          AND DATE(created_at) = DATE('now') AND score > ?
        )
      `)
      .bind(trimmedName, insertedId, trimmedName, insertedId, score)
      .run();

    // Return the player's best score id for today
    const best = await env.DB
      .prepare(`SELECT id FROM scores WHERE player_name = ? AND DATE(created_at) = DATE('now') ORDER BY score DESC LIMIT 1`)
      .bind(trimmedName)
      .first<{ id: number }>();

    // Prune old scores: remove entries older than 1 month except the player's all-time best
    await env.DB
      .prepare(`
        DELETE FROM scores WHERE player_name = ? 
        AND created_at < datetime('now', '-1 month')
        AND id != (SELECT id FROM scores WHERE player_name = ? ORDER BY score DESC, created_at ASC LIMIT 1)
      `)
      .bind(trimmedName, trimmedName)
      .run();

    return jsonResponse({ success: true, id: best?.id ?? insertedId }, 201);
  } catch (err) {
    console.error('DB error:', err);
    return errorResponse('Internal server error', 500);
  }
};
