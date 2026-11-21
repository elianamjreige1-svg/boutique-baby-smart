ALTER TABLE public.orders ADD COLUMN picked_up_at timestamptz;
CREATE TABLE public.order_income_overrides (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_income_overrides TO authenticated;
GRANT ALL ON public.order_income_overrides TO service_role;
ALTER TABLE public.order_income_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin income overrides" ON public.order_income_overrides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.accounting_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_expenses TO authenticated;
GRANT ALL ON public.accounting_expenses TO service_role;
ALTER TABLE public.accounting_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin expenses" ON public.accounting_expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));