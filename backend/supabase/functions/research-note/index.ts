// Edge Function: research-note
// Recibe { noteId, noteContent, question } del cliente autenticado, llama a la
// Responses API de OpenAI con la herramienta web_search activada, persiste el
// par usuario/asistente en ai_messages y devuelve { text, citations }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import OpenAI from "https://esm.sh/openai@4.104.0";

type ResearchRequest = {
  noteId: string;
  noteContent: string;
  question: string;
};

type Citation = {
  title: string;
  url: string;
  snippet?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as Partial<ResearchRequest>;
    const noteId = body.noteId?.trim();
    const noteContent = (body.noteContent ?? "").toString();
    const question = body.question?.trim();

    if (!noteId || !question) {
      return json({ error: "noteId and question are required" }, 400);
    }

    // RLS asegura que el usuario solo encuentre sus propias notas
    const { data: note, error: noteErr } = await supabase
      .from("notes")
      .select("id")
      .eq("id", noteId)
      .single();

    if (noteErr || !note) {
      return json({ error: "Note not found" }, 404);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return json({ error: "OpenAI key not configured" }, 500);
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    const instructions = [
      "Eres un asistente académico que ayuda a estudiantes a profundizar en sus apuntes de clase.",
      "Investiga en la web fuentes confiables: papers, sitios académicos, documentación oficial.",
      "Responde en español, claro y estructurado en markdown. Usa listas y encabezados cuando sea útil.",
      "Cita siempre las fuentes que utilizaste.",
    ].join(" ");

    const inputPrompt = [
      "Apuntes del estudiante:",
      "---",
      noteContent || "(la nota está vacía)",
      "---",
      "",
      `Pregunta: ${question}`,
    ].join("\n");

    const resp = await openai.responses.create({
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      instructions,
      input: inputPrompt,
    });

    const text = resp.output_text ?? "";
    const citations = extractCitations(resp);

    const { error: insertErr } = await supabase.from("ai_messages").insert([
      { note_id: noteId, role: "user", content: question },
      {
        note_id: noteId,
        role: "assistant",
        content: text,
        citations: citations.length ? citations : null,
      },
    ]);

    if (insertErr) {
      console.error("ai_messages insert error", insertErr);
    }

    return json({ text, citations });
  } catch (err) {
    console.error("research-note error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

// Helpers --------------------------------------------------------------------

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// La Responses API anota las URLs encontradas por web_search como
// `url_citation` dentro de los items de output. Las extraemos y deduplicamos.
function extractCitations(resp: unknown): Citation[] {
  const map = new Map<string, Citation>();

  const output = (resp as { output?: unknown[] })?.output;
  if (!Array.isArray(output)) return [];

  for (const item of output) {
    const content = (item as { content?: unknown[] })?.content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      const annotations = (part as { annotations?: unknown[] })?.annotations;
      if (!Array.isArray(annotations)) continue;

      for (const ann of annotations) {
        const a = ann as {
          type?: string;
          url?: string;
          title?: string;
          snippet?: string;
        };
        if (a?.type === "url_citation" && a.url) {
          if (!map.has(a.url)) {
            map.set(a.url, {
              title: a.title || a.url,
              url: a.url,
              snippet: a.snippet,
            });
          }
        }
      }
    }
  }

  return [...map.values()];
}
