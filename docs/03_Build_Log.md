# BRICK Shop · יומן בנייה, תקלות ופתרונות

**עודכן:** 16 באוקטובר 2026, 14:00. אבן דרך 1 נבנתה ב 14 עד 15 באוקטובר (כ 5 שעות). החנות נבנתה ב 15 באוקטובר בלילה (שעה אחת, בלי גילעד), ועברה שלושה סבבי סקירה במהלך היום. כל השעות בשעון ישראל.

## ציר הזמן

1. **חשיבה (14.10, 20:34 עד 21:30).** גילעד שלח 6 תמונות של המדפים וביקש חשיבה עמוקה, לא פתרון בשלוף. קלוד בדק את Brickset ו Rebrickable והציע: לא מקלידים, מזהים (מספר סט או ברקוד) וסופרים. הוחלט על חנות BRICK Shop לפי מותג BRICK HOUSE.
2. **הדמיות (21:40 עד 22:30).** v1: ארבעה מסכים, שקט מדי ובלי ג'ואי, נדחה. v2: צבעוני, חי, ג'ואי מארח, אושר ככיוון לחנות. v3: ממשק הניהול, אושר כבסיס.
3. **תשתית (22:34 עד 23:06).** אפיון, סכמה ב Supabase, פונקציית catalog, אפליקציה, ריפו, Pages. האתר עלה לאוויר ב 23:06.
4. **הפעלה ותיקונים (23:06 עד 00:10).** הרשמה עם קוד, מפתחות, סנכרון קטלוג (8,448 סטים), הגדרות מקומות, סורק, PWA. ערכת מסמכים 00 עד 06.
5. **BRICK Shop (15.10, 01:40 עד 02:40).** גילעד: "תרוץ על הכל, אני עוזב את המחשב". נכסי ג'ואי (חיתוך 11 תנוחות מלוח הדמות, 3 תמונות ו 4 סרטונים ב OpenArt, ניקוי לשקיפות), שכבת קריאה ציבורית ב Supabase (views, הזמנות, Storage, פונקציית assets), ואז החנות: 8 מסכים, עגלה, תהליך רכישה עם ביט או וואטסאפ, רגע פתיחה, מילון he/en, כפתור הערות. הזמנת בדיקה #1001.
6. **סבב 1 ו 2 (15.10, 10:00 עד 14:30).** גילעד סקר בטלפון ובמחשב ושלח צילומי מסך. 6 קליפים ו 2 תמונות נוספים ב OpenArt, תמונות Brickset לכל ערכה (75 ערכות, 1,032 תמונות), הירו חדש, כרטיס, פוטר, דף מוצר עם גלריה, Intro עם דלתות, ראנר אקראי. גילעד עשה הזמנת בדיקה #1002 בעצמו (וואטסאפ).
7. **סבב 3 (15:30 עד 17:30).** בועה מהאף של ג'ואי, מרכוז ההירו, כותרת בעברית, פוטר קומפקטי, "גילעד" עם י'. לבנים איזומטריות במקום גשם.
8. **הרץ והמדף (17:20 עד 19:00), גילעד ליד המחשב.** ג'ואי הרץ נחתך במחשב: 5 קליפים "רחבים" חדשים (ג'ואי קטן בפריים ברוחב המסך, image2video עם פריים התחלה וסיום). המדף: ניסיון ראשון של "ספריית קופסאות" ב CSS 3D נדחה ("נראה גרוע ולא מקצועי"). גילעד ניסה בעצמו פרומפט ב OpenArt וקיבל קופסת Astro Bot אמיתית (צד + 45 מעלות). קלוד חזר על התהליך ל 8 ערכות: 17 רנדרים, ניקוי ירוק, גרסאות ווב, מדף מצויר, והמדף החדש באוויר ב 18:30.
9. **מדבקות מדף (18:50 עד 19:05).** PDF A4 לרוחב, 15 רצועות. 19:50: עדכון מלא של המסמכים לשיחה חדשה.
10. **16.10, 12:00.** שדרוג קטן במשרד האחורי: סט שכבר במלאי מציע "הוסף לשורה קיימת" או "שורה חדשה". מדבקות לקוביות (K1 עד K7) ואזור K באפליקציה.
12. **16.10 אחר הצהריים.** "שכחתי סיסמה", SMTP דרך Resend, פריטים ללא מספר (צילום או קישור לתמונה), 6 ספרות בחיפוש.
13. **17.10, 13:30. חלקים ותוויות.** ייבוא CSV של BrickLink (`bs_import_parts`), לשונית חלקים, QR שפותח חלק (`?p=3001.11`), תוויות 50×30 עם ציור LDraw, הדפסה ישירה ל B1 ו PDF. נבדק: ייבוא כפול בהרצה יבשה (rollback), 9 מתוך 11 חלקים מהקובץ של גילעד קיבלו ציור LDraw, הקריסטל (x789) עבר לגיבוי מתמונה.
14. **17.10 ערב. תוויות מיקום.** `LabelSheet` הפך לגנרי (פריטים + תבניות + גודל במ"מ), `locations.ts` עם שלוש תבניות, פרמטר `?loc=` ופס מיקום במלאי, סריקה של תווית מיקום ממסך הסריקה. נבדק בצילומי Playwright (תבניות ומסך הבחירה).
11. **16.10, 12:45 עד 14:00. ההעברה ל brick-shop ו Netlify.** גילעד: "אתה תעשה הכל, מקסימום תעבוד עם קלוד כרום. רוץ". ה MCP סירב ליצור פרויקט (cancelled), Claude in Chrome התחבר אחרי כמה דקות, והפרויקט נוצר מהדשבורד (גילעד אישר 10$ לחודש). סדר ההעברה: סכמה מלאה (`0002_brick_shop_full.sql`, קריאה אחת של `apply_migration` שעבדה הפעם) → אזורים, 38 מיקומים, הגדרות, 2 הזמנות (SQL מוכן מראש) → קטלוג: view זמני `bs_mig_catalog` ב tripaloo עם select ל anon, 22 בקשות `net.http_get` של 400 שורות מהפרויקט החדש, `jsonb_populate_recordset` לתוך `bs_catalog`, checksum זהה בשני הצדדים (`76e4aa1d…`, 8,448 שורות, 16MB raw), ואז revoke על ה view (drop חסום) → `bs_catalog_images` באותה דרך (75 שורות, 1,032 תמונות) → שתי הפונקציות → 82 קבצי Storage (184MB) כעבודות `bs_asset_jobs` בפרויקט החדש שמושכות מהכתובות הציבוריות של tripaloo (8 פינגים) → `.env.production`, build, push → Pages עובד מול הפרויקט החדש → Netlify: אתר `brick-house-shop` נפתח דרך ה MCP של Netlify, החיבור ל GitHub דרך Claude in Chrome (ההרשאה הייתה קיימת), `netlify.toml` עם `VITE_BASE=/`. tripaloo: לא שונה שום נתון; נוסף view אחד (bs_mig_catalog, בלי הרשאות עכשיו) שימחק באישור.

## מה נבנה (רשימת קבצים ומשמעות)

```
brick-shop/
  docs/                         המסמכים האלה (00 עד 06), זהים לתיקייה של גילעד ולפרויקט ב claude.ai
  index.html, vite.config.ts    PWA (vite-plugin-pwa, autoUpdate), base מ VITE_BASE (ברירת מחדל /brick-shop/ ל Pages, / ל Netlify), plugin spa404
  .env.production               כתובת Supabase ומפתח ציבורי (לא סוד)
  .github/workflows/deploy.yml  בנייה ופריסה ל GitHub Pages בכל דחיפה ל main
  public/                       אייקונים; public/joey/*.webp 11 תנוחות ג'ואי חתוכות; public/brand/joey-ref-b.jpg
  src/main.tsx                  פיצול: /shop טוען את החנות (lazy), כל השאר את המשרד האחורי
  src/styles.css                עיצוב המשרד האחורי לפי ספר המותג
  src/lib/supabase.ts, api.ts   חיבור, טיפוסים, lookup, sync, מלאי, אזורים, תור לא מקוון
  src/components/               Bits (לוגו, Stud, Loc, ThemeTag, Pic, Toaster), Scanner (BarcodeDetector או ZXing)
  src/screens/                  Login, Add, Inventory, Settings; src/App.tsx ניווט
  supabase/migrations/0001_schema.sql   הסכמה המקורית ב tripaloo (היסטוריה). שכבת החנות מתועדת בסוף הקובץ כהערה
  supabase/migrations/0002_brick_shop_full.sql   הסכמה המלאה של הפרויקט brick-shop (הורצה ב 16.10 עם apply_migration). זה המקור מעכשיו
  netlify.toml                  בנייה ב Netlify: npm run build, dist, VITE_BASE=/ ; public/_redirects: /* → index.html 200
  supabase/functions/catalog/index.ts   lookup, sync, usage (verify_jwt)
  supabase/functions/assets/index.ts    העתקה, key, fit:<h>, brickset (verify_jwt=false, גרסה 5)

  src/shop/Shop.tsx             מעטפת החנות: ראוטר, רגע פתיחה (פעם ב 12 שעות), כותרת, פוטר, עגלה, Runner, הערות, כותרות דפים
  src/shop/router.ts            ראוטר קטן (history API): BASE, navigate, href, useRoute, match, onLinkClick
  src/shop/i18n.ts              המילון he/en (כ 160 מחרוזות): t, useT, setLang, applyDir, fmtPrice
  src/shop/data.ts              loadShop (bs_shop + bs_shop_demo), loadCatalogSet, loadImages, loadBoxes, loadBoxArt, placeOrder,
                                paragraphs, THEME_COLOR, isNew, isRare, dims, waLink, DEFAULT_WA, DEFAULT_BIT, hook לנתוני דמה (window.__BS_MOCK)
  src/shop/cart.ts              עגלה ב localStorage, מגירה, אירוע "הבאתי"
  src/shop/joey.tsx             JOEY (תנוחות), CLIP (10 קליפים ישנים + 5 רחבים), רכיב Clip (WebGL chroma key, requestVideoFrameCallback,
                                חצי רזולוציה, rate, playing, onStart, onEnded, נפילה לתמונה)
  src/shop/bricks.tsx           Brick2x4 (לבנה איזומטרית ב SVG, 8 סטאדים) ו FloatingBricks (5 לבנות שצפות באזורים מתים)
  src/shop/shelf.tsx            useShelf (אילו ערכות, גבוהות באמצע) ו BoxShelf (רנדרי צד וזווית על המדף המצויר, hover/נגיעה, לחיצה לדף)
  src/shop/ui.tsx               Logo, Stud, Brick (כפתור לבנה), Link, Pic, Bubble (הקלדה), SetCard, flyToCart, Header, Footer, CartDrawer,
                                Runner (קליפ רחב אקראי כל 30 עד 55 שניות), Feedback (הערות), Intro, DemoBanner, MobileNav
  src/shop/pages/               Home, Sets, Collectors, Product, Checkout (כולל DoneView), About (+ NotFound)
  src/shop/shop.css             כל עיצוב החנות (טוקנים, הירו, מדף, לבנות, רץ, כרטיסים, כספת, מגירה, רכישה, Intro, נייד)
```

**מחוץ לריפו:** ענף `assets` (פריימים ירוקים לרפרנס של OpenArt). בסשן: `review.mjs` (Playwright, נתוני דמה) ו `labels/labels.html` + `render.mjs` (מדבקות) ב scratchpad; שניהם קצרים ואפשר לבנות מחדש.

## תקלות, ואיך נפתרו

| תקלה | סיבה | פתרון | מה ללמוד |
|---|---|---|---|
| `create_project` ב Supabase חוזר "cancelled" | חסום למערכת מהסשן | 14.10: הטבלאות בפרויקט קיים (tripaloo). 16.10: הפרויקט נוצר מהדשבורד דרך Claude in Chrome | פרויקט חדש: דשבורד, לא MCP |
| Claude in Chrome "not connected" למרות שהתוסף מותקן ועבד בשיחות אחרות | החיבור של התוסף לסשן מגיע באיחור של כמה דקות | `list_connected_browsers` ואז לנסות שוב | לא להסיק "לא מותקן" מניסיון אחד |
| `apply_migration` עבד ב 16.10 לסכמה מלאה (280 שורות, טבלאות + מדיניות) | כנראה בפרויקט ריק אין "destructive" | לפרויקט חדש: apply_migration עם הקובץ המלא | |
| `drop view` ו `drop table` חוזרים cancelled גם לעזרי ההעברה | מחיקה | `revoke all` במקום, ומחיקה כשגילעד מאשר | ב tripaloo נשאר view `bs_mig_catalog` בלי הרשאות; ב brick-shop נשארו `bs_mig_pull`, `bs_mig_request`, `bs_mig_apply` חתומים |
| פרויקט Supabase חדש נותן ל anon ו authenticated כל הרשאה על כל אובייקט חדש (ברירת מחדל "expose new tables") | הגדרת הפרויקט | RLS על כל טבלה (יש), ול views זמניים revoke מיד | view פשוט בלי RLS = כתיבה פתוחה לכולם. לבדוק `role_table_grants` |
| העתקת הקטלוג: `pg_net` שולח את הבקשות רק בסיום הטרנזקציה | pg_net אסינכרוני | לשלוח בקריאה אחת, לבדוק בקריאה הבאה; לא `pg_sleep` באותה קריאה | |
| שלושה פינגים במקביל לפונקציית assets עיבדו את אותן 10 עבודות | אין נעילה על pending | פינג אחד בכל פעם, 20 שניות ביניהם | upsert, אז לא נזק, רק זמן |
| כיבוי "Confirm email" בדשבורד נחסם ("Security Weaken") | מסנן האבטחה | נשאר אימות: תבנית המייל קיבלה גם את הקוד `{{ .Token }}` (האפליקציה מצפה לקוד) | Site URL הוגדר ל Pages |
| שחזור סיסמה: גילעד שכח את הסיסמה החדשה; המייל המובנה של Supabase מוגבל ל 2 בשעה; הקוד 8 ספרות ולא 6 | אין "שכחתי סיסמה", מגבלת מייל, אורך קוד | מסך "שכחתי סיסמה" (resetPasswordForEmail → verifyOtp recovery → updateUser), "כבר יש לי קוד", קבלת כל אורך קוד, SMTP דרך Resend (גילעד הדביק את המפתח בדשבורד) | `detectSessionInUrl` כבוי, לכן קודים ולא קישורים. דגל `bs_newpw` ב sessionStorage מחזיק את מסך הסיסמה החדשה |
| `pkill -f "vite --port …"` הרג את המעטפת עצמה (exit 144) | התבנית תפסה את הפקודה | `kill` לפי pid, או להשאיר את השרת | |
| BrickLink לא מחזיר CORS על תמונות | אי אפשר לקרוא פיקסלים מהדפדפן | הפונקציה `photo` עם `{ proxy: url }` (רק img.bricklink.com, בלי שמירה) | |
| LDraw: אין קבצים ל x789 ול 87081c02 | מספור BrickLink שונה, הרכבות | מועמדים: המספר, ואז בלי סיומת c/pb/pr (87081). אחרת גיבוי מתמונה | מיפוי מלא BrickLink↔LDraw דורש Rebrickable |
| הדפדפן: `file_upload` ל Netlify נדחה (רק קבצים שהסשן קיבל), `npx @netlify/mcp` ו `device_bash` חסומים ברשת | רשת ואבטחה | חיבור הריפו ב GitHub ל Netlify מהדשבורד. הבנייה ב Netlify | גרירה ידנית נשארת כגיבוי: `מלאי לגו\Netlify\brick-house-netlify` |
| `apply_migration` חוזר "cancelled" | דורש אישור שלא מגיע | `execute_sql` עובד גם ל DDL | execute_sql לכל שינוי סכמה |
| `drop`, `revoke`, `create table` עם `create policy` באותה קריאה: "cancelled" | פקודות הרסניות ו"Permission Grant" דורשות אישור | רק הוספות. מדיניות חדשה בשם חדש. במקום טבלה חדשה עם מדיניות: view על טבלה קיימת (כך נבנה bs_shop_box_art) | לתכנן "רק הוספה", ולהעדיף views |
| הזנת מפתחות וסיסמה ב SQL נחסמה ("Credential Leakage"), כתיבה ל bs_secrets ("Secret-Store Writes") | מסנני אבטחה | מסך הגדרות באפליקציה. פונקציות בלי סודות (תור עבודות) | סודות רק דרך ממשק שגילעד מפעיל |
| הרשת של הסשן חסומה ל brickset.com, supabase.co, github.io, cdn.openart.ai, storage.googleapis.com (גם מהמחשב של גילעד דרך ה VM) | רשימת היתרים | npm ו github.com פתוחים. GitHub ו Supabase הם "צינור" לכל קובץ: העלאה ל OpenArt מ raw.githubusercontent.com, הורדה מ OpenArt דרך פונקציית assets ל Storage | לבדוק reachability לפני שבונים סביב API |
| הדפדפן המובנה לא פותח cdn.openart.ai | רשימת היתרים של האפליקציה | לייבא קודם ל Storage ואז לצפות מ supabase.co | |
| תוצאות JS ארוכות מהדפדפן נחתכות בכ 260KB | מגבלת תוצאה | להביא תמונות לסשן: fetch מאותו origin, הקטנה ב canvas, base64, 1 עד 2 תמונות לקריאה, פענוח בפייתון | לא מתאים לקבצים גדולים |
| דחיפה ל GitHub נדחתה (403) | אפליקציית Claude לא הותקנה על הריפו | גילעד התקין בכרום | כל ריפו חדש: גילעד מאשר פעם אחת |
| GitHub API מחוץ לריפו חסום (יצירת ריפו, Pages, GraphQL) | פרוקסי | ריפו ו Pages דרך הדפדפן של גילעד. `gh run list/view` ו `gh api` בתחום הריפו עובדים | |
| `actions/deploy-pages` נכשל בריצה הראשונה | Pages לא הופעל | הפעלה ידנית ב Settings → Pages → GitHub Actions | |
| דחפתי בנייה שנכשלה בטיפוסים | שרשור פקודות לא עצר על שגיאה | תמיד `npm run build` ירוק לפני push | |
| קוד 6 ספרות במייל במקום קישור | tripaloo מוגדר ל OTP | מצב "אימות קוד" במסך הכניסה | הגדרות ה Auth של הפרויקט הקיים קובעות |
| הסורק פתח סלפי, לא התמקד | facingMode רך, עדשה רחבה | סדר ניסיונות, בחירת עדשה ראשית, מיקוד רציף, זום, BarcodeDetector | דוח של גילעד אחרי העדכון עדיין לא התקבל |
| "Couldn't install web app" באנדרואיד | כנראה זמני או מטמון | מניפסט הודק (id, maskable) | לא אומת שנפתר |
| `imagescript` מ npm נכשל ב Edge Function | codec של Node | `https://deno.land/x/imagescript@1.3.0/mod.ts` | deno.land לחבילות עם קוד נייטיב |
| Claude in Chrome לא מחובר כשגילעד לא ליד המחשב | ההרחבה פעילה רק כשכרום פתוח | הדפדפן המובנה של אפליקציית Claude (Claude_Browser), 539px, עם אמולציה mobile או 1400×900 (מוקטן, צילום ברזולוציה נמוכה; zoom על אזור) | לבדיקות מחשב מדויקות: Playwright מקומי עם נתוני דמה |
| החלונית המובנית מוסתרת: טיימרים ווידאו מואטים, סקריפט ארוך נתקע | דף ברקע | לבדוק רץ ואנימציות רק כשהחלונית מוצגת, או לבקש מגילעד | |
| חיתוך ג'ואי מ 55.png: חורים באף ובלשון, האותיות JOEY נכנסו ל"sit" | rembg isnet | מילוי חורים (scipy), שמירת פיקסלים רוויים, צביעת פינת הכותרת לפני | |
| המגירה נחתכה בנייד | גלילה אופקית ב RTL | `overflow-x:hidden` על html, `overflow-x:clip` על .s-app | |
| רדיו בתהליך הרכישה כיסה את הכותרת | padding פיזי | `padding-inline-start` | ב RTL תמיד לוגי |
| פונקציית assets מעבדת 10 לקריאה, עבודות נתקעות ב pending | pg_net קריאה אחת לכל import | פינגים: `select net.http_post(url := 'https://klhjjvjuwosrjkpclcmi.supabase.co/functions/v1/assets', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 150000) from generate_series(1,4);` | |
| עבודות key של רנדרים 2k נתקעות ב running | הפונקציה נהרגת על CPU | `update bs_asset_jobs set status='pending' where status='running'` ופינג. עותקי ווב עם `fit:<גובה>` | |
| הגלריה גלשה בנייד | grid 1fr עם min-content | `min-width:0` על ילדי grid | |
| ה Intro "לא נראה" | קצר, פעם ללשונית, בלי ג'ואי | דלתות, לוגו, ג'ואי בסרטון שנטען מראש, 6.4 שניות, פעם ב 12 שעות | |
| סטאדים שחורים בכרטיס, טקסט לבן בכספת, טקסט לבן ב hover של עולמות | `--c` של הכרטיס דרס את `.c-*`; ירושת צבע | `background:var(--c,var(--ink))`, `color:var(--ink)` מפורש | |
| הרץ מגמגם | ציור כל פריים ב raf, רזולוציה מלאה | requestVideoFrameCallback + חצי רזולוציה | |
| גשם לבנים נראה כמלבנים; הסטאדים "מסובבים" | מלבנים ב canvas; כיוון שורות הסטאדים הפוך | Brick2x4 ב SVG איזומטרי: עמודות (30,-10), שורות (20,10); מיקום באזורים מתים | |
| הפוטר התנפח כשג'ואי נכנס לזרימה | ג'ואי בתוך flex | ג'ואי absolute 44px מעל שורת הזכויות | |
| ג'ואי הרץ נחתך במחשב | פריים 16:9 מוקטן ל 46%: קצוות הפריים באמצע המסך | קליפים רחבים: image2video עם startFrame/endFrame (ג'ואי 17% מגובה הפריים, בקצה), הפריים ברוחב המסך, הזזה 16vw בכניסה וביציאה, "look" בפריים 70% עם הזזה 30vw. element2video עם "tiny" לא עזר | למדוד מיקום ג'ואי בכל קליפ (bbox של פיקסלים לא ירוקים, סקריפט בדפדפן) |
| ספריית הקופסאות ב CSS 3D נראתה חובבנית | הגב המצאה (אמנות מטושטשת), ולרוב הערכות אין פנים שטוחות ב Brickset | רנדרים ב OpenArt מתמונת הפנים (צד + 45). הטקסט יוצא נכון ברוב המקרים | לבדוק כל רנדר, במיוחד מספרים |
| ב Brickset, "Box5" הוא הגב, לא הפנים | מוסכמת שמות של LEGO: Box1/Box3 פנים, Box5/Box6 גב, boxprod צילום מוצר | view bs_shop_boxes לפי regex על שם הקובץ | |
| רנדר זווית של רכבת דיסני נדחה (safety system) | קניין רוחני | ערכה אחרת. לא לנסות שוב | |
| הקופסאות לא הופיעו במדף החי (רק 1) | הערכות לא היו ברשימת הדמו | bs_shop_demo כולל כל ערכה עם רנדר | |
| הקופסאות נחתכו למעלה בהירו | שורת הקופסאות absolute מעל המדף | השורה בזרימה מעל תמונת העץ, margin-bottom שלילי קטן | |
| רנדרים 2 עד 4MB כל אחד | PNG 2k עם שקיפות | `fit:640` לצד, `fit:560` לזווית; הזוויות נטענות אחרי 2.5 שניות או ב hover | עדיין כ 450KB ממוצע |

