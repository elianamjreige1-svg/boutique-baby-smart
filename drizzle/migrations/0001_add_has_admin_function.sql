CREATE OR REPLACE FUNCTION public.has_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists(
    select 1
    from public.user_roles
    where role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.has_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_admin() TO anon, authenticated, service_role;