// BRICK Shop · photo function
// The owner photographs an item that has no catalog entry (gear, books, magazines). The app shrinks the picture
// client side and POSTs it here as multipart (field "file"); it is stored in the public bucket under items/<uuid>.jpg
// and the public URL comes back. Only signed-in owners may upload.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BUCKET = "bs-assets";
const MAX = 6 * 1024 * 1024;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: "not signed in" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: owner } = await admin.from("bs_owners").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!owner) return json({ error: "not an owner" }, 403);

  // two ways in: multipart "file" (camera / gallery), or JSON { url } with a picture from a shop page (copied here, not hotlinked)
  let bytes: Uint8Array; let type: string;
  if ((req.headers.get("content-type") || "").includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    const url = String(body.url || "");
    if (!/^https:\/\//.test(url)) return json({ error: "https url required" }, 400);
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (BRICK Shop)", Accept: "image/*" } }).catch(() => null);
    if (!r || !r.ok) return json({ error: `fetch failed (${r?.status ?? "network"})` }, 400);
    const ct = (r.headers.get("content-type") || "").split(";")[0].trim();
    if (!ct.startsWith("image/")) return json({ error: "not an image: " + ct }, 400);
    bytes = new Uint8Array(await r.arrayBuffer());
    type = ct;
  } else {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return json({ error: "file required" }, 400);
    bytes = new Uint8Array(await file.arrayBuffer());
    type = file.type;
  }
  if (bytes.length > MAX) return json({ error: "file too large" }, 413);
  type = type === "image/png" ? "image/png" : type === "image/webp" ? "image/webp" : "image/jpeg";
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const path = `items/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: false, cacheControl: "31536000" });
  if (error) return json({ error: error.message }, 500);
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return json({ ok: true, path, url: pub.publicUrl, bytes: bytes.length });
});
