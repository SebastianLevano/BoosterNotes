-- =============================================================
-- BoosterAi: schema inicial
-- - notes: notas de clase del usuario
-- - ai_messages: historial de interacción con el agente IA
-- =============================================================

create extension if not exists "pgcrypto";

-- ----- notes -------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nueva nota',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_updated_at_idx
  on public.notes (user_id, updated_at desc);

-- Trigger para mantener updated_at al día
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ----- ai_messages -------------------------------------------
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create index ai_messages_note_id_created_at_idx
  on public.ai_messages (note_id, created_at asc);

-- ----- Row Level Security ------------------------------------
alter table public.notes enable row level security;
alter table public.ai_messages enable row level security;

create policy "users select own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "users insert own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "users update own notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

create policy "users select own ai_messages"
  on public.ai_messages for select
  using (
    exists (
      select 1 from public.notes
      where notes.id = ai_messages.note_id
        and notes.user_id = auth.uid()
    )
  );

create policy "users insert own ai_messages"
  on public.ai_messages for insert
  with check (
    exists (
      select 1 from public.notes
      where notes.id = ai_messages.note_id
        and notes.user_id = auth.uid()
    )
  );

create policy "users delete own ai_messages"
  on public.ai_messages for delete
  using (
    exists (
      select 1 from public.notes
      where notes.id = ai_messages.note_id
        and notes.user_id = auth.uid()
    )
  );
