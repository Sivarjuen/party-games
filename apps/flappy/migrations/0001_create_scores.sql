-- Create the scores table
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for leaderboard queries (score descending, time ascending for tiebreak)
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores (score DESC, created_at ASC);

-- Index for time-based filtering
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores (created_at DESC);
