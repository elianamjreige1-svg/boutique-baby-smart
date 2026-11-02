ALTER TABLE public.products ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
WITH r AS (SELECT id, row_number() OVER (ORDER BY created_at DESC) AS n FROM public.products)
UPDATE public.products p SET position = r.n FROM r WHERE r.id = p.id;