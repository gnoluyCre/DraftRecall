-- input: Supabase Postgres; output: DraftRecall relational schema; pos: production persistence, update this header and supabase/README.md when changed.
create extension if not exists "pgcrypto";

create type priority as enum ('P0', 'P1', 'P2');
create type schedule_mode as enum ('curve', 'manual');
create type card_status as enum ('active', 'cooling', 'due', 'graduated');
create type alarm_frequency as enum ('once', 'daily', 'weekdays', 'custom');
create type review_result as enum ('passed', 'failed', 'revealed');

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  priority priority not null,
  source_name text not null,
  source_type text not null check (source_type in ('txt', 'md', 'pdf')),
  content text not null,
  keywords text[] not null default '{}',
  questions text[] not null default '{}',
  question_items jsonb not null default '[]',
  parse_prompt text not null default '',
  grade_prompt text not null default '',
  schedule_mode schedule_mode not null default 'curve',
  active_window_start time not null default '08:00',
  active_window_end time not null default '22:00',
  stage int not null default 0 check (stage between 0 and 7),
  completed_rounds int not null default 0 check (completed_rounds between 0 and 7),
  reset_count int not null default 0,
  notifications_enabled boolean not null default true,
  next_review_at timestamptz not null,
  status card_status not null default 'cooling',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alarms (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  time_of_day time not null,
  frequency alarm_frequency not null default 'daily',
  weekdays int[] default '{}',
  enabled boolean not null default true,
  next_fire_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  session_id text,
  question text not null,
  question_index int,
  answer text not null,
  feedback text not null,
  result review_result not null,
  stage_before int not null,
  stage_after int not null,
  depth int not null default 1,
  score numeric,
  gaps text[] not null default '{}',
  key_points text[] not null default '{}',
  hit_points text[] not null default '{}',
  missed_points text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists warehouse (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null,
  user_id uuid,
  title text not null,
  priority priority not null,
  keywords text[] not null default '{}',
  domain text not null,
  rounds int not null default 7,
  report text not null,
  reset_count int not null default 0,
  questions text[] not null default '{}',
  mastered_questions text[] not null default '{}',
  graduated_at timestamptz not null default now()
);

create table if not exists ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  provider_name text not null,
  base_url text not null,
  encrypted_api_key text not null,
  model_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  global_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_priority_status_idx on cards(priority, status, next_review_at);
create index if not exists alarms_next_fire_idx on alarms(enabled, next_fire_at);
create index if not exists records_card_created_idx on records(card_id, created_at desc);
create index if not exists warehouse_domain_idx on warehouse(domain, graduated_at desc);
create index if not exists cards_reset_count_idx on cards(reset_count desc);
