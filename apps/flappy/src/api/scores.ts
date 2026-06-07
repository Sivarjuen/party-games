export interface ScoreEntry {
  id: number;
  player_name: string;
  score: number;
  created_at: string;
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

export interface SubmitResponse {
  success: boolean;
  id: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function submitScore(playerName: string, score: number): Promise<SubmitResponse> {
  const res = await fetch(`${API_BASE}/api/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_name: playerName, score }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error: string }).error ?? 'Failed to submit score');
  }

  return res.json() as Promise<SubmitResponse>;
}

export async function fetchLeaderboard(playerId?: number): Promise<LeaderboardResponse> {
  const params = playerId ? `?playerId=${playerId}` : '';
  const res = await fetch(`${API_BASE}/api/leaderboard${params}`);

  if (!res.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  return res.json() as Promise<LeaderboardResponse>;
}
