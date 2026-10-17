# BRICK Shop · מצב קיים

**עודכן:** 16 באוקטובר 2026, 14:00. המספרים נכונים לרגע הכתיבה (נבדקו ב SQL בפרויקט brick-shop).

## באוויר

- **המשרד האחורי:** https://margilad-ui.github.io/brick-shop/ (PWA. בטלפון: כרום → תפריט → "הוסף למסך הבית"). גם ב https://brick-house-shop.netlify.app/
- **BRICK Shop ללקוחות:** https://margilad-ui.github.io/brick-shop/shop/ וגם https://brick-house-shop.netlify.app/shop/ (אותו קוד, אותו בסיס נתונים; ב Netlify קישורים עמוקים מחזירים 200) (`?nointro` מדלג על רגע הפתיחה, `?intro` מפעיל. כפתור EN לאנגלית. ה PWA שומר מטמון: אחרי פריסה חדשה, רענון אחד)
- **כניסה למשרד האחורי:** mar.gilad@gmail.com, סיסמה שגילעד בחר בהרשמה בפרויקט החדש (16.10). קלוד לא יודע אותה ולא צריך. הטריגר `bs_auto_owner` הופך את המייל הזה לבעלים אוטומטית.
- **מה בבסיס הנתונים:** קטלוג 8,448 סטים (2018 עד 2026, כולל ברקודים). 15 שורות מלאי (20 יחידות), הספירה בעיצומה. 30 מיקומים ב 5 אזורים. 15 תיאורים בעברית (לסטים שבמלאי, בקול של ג'ואי). 2 הזמנות: #1001 (status test, של קלוד) ו #1002 (status new, בדיקה של גילעד בוואטסאפ, 850 ש"ח). 157 עבודות נכסים.

## תשתית

| רכיב | פרטים |
|---|---|
| קוד | GitHub `margilad-ui/brick-shop`, ענף `main`, ציבורי. אפליקציית Claude מותקנת על הריפו. ענף `assets` לפריימים של OpenArt (לא נפרס) |
| אירוח | שניים במקביל מאותו ריפו: GitHub Pages (base `/brick-shop/`, Actions, `404.html` fallback) ו **Netlify** (אתר `brick-house-shop`, צוות "Gilad" Pro, base `/`, `netlify.toml`, `_redirects`). כל push ל main בונה בשניהם (כדקה) |
| בסיס נתונים | Supabase, ארגון "Gilad Zur" (Pro), פרויקט **`brick-shop`**, ref **`klhjjvjuwosrjkpclcmi`**, eu-central-1 (נפתח 16.10, 10$ לחודש). מפתח ציבורי `sb_publishable_VpTNfcZW…` ב `.env.production`. Auth: אימות מייל פעיל, תבנית "Confirm sign up" כוללת קוד 6 ספרות, Site URL = Pages |
| טבלאות (ניהול) | `bs_owners`, `bs_catalog`, `bs_zones`, `bs_locations`, `bs_items`, `bs_movements`, `bs_settings`, `bs_secrets`, `bs_asset_jobs`, `bs_catalog_images`, `bs_orders`, view `bs_inventory`. RLS דרך `bs_is_owner()` |
| שכבת החנות (ציבורית) | views `bs_shop`, `bs_shop_demo` (62 ערכות: 3 לסדרה + כל ערכה עם רנדר קופסה), `bs_shop_catalog`, `bs_shop_boxes` (front/back/prod מ Brickset), `bs_shop_box_art` (8 ערכות עם צד + זווית). פונקציות `bs_shop_config()`, `bs_place_order(jsonb)` |
| הגדרות (bs_settings) | `shop_demo` true, `shop_whatsapp` 972525000553, `shop_bit_phone` 0525000553, `usd_ils` 3.1, `retired_multiplier` 1.2, `vat_included` true |
| חלקים | `bs_items` עם `kind='parts'` ועמודות `part_no, color_id, color_name, part_cat, bl_price` (ייחודי לפי חלק+צבע). `bs_import_parts(rows, location, status)` (בעלים בלבד, קובע כמות). התמונה ברשימה: `img.bricklink.com/ItemImage/PN/<color>/<part>.png` |
| תוויות מיקום | `src/labels/locations.ts`: `box5070` (384×560), `round31` (248×248), `round50` (384×400), QR ל `?loc=<code>`. נפתח מהגדרות → מקומות |
| תוויות | `src/labels/` (נטען לפי דרישה, כ 1.1MB, מחוץ ל precache): `render.ts` (קנבס 384×240, 1-bit, LDraw מ `raw.githubusercontent.com/gkjohnson/ldraw-parts-library`, QR ל `?p=part.color`), `printer.ts` (NiimBlue `@mmote/niimbluelib` 0.47.0, צפיפות 1 עד 5, PDF ב jsPDF), `LabelSheet.tsx` |
| פונקציות Edge | `catalog` (verify_jwt): lookup, sync, usage. `assets` (verify_jwt=false, גרסה 5): העתקה, `key`, `fit:<h>`, `brickset`. `photo` (verify_jwt, בעלים בלבד, גרסה 3): העלאת צילום או קישור לתמונה ל `items/<uuid>.jpg`, ו `{ proxy }` לתמונות BrickLink בשביל התוויות |
| Storage (`bs-assets`, ציבורי) | `joey/keyed/{wave,run,wait,detective,present}.png` (שקופים, 2k), `joey/raw/*.png` (ירוקים), `joey/video/{run,run-lr,look,steal,jump,tumble,greet,peek,nap,sniff}.mp4` (ירוקים, 1080p; greet בהירו, peek בפוטר, nap בעגלה ריקה, sniff בכספת, run-lr ב Intro), `joey/video/wide-{run,run2,run-lr,look,fetch,jump}.mp4` (רחבים; הרץ משתמש ב run2, run-lr, look, fetch, jump; wide-run הוא ניסיון element2video שלא בשימוש), `shelf/raw|keyed/shelf-{a,b}.png` (מדף עץ מצויר; a בשימוש), `boxes/raw|keyed|web/<set_num>-{spine,angle}.png` (רנדרי קופסאות: 42238, 10344, 40699, 21319, 75280, 31203, 10278, 21322; ל 71044 רק spine), `brand/joey-ref-b.jpg` |
| OpenArt | פרויקט "BRICK HOUSE" (`zPRuoHwP195hvbXeVTPx`). העלאות: joey-run, joey-wave, 9 פנים של קופסאות, 6 פריימים. סה"כ כ 5,000 קרדיטים נוצלו (ג'ואי: 5 תמונות, 15 סרטונים; קופסאות: 19 תמונות; מדף: 2). יתרה כ 110,000 |
| תמונות ערכות | `bs_catalog_images`: 75 ערכות, 1,032 תמונות רשמיות. לערכה חדשה במלאי: `select bs_asset_import(set_num, brickset_id::text, 'brickset')` |
| מייל | SMTP דרך Resend (`smtp.resend.com`, שולח `onboarding@resend.dev` בשם BRICK HOUSE, מגבלה 30 בשעה). בלי דומיין מאומת Resend שולח רק למייל של גילעד, מספיק למשרד האחורי. תבניות "Confirm sign up" ו "Reset password" כוללות קוד `{{ .Token }}` (הפרויקט שולח 8 ספרות) |
| tripaloo (הישן) | `fzznhlitvigvsxhkhvwf`. הטבלאות `bs_*` וה bucket עדיין שם, לא נגעו ולא נמחקו (גיבוי). נוסף שם view `bs_mig_catalog` בלי הרשאות. למחוק הכל רק באישור גילעד, אחרי שבוע שקט |

## מה עובד (נבדק 15.10 ערב)

**משרד אחורי:** כניסה (כולל "שכחתי סיסמה" עם קוד במייל, 16.10), הוספה (5 עד 7 ספרות → כרטיס → הוסף), **פריט ללא מספר** עם צילום וברקוד (16.10), רשימה וטבלה, מגירה, הגדרות, CSV. **סט שכבר במלאי (16.10):** הכרטיס מציג את השורות הקיימות עם "+N → סה"כ" לכל שורה (מוסיף לשורה הקיימת, גם במדף אחר, ורושם תנועה) וכפתור "שורה חדשה במדף X". `addItem(n, { mergeInto | forceNew })` ב api.ts.

**החנות:**
- רגע פתיחה: דלתות צהובות, לוגו שנבנה מלבנים, ג'ואי רץ, הדלתות נפתחות (6.4 שניות, דילוג).
- דף הבית: החדר הצהוב עם 5 לבנות 2x4 איזומטריות שצפות באזורים מתים; כותרת "הדלת פתוחה. / הלבנים מחכות." ממורכזת; **מדף הקופסאות**: מדף עץ מצויר עם 8 קופסאות אמיתיות על הצד בגובה האמיתי (hover שולף ומסובב ל 45 מעלות עם צל, לחיצה לדף המוצר, בטלפון נגיעה ואז נגיעה שנייה), הקופסאות עולות אחת אחת בכניסה; ג'ואי בסרטון קבלת פנים מתחת למדף עם בועה שיוצאת מהאף; ארבעה חדרים (לבנים); "ג'ואי בחר" עם חותמת ג'ואי; "לפי עולם" (רקע מחליף צבע); שלוש הבטחות; פוטר קומפקטי עם ג'ואי מציץ מהארגז מעל "ראש פינה · © 2026".
- **ג'ואי הרץ:** 7 שניות אחרי הטעינה ואז כל 30 עד 55 שניות, קליפ רחב אקראי (לא אותו אחד פעמיים): ריצה ימינה, ריצה שמאלה, עוצר באמצע ומסתכל (פריים 70%), בורח עם לבנה אדומה, קופץ ותופס לבנה צהובה. נכנס ויוצא בקצות המסך האמיתיים בכל רוחב. בנייד הפריים 170vw.
- כל הערכות: סינון (הכל, פרשו, חדש, עד 150, מעל 1,000 חלקים, Polybags), סדרה, מיון, חיפוש, טעינה ב 24. כרטיס עם סטאדים בצבע הסדרה, תגיות, מחיר, כפתור לבנה.
- לאספנים: "הכספת" הכהה עם ג'ואי הבלש (סרטון), ערכה מובילה ונתונים.
- דף מוצר: גלריה (קופסה + כל התמונות הרשמיות, תמונות קטנות, לייטבוקס עם חצים), ארבעה אריחים (חלקים, מיניפיגורות, גיל, שנה), תיבת רכישה דביקה עם ג'ואי מציג, "ג'ואי על הערכה", התיאור הרשמי בפסקאות עם "קראו עוד", פרטי הערכה, "עוד מהעולם הזה".
- עגלה: הארגז (מגירה), כמויות עד המלאי, "הבאתי!" עם ג'ואי, התמונה עפה לעגלה, ג'ואי ישן כשריק.
- רכישה: שלושה שלבים, סיכום, שמירה ב bs_orders, סיום עם ביט (סכום, מספר, מספר הזמנה, העתקה) או וואטסאפ עם ההזמנה מוכנה. נבדק על ידי גילעד (#1002).
- הבית (אודות), 404 עם ג'ואי ולבנים, כפתור "הערות" צף, ניווט תחתון בנייד, EN/עב.

**מדבקות מדף:** `Labels\BRICK_HOUSE_Shelf_Labels.pdf`, A4 לרוחב, 2 עמודים, 15 רצועות (A1 עד A5, B1 עד B3, C1 עד C7), 285 מ"מ אורך, 16 מ"מ גובה (A1 ו A2: 12), להדפיס ב 100%.

## מה לא נבדק או ידוע כחסר

- **Safari / iPhone:** ניקוי WebGL אמור לעבוד, לא נבדק. יש נפילה לתמונה.
- **משקל:** רנדרי הקופסאות PNG, כ 450KB ממוצע (17 קבצים, 7.6MB בסך הכל). הצדדים נטענים מיד, הזוויות אחרי 2.5 שניות או ב hover. סרטוני ג'ואי 2.8 עד 5.2MB כל אחד, נטענים לפי הצורך. בנייד ברשת חלשה מורגש. אפשרויות: WebP לרנדרים, 720p לסרטונים.
- **הרץ בטלפון** עם הקליפים הרחבים: לא נבדק בטלפון אמיתי (ג'ואי יוצא כ 23% מרוחב המסך).
- **Astro Bot (40899)** של גילעד: הרנדרים שלו (צד + 45) נוצרו מחוץ לפרויקט BRICK HOUSE ב OpenArt. ממתין שיניח אותם ב `Joey\boxes\40899-1-spine.png` ו `40899-1-angle.png`; קלוד מעלה (דרך ענף assets או ישירות) ומוסיף.
- **המדפים במשרד האחורי** לא תואמים למציאות (6 לכל קיר במערכת; בפועל A: 5, B: 3, C: 7). ממתין ל"לך".
- **מחירים:** מחירי המלאי הם מה שגילעד הזין. מחירי הדמו מחושבים. לא KSP (אבן דרך 3).
- **תמונות:** נטענות חי מ images.brickset.com. אין עותק משלנו.
- **משרד אחורי:** אין מסך הזמנות (bs_orders רק ב SQL), אין רענון בזמן אמת, אין QR, אין תמונה לפריט שאינו בקטלוג.
- **דוח הסורק וה PWA** מגילעד: עדיין לא התקבל.
- **הזמנות הבדיקה** #1001 ו #1002 נשארו. אפשר למחוק (`delete from bs_orders where number in (1001,1002)`, דורש אישור כי זו מחיקה; או לעדכן status ל test).

## איך מתחזקים (מתכונים לשיחה חדשה)

- **לשנות קוד:** `/home/claude/brick-shop` (לשכפל אם הסשן חדש: `git clone --depth 1 https://github.com/margilad-ui/brick-shop`), `npm install`, `npm run build` חייב לעבור, קומיט, `git push`. לבדוק: `gh run list -R margilad-ui/brick-shop --limit 1`.
- **סקירה מקומית במחשב (בלי רשת):** `npx vite preview --port 4173 --strictPort` ואז סקריפט Playwright קצר שמזריק `window.__BS_MOCK` (snapshot של bs_shop + bs_shop_demo + boxart), מחליף כתובות Brickset בתמונות מקום, ומנתק סרטונים. נשמר ב scratchpad, לא בריפו; לבנות מחדש אם צריך (כ 40 שורות).
- **סקירה חיה:** הדפדפן המובנה של אפליקציית Claude (`Claude_Browser`), preset mobile או 1400×900. רענון עם F5 אחרי פריסה. Claude in Chrome רק כשכרום של גילעד פתוח.
- **לכבות את הדמו:** `update bs_settings set value='false' where key='shop_demo'`.
- **נכס מ OpenArt:** `select bs_asset_import('<cdn url>', 'joey/video/x.mp4', 'video/mp4')`. לנקות ירוק: `bs_asset_import('<storage url>', 'joey/keyed/x.png', 'key')`. עותק ווב: `bs_asset_import('<keyed url>', 'boxes/web/x.png', 'fit:640')`. סטטוס: `select * from bs_asset_jobs order by id desc`. נתקע ב running: `update bs_asset_jobs set status='pending' where status='running'` ופינג (`net.http_post`, ראו 03).
- **קופסה חדשה למדף (ערכה עם Box1/Box3 ב Brickset, או צילום פנים ישר):** 1) להעלות ל OpenArt: `openart_upload_import` עם כתובת images.brickset.com (או קובץ בענף assets). 2) שני הפרומפטים מ 06 ב `gpt-image-2-5-sunburst` image2image: זווית 4:3, צד 2:3, high, 2k, png, עם המידות מ `bs_catalog.dims`. 3) `bs_asset_import(cdn, 'boxes/raw/<set>-angle.png', 'image/png')` וכן spine. 4) key ל `boxes/keyed/`. 5) `fit:560` (זווית) ו `fit:640` (צד) ל `boxes/web/`. הערכה נכנסת למדף ולדמו לבד (views). לבדוק את הרנדר (מספר הערכה, טקסט). רנדר שנדחה על ידי מסנן בטיחות: לא לנסות שוב.
- **קליפ רחב חדש של ג'ואי:** פריימים ירוקים 1920×1080 עם חיתוך ג'ואי בגובה 17% בקצה (ראו 06), ענף assets, `openart_upload_import`, `gemini-omni-1-1-flash` image2video עם startFrame ו endFrame, 1080p, 6 שניות. למדוד bbox בדפדפן ולכוון `--x0/--x1` ב shop.css.
- **לשנות סכמה:** `execute_sql` על `klhjjvjuwosrjkpclcmi`, רק הוספות ו views. לעדכן את `supabase/migrations/0002_brick_shop_full.sql` (המקור).
- **פריסה:** push ל main. Pages: `gh run list -R margilad-ui/brick-shop --limit 1`. Netlify: `netlify-project-services-reader get-project` עם siteId `ed85c575-eb7d-46f7-b11e-ad8d39180d78`, או https://app.netlify.com/projects/brick-house-shop/deploys. גיבוי לגרירה ידנית: `VITE_BASE=/ npm run build` ואז `dist` לתיקייה `מלאי לגו\Netlify`.
- **הזמנות:** `select * from bs_orders order by number desc`.
- **מדבקות מדף:** `labels.html` + Playwright `page.pdf` (A4 landscape, printBackground). פונטים מ `@fontsource/montserrat` ו `@fontsource/heebo` (npm). לשנות מדפים: הרשימה `walls` בסקריפט.
- **קבצים לגילעד:** `device_commit_files` לתיקייה `C:\Users\margi\OneDrive\Desktop\Letsgo Serious Play\מלאי לגו`. מסמכים: `00_Project_Docs` וגם `project_write` ל `claude/`. ג'ואי: `Joey`. מדבקות: `Labels`.
