-- =============================================================
-- 0002: vista organizada + búsqueda full-text
-- - notes.organized_content: salida del agente que reestructura la nota
--   en jerarquía (regenerable, no destruye el contenido original)
-- - notes.organized_at: cuándo se generó por última vez
-- - notes.search_vector: tsvector generado en español, ponderado
-- - rpc search_user_notes(q): full-text search + ts_headline para snippets
-- =============================================================

alter table public.notes
  add column if not exists organized_content text,
  add column if not exists organized_at timestamptz;

-- ----- Full-text search ---------------------------------------
alter table public.notes
  add column if not exists search_vector tsvector
    generated always as (
      setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('spanish', coalesce(content, '')), 'B') ||
      setweight(to_tsvector('spanish', coalesce(organized_content, '')), 'C')
    ) stored;

create index if not exists notes_search_vector_idx
  on public.notes using gin (search_vector);

-- RPC: respeta RLS porque es SECURITY INVOKER (default).
-- Devuelve matches con ranking y un snippet con highlights <<…>>.
create or replace function public.search_user_notes(q text)
returns table (
  id uuid,
  title text,
  snippet text,
  rank real,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    n.id,
    n.title,
    ts_headline(
      'spanish',
      coalesce(n.title, '') || E'\n' || coalesce(n.content, '') ||
        E'\n' || coalesce(n.organized_content, ''),
      plainto_tsquery('spanish', q),
      'StartSel=<<,StopSel=>>,MaxWords=40,MinWords=15,ShortWord=3,MaxFragments=2'
    ) as snippet,
    ts_rank(n.search_vector, plainto_tsquery('spanish', q)) as rank,
    n.updated_at
  from public.notes n
  where n.search_vector @@ plainto_tsquery('spanish', q)
  order by rank desc, n.updated_at desc
  limit 25;
$$;
