// Edge Function: search-notes
// Filtro estricto sobre las notas del usuario:
//   1. Postgres FTS via RPC search_user_notes (RLS aplica)
//   2. Si hay matches, OpenAI sintetiza ÚNICAMENTE con ese contenido —
//      con prompt explícito de no agregar información externa.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import OpenAI from "https://esm.sh/openai@4.104.0";

type Body = { query: string };

type Match = {
  id: string;
  title: string;
  snippet: string;
  rank: number;
  updated_at: string;
};

type FullNote = {
  id: string;
  title: string;
  content: string;
  organized_content: string | null;
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
    const query = body.query?.trim();
    if (!query) return json({ error: "query is required" }, 400);

    // 1. Full-text search via RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "search_user_notes",
      { q: query },
    );

    if (rpcErr) {
      console.error("rpc error", rpcErr);
      return json({ error: rpcErr.message }, 500);
    }

    const matches = (rpcData ?? []) as Match[];

    if (matches.length === 0) {
      return json({
        matches: [],
        synthesis:
          "No encontré nada en tus apuntes sobre ese tema. Toma una nota nueva o reformula la búsqueda.",
      });
    }

    // 2. Cargar el contenido completo de las notas que matcheearon
    const ids = matches.map((m) => m.id);
    const { data: fullNotes, error: notesErr } = await supabase
      .from("notes")
      .select("id, title, content, organized_content")
      .in("id", ids);

    if (notesErr) {
      console.error("notes fetch error", notesErr);
      return json({ error: notesErr.message }, 500);
    }

    // 3. Sintetizar con OpenAI usando SOLO el contenido del usuario
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OpenAI key not configured" }, 500);

    const openai = new OpenAI({ apiKey: openaiKey });

    const notesPayload = (fullNotes as FullNote[])
      .map((n, i) => {
        const body = n.organized_content?.trim()
          ? n.organized_content
          : n.content;
        return `[Nota ${i + 1}] ID=${n.id}\nTítulo: ${n.title || "(sin título)"}\nContenido:\n${body}`;
      })
      .join("\n\n---\n\n");

    const instructions = [
      "Eres un asistente que ayuda a un estudiante a encontrar información en SUS PROPIOS apuntes de clase.",
      "REGLAS ESTRICTAS:",
      "- USA EXCLUSIVAMENTE la información presente en las notas proporcionadas.",
      "- NO agregues información de tu conocimiento general.",
      "- NO inventes datos, definiciones, ejemplos ni referencias.",
      "- Si los apuntes no cubren un aspecto del tema buscado, dilo explícitamente: \"En tus notas no encontré...\"",
      "- Si los apuntes contradicen entre sí, señálalo.",
      "- Cita la nota fuente como (Nota N) cada vez que uses información de ella.",
      "Estructura tu respuesta en markdown, con encabezados claros sobre los aspectos del tema cubiertos.",
    ].join("\n");

    const userInput = [
      `Tema buscado: ${query}`,
      "",
      "Apuntes del estudiante:",
      "===",
      notesPayload,
      "===",
      "",
      "Consolida en una respuesta cohesiva todo lo que el estudiante ha anotado sobre el tema, citando las notas fuente.",
    ].join("\n");

    const resp = await openai.responses.create({
      model: "gpt-4.1",
      instructions,
      input: userInput,
    });

    const synthesis = (resp.output_text ?? "").trim();

    return json({ matches, synthesis });
  } catch (err) {
    console.error("search-notes error", err);
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
