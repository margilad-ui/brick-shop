// BRICK Shop · assets function
// Processes pending rows of bs_asset_jobs: copies each file from an allowed public URL (OpenArt CDN, GitHub, Brickset)
// into the public storage bucket "bs-assets". A job with content_type 'key' chroma-keys a green-screen PNG/JPG
// into a transparent PNG; 'fit:<height>' makes a web-size copy of a PNG. Jobs are created only from SQL (owner side), so calling this function without a job
// does nothing. Triggered from SQL via pg_net; no secrets involved.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/cdn\.openart\.ai\//, /^https:\/\/raw\.githubusercontent\.com\//, /^https:\/\/images\.brickset\.com\//, /^https:\/\/fzznhlitvigvsxhkhvwf\.supabase\.co\/storage\/v1\/object\/public\//];
const BUCKET = "bs-assets";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// chroma key: pure green background -> alpha, with spill suppression on the edges
async function keyGreen(bytes: Uint8Array): Promise<Uint8Array> {
  const img = await Image.decode(bytes);
  const w = img.width, h = img.height;
  const T0 = 24, T1 = 110; // green-ness thresholds (0..255)
  for (let y = 1; y <= h; y++) {
    for (let x = 1; x <= w; x++) {
      const c = img.getPixelAt(x, y);
      let r = (c >>> 24) & 255, g = (c >>> 16) & 255, b = (c >>> 8) & 255, a = c & 255;
      const d = g - Math.max(r, b);
      let alpha = a;
      if (d >= T1) alpha = 0;
      else if (d > T0) alpha = Math.round(a * (1 - (d - T0) / (T1 - T0)));
      if (d > 0 && alpha > 0) { g = Math.max(r, b); } // kill green spill
      img.setPixelAt(x, y, ((r << 24) | (g << 16) | (b << 8) | alpha) >>> 0);
    }
  }
  // crop to content
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 1; y <= h; y++) for (let x = 1; x <= w; x++) { if ((img.getPixelAt(x, y) & 255) > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } }
  if (maxX > minX && maxY > minY) img.crop(minX - 1, minY - 1, maxX - minX + 1, maxY - minY + 1);
  return await img.encode(6);
}

// resize to a given height (width follows), keeps transparency
async function fitHeight(bytes: Uint8Array, h: number): Promise<Uint8Array> {
  const img = await Image.decode(bytes);
  if (img.height > h) img.resize(Image.RESIZE_AUTO, h);
  return await img.encode(6);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: jobs } = await sb.from("bs_asset_jobs").select("id,url,path,content_type").eq("status", "pending").limit(10);
  const out: unknown[] = [];
  for (const j of jobs || []) {
    await sb.from("bs_asset_jobs").update({ status: "running" }).eq("id", j.id);
    try {
      if (j.content_type === "brickset") {
        // j.url = set_num, j.path = brickset setID. Pulls the official additional images (lifestyle shots, angles) into bs_catalog_images.
        const { data: sec } = await sb.from("bs_secrets").select("value").eq("name", "BRICKSET_API_KEY").maybeSingle();
        const key = sec?.value || Deno.env.get("BRICKSET_API_KEY");
        if (!key) throw new Error("no brickset key");
        const r = await fetch(`https://brickset.com/api/v3.asmx/getAdditionalImages?apiKey=${encodeURIComponent(key)}&setID=${encodeURIComponent(j.path)}`);
        if (!r.ok) throw new Error(`brickset ${r.status}`);
        const d = await r.json();
        if (d.status !== "success") throw new Error(d.message || "brickset error");
        const images = (d.additionalImages || []).map((x: { imageURL?: string; thumbnailURL?: string }) => ({ image: x.imageURL, thumb: x.thumbnailURL })).filter((x: { image?: string }) => x.image);
        const { error } = await sb.from("bs_catalog_images").upsert({ set_num: j.url, brickset_id: Number(j.path), images, fetched_at: new Date().toISOString() });
        if (error) throw error;
        await sb.from("bs_asset_jobs").update({ status: "done", bytes: images.length, error: null }).eq("id", j.id);
        out.push({ id: j.id, ok: true, images: images.length });
        continue;
      }
      if (!ALLOWED.some((re) => re.test(j.url))) throw new Error("url not allowed");
      if (!/^[a-z0-9_\-/.]+$/i.test(j.path) || j.path.includes("..")) throw new Error("bad path");
      const res = await fetch(j.url);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      let bytes = new Uint8Array(await res.arrayBuffer());
      let contentType = j.content_type || res.headers.get("content-type") || "application/octet-stream";
      if (j.content_type === "key") { bytes = await keyGreen(bytes); contentType = "image/png"; }
      // 'fit:600' = resize a PNG (alpha kept) to that height, for web-size copies of the big keyed renders
      const fit = /^fit:(\d+)$/.exec(j.content_type || "");
      if (fit) { bytes = await fitHeight(bytes, Number(fit[1])); contentType = "image/png"; }
      const { error } = await sb.storage.from(BUCKET).upload(j.path, bytes, { contentType, upsert: true, cacheControl: "31536000" });
      if (error) throw error;
      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(j.path);
      await sb.from("bs_asset_jobs").update({ status: "done", bytes: bytes.length, public_url: pub.publicUrl, error: null }).eq("id", j.id);
      out.push({ id: j.id, ok: true, bytes: bytes.length });
    } catch (e) {
      await sb.from("bs_asset_jobs").update({ status: "error", error: String((e as Error).message || e) }).eq("id", j.id);
      out.push({ id: j.id, ok: false, error: String((e as Error).message || e) });
    }
  }
  return json({ processed: out });
});