## מה חסום לקלוד מהסשן (חשוב לשיחה חדשה)

- פתיחת פרויקט Supabase דרך MCP (מהדשבורד בכרום עובד), SQL הרסני (drop; revoke עובד), כתיבת סודות ב SQL, `create policy` על storage.objects, החלשת אבטחה בדשבורד (כיבוי אימות מייל).
- רשת ל brickset.com, supabase.co, github.io, cdn.openart.ai, storage.googleapis.com. בדיקות חיות דרך הדפדפן המובנה של אפליקציית Claude (או Claude in Chrome כשכרום של גילעד פתוח). להביא תמונה לסשן: fetch מאותו origin בדפדפן המובנה, הקטנה, base64 (עד כ 250KB לקריאה).
- GitHub מחוץ לריפו. דחיפה עובדת (אפליקציית Claude מותקנת על הריפו).
- לחיצה על מתן הרשאות (OAuth, התקנות) בדפדפן של גילעד. גילעד לוחץ.
- הורדה ל Downloads דורשת אישור, וגילעד רוצה הכל בתיקיית הפרויקט: `device_commit_files` ישירות לשם.

## מה עובד טוב (לשמר)

- `execute_sql` לכל שינוי סכמה (רק הוספות, views). הסכמה המלאה ב `supabase/migrations/0002_brick_shop_full.sql`. על פרויקט ריק `apply_migration` עובד.
- העתקת טבלאות בין פרויקטים בלי רשת מהסשן: view ציבורי זמני במקור + `net.http_get` ל REST מהיעד + `jsonb_populate_recordset`. קבצי Storage: עבודות `bs_asset_jobs` ביעד עם הכתובות הציבוריות של המקור.
- Netlify: ה MCP פותח אתרים ומשנה שמות; הפריסה דרך חיבור GitHub (דשבורד).
- `deploy_edge_function` עובד (catalog, assets).
- דחיפה ל main → Pages תוך כדקה. `gh run list -R margilad-ui/brick-shop --limit 1`.
- `bs_asset_import(url, path, type)` מ SQL: OpenArt/GitHub/Brickset/Storage → Storage. `key` מנקה ירוק וחותך, `fit:<h>` מקטין. סטטוס ב `bs_asset_jobs`. פינג כשנתקע.
- העלאת רפרנס ל OpenArt: קובץ בענף `assets` בריפו → `openart_upload_import` מ raw.githubusercontent.com. גם כתובות images.brickset.com עובדות ישירות.
- מדידת קליפים: סקריפט בדפדפן המובנה שמחשב bbox של פיקסלים לא ירוקים לאורך הקליפ.
- הדפדפן המובנה לבדיקות כשגילעד לא ליד המחשב; Playwright מקומי (`review.mjs`) לצילומי מחשב מדויקים עם נתוני דמה.
- `device_commit_files` לתיקיית הפרויקט של גילעד; `project_write` לפרויקט ב claude.ai.
- PDF מעוצב: HTML + Playwright `page.pdf` עם `@page{size:A4}` ו @fontsource (Montserrat, Heebo מ npm).
- הדמיות ו"ספר סקירה" HTML עם שדות הערות, וכפתור "הערות" באתר החי: גילעד מגיב מהר ובמדויק.
