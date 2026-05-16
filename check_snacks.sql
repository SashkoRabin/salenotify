-- Search for snack-like products in Kaufland offers
SELECT 
  title, 
  discount_percent,
  source_url
FROM offers 
WHERE chain = 'kaufland' 
  AND (
    title ILIKE '%pringles%' 
    OR title ILIKE '%lays%' 
    OR title ILIKE '%popcorn%' 
    OR title ILIKE '%chipsy%'
    OR title ILIKE '%kreker%'
    OR title ILIKE '%snack%'
  )
LIMIT 20;
