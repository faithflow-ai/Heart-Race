-- Heart Race database schema (Postgres / Supabase).
-- The app runs this automatically on startup; it is safe to run more than once.

create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  role text not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists games (
  id text primary key,
  name text not null,
  code text not null unique,
  instructor_id text not null references users(id),
  status text not null default 'setup',          -- setup | active | done
  current_round int not null default 0,          -- round open for decisions (0 = practice, 7 = final, 8 = over)
  deadline timestamptz,                          -- when the current round processes
  deadline_weekday int not null default 0,       -- 0 = Sunday
  deadline_time text not null default '23:59',
  timezone text not null default 'America/Los_Angeles',
  seed int not null,
  settings jsonb not null default '{}'::jsonb,
  processing_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists firms (
  id text primary key,
  game_id text not null references games(id) on delete cascade,
  name text not null,
  slot int not null,
  is_ai boolean not null default false,
  ai_level real,                                 -- null = follow the default ramp
  ai_style text not null default 'premium'
);

create table if not exists members (
  user_id text not null references users(id) on delete cascade,
  game_id text not null references games(id) on delete cascade,
  firm_id text not null references firms(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table if not exists decisions (
  firm_id text not null references firms(id) on delete cascade,
  round int not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (firm_id, round)
);

create table if not exists change_log (
  id bigserial primary key,
  firm_id text not null references firms(id) on delete cascade,
  round int not null,
  user_id text not null,
  at timestamptz not null default now(),
  path text not null,
  old_value jsonb,
  new_value jsonb
);
create index if not exists change_log_firm_round on change_log (firm_id, round, at desc);

create table if not exists results (
  game_id text not null references games(id) on delete cascade,
  round int not null,
  data jsonb not null,
  processed_at timestamptz not null default now(),
  run_count int not null default 1,
  primary key (game_id, round)
);

create table if not exists research_reports (
  firm_id text not null references firms(id) on delete cascade,
  round int not null,
  study text not null,
  data jsonb not null,
  bought_by text,
  bought_at timestamptz not null default now(),
  primary key (firm_id, round, study)
);

-- Added Nov 2026: optional automatic start date (the deadline clock turns on at this time).
alter table games add column if not exists start_at timestamptz;

-- Added Nov 2026: self-service password reset (only used when email sending is set up).
create table if not exists password_resets (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- Added Nov 2026: creative work (links) submitted at milestones, graded by the instructor with a rubric.
create table if not exists creative_submissions (
  firm_id text not null references firms(id) on delete cascade,
  milestone text not null,
  links jsonb not null default '{}'::jsonb,
  note text not null default '',
  submitted_by text,
  submitted_at timestamptz,
  scores jsonb,
  feedback text not null default '',
  graded_at timestamptz,
  primary key (firm_id, milestone)
);

-- Start here progress for each student in a class (Nov 2026). Additive: existing rows default to nothing done.
alter table members add column if not exists onboarding jsonb not null default '{}'::jsonb;

-- Activity signals (Nov 2026): things the change log can't see, such as a large paste into a text box.
-- Used only for the instructor's unusual activity flags.
create table if not exists activity_signals (
  id bigserial primary key,
  firm_id text not null references firms(id) on delete cascade,
  round int not null,
  user_id text not null,
  at timestamptz not null default now(),
  kind text not null,
  detail jsonb
);
create index if not exists activity_signals_firm on activity_signals (firm_id, round);

-- Peer evaluation (Nov 2026): each student rates every teammate and themselves in each evaluation window.
-- Window dates, release and instructor overrides live in games.settings.peer.
create table if not exists peer_reviews (
  game_id text not null references games(id) on delete cascade,
  window_id text not null,
  firm_id text not null references firms(id) on delete cascade,
  rater_id text not null references users(id) on delete cascade,
  ratee_id text not null references users(id) on delete cascade,
  scores jsonb not null default '{}'::jsonb,
  well text not null default '',
  improve text not null default '',
  private_note text not null default '',
  submitted_at timestamptz not null default now(),
  primary key (game_id, window_id, rater_id, ratee_id)
);
