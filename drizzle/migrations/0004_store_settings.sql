CREATE TABLE public.store_settings (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), delivery_fee numeric NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write settings" ON public.store_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.store_settings (id) VALUES (1);