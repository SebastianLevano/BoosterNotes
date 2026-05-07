import { supabase } from "./supabase";

export type Citation = {
  title: string;
  url: string;
  snippet?: string;
};

export type ResearchResponse = {
  text: string;
  citations: Citation[];
};

export async function researchNote(
  noteId: string,
  noteContent: string,
  question: string,
): Promise<ResearchResponse> {
  const { data, error } = await supabase.functions.invoke<ResearchResponse>(
    "research-note",
    { body: { noteId, noteContent, question } },
  );
  if (error) throw error;
  if (!data) throw new Error("Respuesta vacía del servidor");
  return data;
}

export type AiMessageRow = {
  id: string;
  note_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  created_at: string;
};

export async function listAiMessages(noteId: string): Promise<AiMessageRow[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AiMessageRow[];
}

export async function deleteAiMessage(id: string): Promise<void> {
  const { error } = await supabase.from("ai_messages").delete().eq("id", id);
  if (error) throw error;
}

export async function clearAiMessages(noteId: string): Promise<void> {
  const { error } = await supabase
    .from("ai_messages")
    .delete()
    .eq("note_id", noteId);
  if (error) throw error;
}
