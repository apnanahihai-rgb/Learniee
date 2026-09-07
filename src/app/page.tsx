import { redirect } from "next/navigation";

// The root route no longer shows a "Log in / Sign up" choice screen —
// it redirects straight to /login. Sign up is still reachable from
// there via the tab switcher on the login page itself.
export default function HomePage() {
  redirect("/login");
}
