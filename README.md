# BoosterNotes

App móvil para tomar notas de clase con un agente IA integrado. Tres
capacidades clave:

1. **Investigar una nota en la web** — el agente busca en internet, devuelve
   una explicación expandida y cita las fuentes (papers, docs académicas).
2. **Reorganizar la nota en jerarquía** — la IA reescribe los apuntes en un
   esquema con encabezados y bullets, sin agregar información nueva.
3. **Buscar entre todas tus notas** — full-text search sobre tus apuntes y
   síntesis IA estricta que solo usa lo que tú has escrito (no toca internet).

**Stack:** Expo SDK 54 (React Native + TypeScript), Supabase (Auth + Postgres
con FTS + Edge Functions), OpenAI Responses API.

```
BoosterAi/
├── app/         # App móvil (Expo + expo-router)
├── backend/     # Supabase: migraciones + 3 edge functions
└── package.json # Workspace npm
```

---

## Probar la app (sin necesidad de clonar el repo)

### Android (APK directo) — recomendado

1. Desde tu celular Android, abre este link:
   **https://expo.dev/artifacts/eas/mWRzzjSd1AyYqnb2EJdcw7.apk**
2. Toca para descargar el archivo `.apk` (~50–80 MB).
3. Cuando termine la descarga, ábrelo desde la barra de notificaciones o el
   gestor de archivos.
4. Android te pedirá permiso para **"Instalar apps de fuentes desconocidas"**.
   Acéptalo (es seguro: el APK está firmado por el sistema de build oficial de
   Expo). En algunos dispositivos hay que activarlo en `Ajustes → Seguridad →
   Instalar apps desconocidas` para tu navegador.
5. Toca **Instalar**. La app aparece como **BoosterNotes** en el launcher.
6. Ábrela, crea una cuenta con tu email y empieza a tomar notas.

> Si prefieres compartir el APK con otra persona, puedes mandarles
> directamente el link de arriba — es público.

Página oficial del build con QR para escanear:
https://expo.dev/accounts/sebastianlev/projects/boosternotes/builds/a99f7da8-085d-4bc5-b2f9-60b612cb1fde

### iOS

iOS no permite instalar IPAs públicos sin pasar por la App Store o TestFlight,
y ambos requieren cuenta de **Apple Developer Program** (USD $99/año). Hay dos
caminos para probar la app desde un iPhone:

**Opción A — TestFlight (recomendado para distribución real, requiere Apple
Developer Account)**

```bash
# Compila el IPA y lo sube a TestFlight automáticamente
cd app
npx eas-cli build --platform ios --profile preview
npx eas-cli submit --platform ios --latest
```

Una vez aceptado por TestFlight (toma ~24h la primera vez), invitas testers
con su email — ellos instalan TestFlight desde la App Store y reciben un link
para descargar la app.

**Opción B — Expo Go con tunnel (sin pagar, solo mientras tu Mac esté
encendida)**

```bash
cd app
npx expo start --tunnel
```

Esto genera una URL pública (ngrok-style) que cualquiera con **Expo Go**
instalado en su iPhone puede abrir. Escanean el QR con la cámara o pegan la
URL `exp://...` en Expo Go. Limitación: solo funciona mientras tu Mac corra
el dev server.

---

## Requisitos

- **Node.js** 20+
- **npm** 10+
- **Supabase CLI** — `brew install supabase/tap/supabase-beta`
- **Docker Desktop** (Supabase local lo necesita)
- **Expo Go** SDK 54 en tu teléfono (App Store / Play Store)
- **API key de OpenAI** con acceso a la Responses API + `web_search` tool

---

## Setup paso a paso

### 1. Instalar dependencias

```bash
cd /path/to/BoosterAi
npm install
```

### 2. Levantar Supabase local

```bash
cd backend
supabase start
supabase db reset   # aplica migrations/0001_init.sql + 0002_search_and_organize.sql
```

Studio en http://127.0.0.1:54323 para inspeccionar tablas.

### 3. Configurar el secret de OpenAI

```bash
cp backend/.env.example backend/.env
# edita backend/.env y pon tu OPENAI_API_KEY
```

### 4. Servir las edge functions localmente

En otra terminal:

```bash
cd backend
supabase functions serve --env-file ./.env
```

Esto sirve las 3 functions: `research-note`, `organize-note`, `search-notes`.

### 5. Configurar el cliente Expo

```bash
cp app/.env.example app/.env
```

Edita `app/.env` con la URL y `anon key` que imprimió `supabase start`.

> **Para teléfono físico o emulador**: `127.0.0.1` no funciona porque apunta al
> dispositivo mismo. Usa la IP LAN de tu Mac (ej. `http://192.168.1.10:54321`).
> Encuéntrala con `ipconfig getifaddr en0`.

### 6. Arrancar la app

```bash
cd app
npx expo start --host lan
```

Escanea el QR con Expo Go o pega la URL `exp://<IP_MAC>:8081` en Expo Go.

---

## Verificación end-to-end

1. **Auth**: Crear cuenta desde signup → autenticado.
2. **Notas**: Crear, escribir, autosave automático cada 700ms.
3. **Vista organizada**: en una nota, pestaña "Organizada" → "Generar".
4. **Investigar**: en panel "Asistente IA" → pregunta + "Investigar" → markdown
   + tarjetas de citas reales.
5. **Buscar**: tab "Buscar" → tema → síntesis solo con tus apuntes + matches
   con highlights.
6. **Borrar**: trash icon en cada nota, en cada mensaje IA, "Borrar historial".
7. **Multi-dispositivo**: misma cuenta en otro device → notas sincronizadas.
8. **Seguridad**: verifica que la API key no está en el bundle:
   ```bash
   grep -r "sk-proj" app/ || echo "OK"
   ```

---

## Estructura de la BD

`backend/supabase/migrations/`:

- **`notes`** — `id`, `user_id`, `title`, `content`, `organized_content`,
  `organized_at`, `search_vector` (tsvector en español, índice GIN), timestamps.
- **`ai_messages`** — historial del agente por nota (`role`, `content`,
  `citations` jsonb).
- **RLS activo** en ambas: cada usuario sólo ve lo suyo.
- **RPC `search_user_notes(q)`** — full-text search con `ts_headline` para
  snippets resaltados.

---

## Edge functions

| Función | Qué hace | OpenAI |
|---|---|---|
| `research-note` | Investiga una nota en la web | Responses API + `web_search` tool |
| `organize-note` | Reestructura en jerarquía sin agregar info | Responses API (sin tools) |
| `search-notes` | FTS + síntesis estricta de las notas del usuario | Responses API (sin tools) |

Las 3 verifican el JWT del usuario, respetan RLS, y la API key de OpenAI vive
solo en el servidor — nunca toca el cliente.

---

## Despliegue a producción

### Supabase en la nube

```bash
cd backend
supabase login
supabase link --project-ref <tu-project-ref>
supabase db push
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase functions deploy research-note
supabase functions deploy organize-note
supabase functions deploy search-notes
```

Actualiza `app/.env` con la URL y `anon key` del proyecto remoto antes de
hacer el build nativo.

### App nativa

Para distribuir vía TestFlight / Play Store, usa EAS:

```bash
cd app
npx eas-cli build --platform ios     # o android
```
