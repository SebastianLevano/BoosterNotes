import { supabase } from "./supabase";

export type SearchMatch = {
  id: string;
  title: string;
  snippet: string;
  rank: number;
  updated_at: string;
};

export type SearchResponse = {
  matches: SearchMatch[];
  synthesis: string;
};

export async function searchNotes(query: string): Promise<SearchResponse> {
  const { data, error } = await supabase.functions.invoke<SearchResponse>(
    "search-notes",
    { body: { query } },
  );
  if (error) throw error;
  if (!data) throw new Error("Respuesta vacía del servidor");
  return data;
}
