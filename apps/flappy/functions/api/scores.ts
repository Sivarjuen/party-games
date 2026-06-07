import type { Env, SubmitBody } from './_shared';
import { jsonResponse, errorResponse, corsPreflightResponse } from './_shared';

const MAX_NAME_LENGTH = 12;

export const onRequestOptions: PagesFunction<Env> = async () => {
  return corsPreflightResponse();
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
    return jsonResponse({ success: true, id: insertedId }, 201);
  } catch (err) {
    console.error('DB error:', err);
    return errorResponse('Internal server error', 500);
  }
};
