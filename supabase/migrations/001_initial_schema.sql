-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Sessions: each analysis/concept/vision run
create table public.sessions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  module        text not null check (module in ('analyze', 'concept', 'vision')),
  title         text,
  input_context text,
  output_type   text,
  image_urls    text[],
  result        jsonb not null,
  is_saved      boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Concept conversations: multi-turn messages
create table public.concept_messages (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid references public.sessions(id) on delete cascade,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  result_json   jsonb,
  created_at    timestamptz default now()
);

-- Saved prompts: individual prompts bookmarked from any result
create table public.saved_prompts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  session_id    uuid references public.sessions(id) on delete set null,
  platform      text not null,
  prompt_text   text not null,
  label         text,
  created_at    timestamptz default now()
);

-- RLS Policies
alter table public.sessions enable row level security;
alter table public.concept_messages enable row level security;
alter table public.saved_prompts enable row level security;

create policy "Users see own sessions"
  on public.sessions for all
  using (auth.uid() = user_id);

create policy "Users see messages in own sessions"
  on public.concept_messages for all
  using (
    exists (
      select 1 from public.sessions
      where id = concept_messages.session_id
      and user_id = auth.uid()
    )
  );

create policy "Users see own saved prompts"
  on public.saved_prompts for all
  using (auth.uid() = user_id);

-- Indexes
create index idx_sessions_user_id on public.sessions(user_id);
create index idx_sessions_module on public.sessions(module);
create index idx_sessions_created_at on public.sessions(created_at desc);
create index idx_saved_prompts_user_id on public.saved_prompts(user_id);
