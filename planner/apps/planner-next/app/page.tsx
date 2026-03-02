import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

// Root page: redirect to planner
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");
  redirect("/(planner)");
}
