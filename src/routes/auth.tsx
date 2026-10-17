import { createFileRoute, redirect } from "@tanstack/react-router";

// Old sign-in address: send anyone here to the admin login page.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/login", replace: true });
  },
});
