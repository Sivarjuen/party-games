import type { Env, LeaderboardResponse, ScoreEntry } from './_shared';
import { jsonResponse, errorResponse, corsPreflightResponse, getTimeFilter, getTopScores, getPlayerRank } from './_shared';

const LEADERBOARD_LIMIT = 20;

export const onRequestOptions: PagesFunction<Env> = async () => {
  return corsPreflightResponse();
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
