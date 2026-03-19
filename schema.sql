CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    current_rating INT NOT NULL DEFAULT 1000,
    max_rating INT NOT NULL DEFAULT 1000,
    contests_played INT NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'Newbie' CHECK (
        tier IN (
            'Newbie',
            'Apprentice',
            'Specialist',
            'Expert',
            'Master',
            'Grandmaster'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_participants INT NOT NULL DEFAULT 0,
    finalized BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contest_configs (
    contest_id UUID PRIMARY KEY REFERENCES contests (id) ON DELETE CASCADE,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    mode TEXT NOT NULL CHECK (mode IN ('same', 'random')),
    timer_secs INT NOT NULL CHECK (timer_secs > 0),
    problem_slug TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    problem_slug TEXT NOT NULL,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    checker_type TEXT NOT NULL DEFAULT 'standard' CHECK (
        checker_type IN ('standard', 'exact', 'token', 'float', 'unordered_lines')
    ),
    float_tolerance DOUBLE PRECISION NOT NULL DEFAULT 1e-6,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE team_contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'icpc_3v3',
    team_size INT NOT NULL DEFAULT 3 CHECK (team_size = 3),
    duration_sec INT NOT NULL DEFAULT 7200 CHECK (duration_sec > 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE team_contest_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    contest_id UUID NOT NULL REFERENCES team_contests (id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    team_number INT NOT NULL CHECK (team_number IN (1, 2)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (contest_id, team_number)
);

CREATE TABLE team_contest_members (
    id BIGSERIAL PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES team_contest_teams (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    is_captain BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, user_id)
);

CREATE TABLE team_contest_problems (
    id BIGSERIAL PRIMARY KEY,
    contest_id UUID NOT NULL REFERENCES team_contests (id) ON DELETE CASCADE,
    problem_slug TEXT NOT NULL,
    position INT NOT NULL CHECK (position >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (contest_id, problem_slug),
    UNIQUE (contest_id, position)
);

CREATE TABLE team_contest_submissions (
    id BIGSERIAL PRIMARY KEY,
    contest_id UUID NOT NULL REFERENCES team_contests (id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES team_contest_teams (id) ON DELETE CASCADE,
    problem_slug TEXT NOT NULL,
    verdict TEXT NOT NULL CHECK (verdict IN ('AC', 'WA', 'TLE', 'RE', 'CE')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rating_histories (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    contest_id UUID NOT NULL REFERENCES contests (id) ON DELETE CASCADE,
    old_rating INT NOT NULL,
    new_rating INT NOT NULL,
    performance_rating INT NOT NULL,
    rank INT NOT NULL CHECK (rank >= 1),
    total_participants INT NOT NULL CHECK (total_participants >= 1),
    percentile FLOAT NOT NULL CHECK (percentile BETWEEN 0 AND 1),
    rating_change INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, contest_id)
);

CREATE INDEX idx_rating_histories_user_id ON rating_histories (user_id);

CREATE INDEX idx_rating_histories_contest_id ON rating_histories (contest_id);

CREATE INDEX idx_test_cases_problem_slug ON test_cases (problem_slug);
CREATE INDEX idx_contest_configs_contest_id ON contest_configs (contest_id);
CREATE INDEX idx_team_contests_created_at ON team_contests (created_at DESC);
CREATE INDEX idx_team_contest_teams_contest_id ON team_contest_teams (contest_id);
CREATE INDEX idx_team_contest_members_team_id ON team_contest_members (team_id);
CREATE INDEX idx_team_contest_members_user_id ON team_contest_members (user_id);
CREATE INDEX idx_team_contest_problems_contest_id ON team_contest_problems (contest_id);
CREATE INDEX idx_team_contest_submissions_contest_id ON team_contest_submissions (contest_id);
CREATE INDEX idx_team_contest_submissions_team_id ON team_contest_submissions (team_id);
CREATE INDEX idx_team_contest_submissions_problem_slug ON team_contest_submissions (problem_slug);

CREATE INDEX idx_users_current_rating ON users (current_rating DESC);

CREATE VIEW leaderboard AS
SELECT u.id, u.name, u.current_rating, u.max_rating, u.tier, u.contests_played, RANK() OVER (
        ORDER BY u.current_rating DESC
    ) AS global_rank
FROM users u;
