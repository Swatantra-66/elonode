-- ============================================================
-- Contest Rating System — PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE users (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT         NOT NULL,
    current_rating   INT          NOT NULL DEFAULT 1000,
    max_rating       INT          NOT NULL DEFAULT 1000,
    contests_played  INT          NOT NULL DEFAULT 0,
    tier             TEXT         NOT NULL DEFAULT 'Newbie'
                                  CHECK (tier IN ('Newbie','Apprentice','Specialist','Expert','Master','Grandmaster')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Contests ─────────────────────────────────────────────────
CREATE TABLE contests (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT         NOT NULL,
    date                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    total_participants  INT          NOT NULL DEFAULT 0,
    finalized           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Rating History ───────────────────────────────────────────
CREATE TABLE rating_histories (
    id                  BIGSERIAL    PRIMARY KEY,
    user_id             UUID         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    contest_id          UUID         NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    old_rating          INT          NOT NULL,
    new_rating          INT          NOT NULL,
    performance_rating  INT          NOT NULL,
    rank                INT          NOT NULL CHECK (rank >= 1),
    total_participants  INT          NOT NULL CHECK (total_participants >= 1),
    percentile          FLOAT        NOT NULL CHECK (percentile BETWEEN 0 AND 1),
    rating_change       INT          NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, contest_id)   -- one entry per user per contest
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_rating_histories_user_id    ON rating_histories(user_id);
CREATE INDEX idx_rating_histories_contest_id ON rating_histories(contest_id);
CREATE INDEX idx_users_current_rating        ON users(current_rating DESC);  -- leaderboard queries

-- ─── Leaderboard View (convenience) ──────────────────────────
CREATE VIEW leaderboard AS
SELECT
    u.id,
    u.name,
    u.current_rating,
    u.max_rating,
    u.tier,
    u.contests_played,
    RANK() OVER (ORDER BY u.current_rating DESC) AS global_rank
FROM users u;
