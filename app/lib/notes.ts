import { supabase } from "./supabase";

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  organized_content: string | null;
  organized_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function getNote(id: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Note;
}

export async function createNote(): Promise<Note> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sin sesión");

  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: string },
): Promise<void> {
  const { error } = await supabase.from("notes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

export async function organizeNote(
  noteId: string,
  noteContent: string,
): Promise<{ organized_content: string }> {
  const { data, error } = await supabase.functions.invoke<{
    organized_content: string;
  }>("organize-note", { body: { noteId, noteContent } });
  if (error) throw error;
  if (!data) throw new Error("Respuesta vacía del servidor");
  return data;
}
