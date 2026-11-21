COMMENT ON TABLE public.order_income_overrides IS 'DEPRECATED: unused; overall income editing uses accounting_settings instead.';
CREATE TABLE public.accounting_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  income_adjustment numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_settings TO authenticated;
GRANT ALL ON public.accounting_settings TO service_role;
ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin accounting settings" ON public.accounting_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.set_income_total(_total numeric) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE base_total numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF _total IS NULL OR _total < 0 OR _total > 9999999999.99 OR _total <> round(_total, 2) THEN RAISE EXCEPTION 'Invalid income total'; END IF;
  PERFORM pg_advisory_xact_lock(872634109);
  SELECT coalesce(sum(total), 0) INTO base_total FROM public.orders WHERE status IN ('confirmed', 'shipped', 'picked-up');
  INSERT INTO public.accounting_settings(id, income_adjustment, updated_at) VALUES (1, _total - base_total, now()) ON CONFLICT (id) DO UPDATE SET income_adjustment = EXCLUDED.income_adjustment, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.set_income_total(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_income_total(numeric) TO authenticated, service_role;