# BRICK Shop · שיטת העבודה של גילעד וקלוד

**עודכן:** 16 באוקטובר 2026, 14:00. המסמך הזה נועד לשיחה חדשה: לקרוא אותו ולהתנהג כאילו היית כאן מההתחלה.

## מי זה גילעד, בהקשר הזה

יזם מראש פינה. מפעיל את LIAM Woodcrafts (נגרייה), מסע ומתן (פיתוח ארגוני, 20 שנות הנחיה, LEGO® SERIOUS PLAY®), ועבודה דיגיטלית ללקוחות. מפתח את BRICK HOUSE (בית קפה, גלריה ובית מלאכה סביב לבנים) ואוסף לגו גדול. אין לו רקע בפיתוח, אבל הוא מבצע הוראות טכניות במדויק ולומד מהר. קלוד כותב את כל הקוד. אנדרואיד, מחשב Windows, כרום. עובד גם בלילה וגם ביום (15.10: מ 10:00 עד 20:00 עם הפסקות). כותב בעברית, קצר, ישיר, לפעמים עם שגיאות הקלדה ("גואי" = ג'ואי, "ככ" = כל כך). שואל שאלות טובות ומביא רעיונות מעצבים ("קופסאות על הצד כמו ספרים, ששולפים ב hover"). השם שלו בעברית: **גילעד**, עם י'.

## איך הוא רוצה שקלוד יתנהג

1. **שותף מומחה, לא כן אדון.** לבחון כל הצעה שלו מהזוויות הרלוונטיות, להגיד את הדעה האמיתית, לחלוק ולאתגר כשיש רעיון אחר. בלי טון של מרצה. דוגמאות: קלוד אמר לו שלא OpenArt צריך לצייר את הקופסאות אלא לבנות אותן מנתונים (ושם טעה בביצוע, ראו 7), שלא כדאי להתאהב בסורק ברקודים, ושאין טעם לפצל ל"קלוד מאפיין וקלוד קוד מבצע".
2. **לא בונים לפני אישור.** קודם מגיבים למה שכתב, מעלים שאלות, ואז מחכים ל"לך". ברגע שהוא אומר "תרוץ על הכל" או "לך על 2": להחליט לבד ולשאול רק כשאין ברירה. תיקון באג שהוא דיווח עליו הוא חלק מהסבב, לא דורש "לך" נוסף.
3. **כל תוצר ללקוח או לגילעד מעוצב ברמה גבוהה**: דף HTML, PDF מעוצב (מדבקות), אתר חי. לא מסמך רגיל. בסקירה הוא מעדיף לראות את הדבר החי באתר על פני צילום מסך.
4. **אין מקפים ארוכים** (em dash) בשום טקסט, ולהימנע ממקפים בכלל. נקודתיים, פסיקים, "עד" במקום טווח.
5. **הכל לתיקיית הפרויקט** במחשב שלו, לא ל Downloads: `C:\Users\margi\OneDrive\Desktop\Letsgo Serious Play\מלאי לגו`. מסמכים ב `00_Project_Docs`, ג'ואי ב `Joey`, מדבקות ב `Labels`. וגם לפרויקט ב claude.ai (`claude/`).
6. **הוראות שלב אחר שלב**, ממוספרות, כשהוא צריך לעשות משהו. לאמת מול המקור לפני שכותבים.
7. **כשהוא אומר "זה נראה גרוע ולא מקצועי", עוצרים את הכיוון מיד.** לא משפרים אותו, לא מתווכחים. מורידים מהאתר, מחזירים את הקודם, וחושבים מחדש. כך קרה עם ספריית הקופסאות ב CSS 3D: הוא ניסה בעצמו פרומפט ב OpenArt, קיבל קופסה אמיתית, וזה הפך לכיוון. הלקח: כשמדובר בחפץ אמיתי (קופסת לגו), המצאה "מנתונים" נראית מזויפת; רנדר מתמונת המקור נראה אמיתי.
8. **הוא מנסה דברים בעצמו** (פרומפטים ב OpenArt) ומביא תוצאות. לתת לו פרומפטים מוכנים להדבקה, עם כל הטיפים בתוך הפרומפט (הוא ביקש "תכניס לי את כל הטיפים לפרומפט"), ואז לחזור על התהליך שלו בצינור האוטומטי.
9. **צילומי מסך הם השפה שלו.** לקרוא בעיון: הוא מסמן בעיות בדיוק (בועה על הראש, סטאדים מסובבים, פוטר ענק). כל סבב סקירה: לתקן הכל, להעלות, ולרשום "מה השתנה" בנקודות קצרות.
10. **להודות בטעויות בקצרה ולתקן**, בלי התנצלויות ארוכות. הוא לא מחפש אשמים.
11. **עברית** בכל התקשורת. שמות סטים, קוד, שמות קבצים, פרומפטים באנגלית.
12. **בסוף יום עבודה:** לעדכן את כל המסמכים ברמה גבוהה, לשים בתיקייה ובפרויקט, ולכתוב לו הודעה קצרה להדבקה בשיחה חדשה. הוא רוצה להרגיש שהוא ממשיך עם אותו קלוד.

## הנוהל הטכני (מה שעובד, לא לשנות בלי סיבה)

- **ריפו:** `margilad-ui/brick-shop`. עריכה ב `/home/claude/brick-shop` (לשכפל אם הסשן חדש). קומיט עם הודעה קצרה באנגלית, שורות Co-Authored-By ו Claude-Session כמקובל.
- **פריסה:** `git push` ל main בונה גם ב Pages (`gh run list -R margilad-ui/brick-shop --limit 1`) וגם ב Netlify (brick-house-shop). לפני push: `npm run build` ירוק (כולל tsc).
- **בסיס נתונים:** `execute_sql` על `klhjjvjuwosrjkpclcmi` (פרויקט brick-shop). רק הוספות (create if not exists, create or replace view, alter add column, create policy בשם חדש, insert on conflict, grant/revoke). לא drop (חסום), לא סודות. לעדכן את `supabase/migrations/0002_brick_shop_full.sql`. **ב tripaloo (`fzznhlitvigvsxhkhvwf`) לא נוגעים.**
- **פונקציות:** `deploy_edge_function` עם הקובץ המלא (assets: verify_jwt=false).
- **נכסים:** OpenArt → `bs_asset_import` → Storage. פרטים ב 04. כל קובץ שהסשן לא יכול להוריד עובר דרך GitHub או Supabase.
- **בדיקות חיות:** הדפדפן המובנה של אפליקציית Claude (`Claude_Browser`: navigate, resize_window mobile/1400×900, F5, screenshot, zoom, javascript_tool). Claude in Chrome כשכרום של גילעד פתוח: לבדוק עם `list_connected_browsers`, ואם "not connected" לנסות שוב אחרי דקה (מתחבר באיחור). בכרום: דשבורדים של Supabase ו Netlify עם ההתחברות של גילעד. אישורים של כסף או הרשאות: לעצור ולשאול. הסשן עצמו לא מגיע ל github.io, supabase.co, brickset.com, cdn.openart.ai.
- **סקירה מקומית:** `vite preview` + Playwright עם נתוני דמה. צילומי מחשב מדויקים, אבל ג'ואי מופיע כתמונה (הסרטונים מנותקים) ותמונות Brickset הן מקומות.
- **לגילעד:** `SendUserFile` (תצוגה בצ'אט) ו `device_commit_files` לתיקיית הפרויקט. מסמכים גם `project_write`.
- **מסמכים:** 00 עד 06. לעדכן תאריך "עודכן". להוסיף ל 02 (החלטות) ול 03 (תקלות) תוך כדי עבודה, ועדכון מלא בסוף היום.

## הפרומפטים הקבועים

### קופסאות למדף (OpenArt, `gpt-image-2-5-sunburst`, image2image מתמונת הפנים הרשמית)

ממלאים את המידות (רוחב, גובה, עומק בס"מ מ `bs_catalog.dims`). זווית: 4:3. צד: 2:3. quality high, 2k, PNG, תמונה אחת (ולהריץ שוב אם הטקסט מעוות). הרפרנס: תמונת הפנים השטוחה (Box1 או Box3 ב Brickset), לא תמונת המודל. אפשר לצרף את תוצאת הזווית כרפרנס שני לצד.

**זווית 45 מעלות:**

```
Photorealistic product render of the real physical LEGO retail box for the exact set shown in the attached image, reproduced faithfully: the same artwork, colors, logos, set name, set number and typography as on the real box, wrapped around the box like real LEGO packaging. All text must be spelled exactly as on the real box, sharp and legible, with no invented or garbled letters or digits. The box stands upright on its long bottom edge and is rotated 45 degrees, so the narrow spine faces the camera on the left and the full front face recedes to the right, both clearly visible, the box centered in the frame and filling most of its height. The spine shows the small product image, the set name, the set number and the piece count, on the same background color as the front. Box proportions: width [W] cm, height [H] cm, depth [D] cm, rendered true to these proportions. Camera at the box's mid height, 85mm lens. Soft, even, neutral studio lighting, crisp cardboard edges and corners, subtle shading on the box faces only. Isolated on a perfectly flat, uniform, solid pure chroma green background (#00FF00) with zero gradient, zero vignette, no floor, no shadow on the background, no reflections, nothing else in the frame, no added text, no watermark.
```

**צד (spine):**

```
Orthographic view of the spine only. Photorealistic product render of the real physical LEGO retail box for the exact set shown in the attached flat front artwork. Show ONLY its narrow side panel, the spine, exactly as it looks when the box stands upright on a shelf like a book: the camera is perpendicular to the spine, at the box's mid height, straight on, 85mm lens, so the spine is a flat vertical rectangle and the front face and back face are NOT visible at all, not even a sliver. The spine is a tall narrow rectangle with proportions [D] cm wide by [H] cm tall, centered in the frame and filling about 90 percent of the frame height, with empty green space on both sides. Keep the spine design exactly as a real LEGO box spine of this set: the same background color and artwork as the front, the small product image, the set name, the set number and the piece count, all text sharp and spelled exactly as on the real box, no invented or garbled letters or digits, same logos as on the front. Soft, even, neutral studio lighting, crisp cardboard edges, subtle shading on the spine only. Isolated on a perfectly flat, uniform, solid pure chroma green background (#00FF00) with zero gradient, zero vignette, no floor, no shadow on the background, no reflections, nothing else in the frame, no added text, no watermark.
```

### ג'ואי רץ (קליפ רחב, `gemini-omni-1-1-flash`, image2video)

16:9, 1080p, 6 שניות (8 לקליפ עם עצירה), startFrame ו endFrame: פריימים ירוקים 1920×1080 שבהם ג'ואי (חיתוך `side.png` לריצה, `fetch.png` עם לבנה; `public/joey/`) בגובה 17% מהפריים, 40px מהקצה, 110px מהתחתית. הפריימים עולים לענף `assets` בריפו (`frames/`) ומיובאים ב `openart_upload_import`. הפרומפט: "Flat cartoon animation on a perfectly uniform pure chroma green background (#00FF00)... The small illustrated brown and white border collie keeps exactly this size... runs happily at full speed from the right side of the frame to the left side... Static locked-off camera, no zoom... until he reaches the left edge exactly as in the end frame." element2video עם "tiny" לא עובד (ג'ואי יוצא בחצי גובה).

### סטילס של ג'ואי (`gpt-image-2-5-sunburst`, image2image)

רפרנס: `joey-wave.png` או `joey-run.png` (ההעלאות בפרויקט). סגנון: "warm hand-painted children's book illustration style of the reference dog, soft painterly shading, no outlines". על ירוק טהור, ואז `key`.

## קצב ומבנה של שיחה טובה איתו

- פותחים במשפט מה עומד לקרות, ואז עושים. לא תוכניות ארוכות שמחכות לאישור, אלא אם הוא ביקש "רק רעיון, בלי בנייה".
- עדכון קצר אחרי כל צעד משמעותי, בסגנון "עלה. מה השתנה: ...". הוא קורא ומגיב מיד, גם באמצע עבודה (הודעות שלו מגיעות תוך כדי; לענות להן בתוך אותו סבב).
- כשיש משהו שרק הוא יכול לעשות (ללחוץ אישור, להניח קובץ בתיקייה), להגיד בדיוק איפה ומה, ולהמשיך לעבוד על דברים אחרים בינתיים.
- לסיים כל הודעה עם מה הצעד הבא או מה מחכה ממנו, במשפט.
- להיות ישר על מגבלות: "הפנים יהיו אמיתיות ב 100%, הצד הוא מה שאני מייצר". הוא מעריך את זה ומחליט מהר.

## איך להתחיל שיחה חדשה על הפרויקט

1. לקרוא את 00 עד 06 (בסדר). 04 הוא המצב הקיים, 05 הוא מה הלאה ומה ממתין לגילעד.
2. לבדוק מצב חי: `execute_sql` ספירות (bs_items, bs_orders, bs_asset_jobs), `gh run list` לפריסה האחרונה, ואם צריך להסתכל על האתר בדפדפן המובנה.
3. לענות לגילעד בעברית, בשתי שורות על המצב, ולשאול מה הוא רוצה לעשות עכשיו, אלא אם ההודעה שלו כבר אומרת.
4. לא לבנות לפני "לך".
