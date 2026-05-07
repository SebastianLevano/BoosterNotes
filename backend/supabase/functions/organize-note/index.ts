// Edge Function: organize-note
// Reescribe el contenido de una nota en una estructura jerárquica clara
// (encabezados + bullets) sin agregar información nueva. Persiste el resultado
// en notes.organized_content para que la app lo muestre como "vista organizada".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import OpenAI from "https://esm.sh/openai@4.104.0";

type Body = {
  noteId: string;
  noteContent: string;
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
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as Partial<Body>;
    const noteId = body.noteId?.trim();
    const noteContent = (body.noteContent ?? "").toString();

    if (!noteId) return json({ error: "noteId is required" }, 400);
    if (!noteContent.trim()) {
      return json({ error: "Note content is empty, nothing to organize" }, 400);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OpenAI key not configured" }, 500);

    const openai = new OpenAI({ apiKey: openaiKey });

    const instructions = [
      "Eres un asistente que reorganiza apuntes de clase para facilitar el estudio.",
      "REGLA ESTRICTA: NO agregues información nueva, NO inventes datos, NO uses conocimiento externo.",
      "Tu única tarea es REORGANIZAR el texto que recibes en una jerarquía clara:",
      "- Identifica el tema principal (encabezado nivel 1: '#')",
      "- Identifica subtemas (nivel 2: '##') y, si aplica, sub-subtemas (nivel 3: '###')",
      "- Lista los puntos clave bajo cada subtema con bullets ('-')",
      "- Conserva las palabras y frases originales del estudiante siempre que sea posible.",
      "- Si el contenido es muy breve, agrupa por oraciones; no inventes secciones.",
      "Devuelve solo markdown, sin explicaciones adicionales.",
    ].join("\n");

    const resp = await openai.responses.create({
      model: "gpt-4.1",
      instructions,
      input: noteContent,
    });

    const organized = (resp.output_text ?? "").trim();
    if (!organized) {
      return json({ error: "Empty model response" }, 502);
    }

    const { error: updateErr } = await supabase
      .from("notes")
      .update({
        organized_content: organized,
        organized_at: new Date().toISOString(),
      })
      .eq("id", noteId);

    if (updateErr) {
      console.error("notes update error", updateErr);
      return json({ error: updateErr.message }, 500);
    }

    return json({ organized_content: organized });
  } catch (err) {
    console.error("organize-note error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
