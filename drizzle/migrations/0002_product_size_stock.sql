ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_stock jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.products SET size_stock = (SELECT coalesce(jsonb_object_agg(s, stock), '{}'::jsonb) FROM unnest(sizes) s) WHERE size_stock = '{}'::jsonb AND array_length(sizes,1) > 0;
CREATE OR REPLACE FUNCTION public.check_stock(_items jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('productId', p.id, 'size', i->>'size', 'name', p.name,
    'available', CASE WHEN NOT p.active THEN 0 WHEN i->>'size' IS NOT NULL AND p.size_stock ? (i->>'size') THEN (p.size_stock->>(i->>'size'))::int ELSE p.stock END)), '[]'::jsonb)
  FROM jsonb_array_elements(_items) i JOIN public.products p ON p.id = (i->>'productId')::uuid;
$$;
GRANT EXECUTE ON FUNCTION public.check_stock(jsonb) TO anon, authenticated;