# BRICK Shop

מערכת המלאי והחנות של BRICK HOUSE. מסמכי הפרויקט המלאים ב `docs/` (00 עד 06).

- `src/` אפליקציית PWA (Vite + React + TypeScript), עברית RTL. מתארחת ב GitHub Pages.
- `supabase/migrations/` סכמת בסיס הנתונים (טבלאות `bs_*`).
- `supabase/functions/catalog/` פונקציית הקטלוג: חיפוש סט או ברקוד, סנכרון שנתי מ Brickset.

## פיתוח

```
npm install
npm run dev
```

החיבור ל Supabase ב `.env.production` (מפתח ציבורי בלבד). מפתחות Brickset ו Rebrickable מוזנים מתוך האפליקציה (עוד → מפתחות) ונשמרים בטבלה `bs_secrets`, קריאים רק לשרת.
