// BRICK Shop · catalog function
// actions:
//   { action: "lookup", q: "76388" | "5702016913675" }  -> set record (local catalog first, then Brickset)
//   { action: "sync", year: 2023 }                       -> pull all sets of a year from Brickset into bs_catalog
//   { action: "usage" }                                  -> Brickset key usage
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BRICKSET = "https://brickset.com/api/v3.asmx";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any
function mapSet(s: any) {
  const lc = s.LEGOCom || {};
  const d = (v?: string) => (v ? v.slice(0, 10) : null);
  return {
    set_num: `${s.number}-${s.numberVariant ?? 1}`,
    number: String(s.number),
    variant: s.numberVariant ?? 1,
    name: s.name,
    year: s.year ?? null,
    theme: s.theme ?? null,
    subtheme: s.subtheme ?? null,
    theme_group: s.themeGroup ?? null,
    category: s.category ?? null,
    pieces: s.pieces ?? null,
    minifigs: s.minifigs ?? null,
    age_min: s.ageRange?.min ?? null,
    age_max: s.ageRange?.max ?? null,
    packaging: s.packagingType ?? null,
    availability: s.availability ?? null,
    launch_date: d(s.launchDate),
    exit_date: d(s.exitDate),
    rrp_us: lc.US?.retailPrice ?? null,
    rrp_uk: lc.UK?.retailPrice ?? null,
    rrp_de: lc.DE?.retailPrice ?? null,
    rrp_ca: lc.CA?.retailPrice ?? null,
    image_url: s.image?.imageURL ?? null,
    thumb_url: s.image?.thumbnailURL ?? null,
    ean: s.barcode?.EAN ?? null,
    upc: s.barcode?.UPC ?? null,
    dims: s.dimensions ?? null,
    model_dims: s.modelDimensions ?? null,
    rating: s.rating ?? null,
    rating_count: s.ratingCount ?? null,
    instructions_count: s.instructionsCount ?? null,
    additional_images: s.additionalImageCount ?? null,
    tags: s.extendedData?.tags ?? null,
    description_en: s.extendedData?.description ?? null,
    brickset_id: s.setID ?? null,
    raw: s,
    fetched_at: new Date().toISOString(),
  };
}

async function bricksetGetSets(apiKey: string, params: Record<string, unknown>) {
  const url = `${BRICKSET}/getSets?apiKey=${encodeURIComponent(apiKey)}&userHash=&params=${encodeURIComponent(JSON.stringify(params))}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Brickset HTTP ${r.status}`);
  const data = await r.json();
  if (data.status !== "success") throw new Error(`Brickset: ${data.message || data.status}`);
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // who is calling: must be an owner
  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: "not signed in" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: owner } = await admin.from("bs_owners").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!owner) return json({ error: "not an owner" }, 403);

  const body = await req.json().catch(() => ({}));
  const action = body.action || "lookup";

  const { data: secret } = await admin.from("bs_secrets").select("value").eq("name", "BRICKSET_API_KEY").maybeSingle();
  const apiKey = secret?.value || Deno.env.get("BRICKSET_API_KEY");
  if (!apiKey) return json({ error: "no_api_key", message: "מפתח Brickset עדיין לא הוזן. הגדרות → מפתחות." }, 200);

  if (action === "usage") {
    const r = await fetch(`${BRICKSET}/getKeyUsageStats?apiKey=${encodeURIComponent(apiKey)}`);
    return json(await r.json());
  }

  if (action === "sync") {
    const year = Number(body.year);
    if (!year) return json({ error: "year required" }, 400);
    let page = 1, total = 0, saved = 0;
    while (true) {
      const data = await bricksetGetSets(apiKey, { year, pageSize: 500, pageNumber: page, extendedData: 1 });
      total = data.matches ?? 0;
      const rows = (data.sets || []).map(mapSet);
      if (rows.length) {
        const { error } = await admin.from("bs_catalog").upsert(rows, { onConflict: "set_num" });
        if (error) return json({ error: error.message, page }, 500);
        saved += rows.length;
      }
      if (rows.length < 500 || saved >= total) break;
      page++;
    }
    return json({ ok: true, year, matches: total, saved, pages: page });
  }

  // lookup
  const q = String(body.q || "").replace(/\D/g, "");
  if (!q) return json({ error: "q required" }, 400);

  // settings for suggested price
  const { data: settingsRows } = await admin.from("bs_settings").select("key,value");
  const S: Record<string, number> = {};
  (settingsRows || []).forEach((r: { key: string; value: unknown }) => { S[r.key] = Number(r.value); });
  const suggest = (c: { rrp_us: number | null; rrp_de: number | null; exit_date: string | null }) => {
    const base = c.rrp_us ?? c.rrp_de;
    if (!base) return { price: null, source: "אין מחירון, לתמחר ידנית" };
    const retired = !!c.exit_date && c.exit_date < new Date().toISOString().slice(0, 10);
    const rate = S.usd_ils || 3.7, mult = S.retired_multiplier || 1.2;
    const raw = base * rate * (retired ? mult : 1);
    return { price: Math.round(raw / 10) * 10, source: retired ? `מחירון × שער × ${mult} (פרש)` : "מחירון × שער (בייצור)" };
  };

  let found = null, source = "catalog";
  if (q.length >= 11) {
    const { data } = await admin.from("bs_catalog").select("*").or(`ean.eq.${q},upc.eq.${q}`).limit(1);
    found = data?.[0] || null;
    if (!found) return json({ found: false, reason: "barcode_unknown", q });
  } else {
    const { data } = await admin.from("bs_catalog").select("*").eq("number", q).order("variant").limit(1);
    found = data?.[0] || null;
    if (!found) {
      source = "brickset";
      const data = await bricksetGetSets(apiKey, { setNumber: `${q}-1`, extendedData: 1 });
      const s = data.sets?.[0];
      if (!s) return json({ found: false, reason: "set_unknown", q });
      const row = mapSet(s);
      const { error } = await admin.from("bs_catalog").upsert(row, { onConflict: "set_num" });
      if (error) return json({ error: error.message }, 500);
      found = row;
    }
  }
  return json({ found: true, source, set: found, suggested: suggest(found) });
});
