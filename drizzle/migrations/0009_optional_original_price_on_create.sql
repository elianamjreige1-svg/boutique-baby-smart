CREATE OR REPLACE FUNCTION public.save_admin_product(_product jsonb, _original_price numeric DEFAULT NULL, _product_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  p public.products;
  saved_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF _original_price < 0 OR _original_price::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'Original price must be a valid amount of 0 or more';
  END IF;
  p := jsonb_populate_record(NULL::public.products, _product);
  IF _product_id IS NULL THEN
    INSERT INTO public.products (name, description, price, image_url, images, category_id, sizes, size_stock, stock, active, gender, age_group)
    VALUES (p.name, p.description, p.price, p.image_url, p.images, p.category_id, p.sizes, p.size_stock, p.stock, p.active, p.gender, p.age_group)
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.products SET name = p.name, description = p.description, price = p.price,
      image_url = p.image_url, images = p.images, category_id = p.category_id, sizes = p.sizes,
      size_stock = p.size_stock, stock = p.stock, active = p.active, gender = p.gender, age_group = p.age_group
    WHERE id = _product_id RETURNING id INTO saved_id;
    IF saved_id IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  END IF;
  IF _original_price IS NOT NULL THEN
    INSERT INTO public.product_original_prices (product_id, original_price) VALUES (saved_id, _original_price)
    ON CONFLICT (product_id) DO UPDATE SET original_price = EXCLUDED.original_price;
  ELSIF _product_id IS NOT NULL THEN
    DELETE FROM public.product_original_prices WHERE product_id = saved_id;
  END IF;
  RETURN saved_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_admin_product(jsonb, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_admin_product(jsonb, numeric, uuid) TO authenticated;