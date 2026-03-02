import type { Database } from "../database.types";

type DB = Database;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;
type Profile = DB["planner"]["Tables"]["profiles"]["Row"];

export async function getProfile(
  client: Client,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await client
    .schema("planner")
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get profile: ${error.message}`);
  }
  return data;
}

export async function upsertProfile(
  client: Client,
  userId: string,
  updates: { homeCity?: string; typicalBudgetRange?: string }
): Promise<Profile> {
  const { data, error } = await client
    .schema("planner")
    .from("profiles")
    .upsert({
      id: userId,
      home_city: updates.homeCity ?? null,
      typical_budget_range: updates.typicalBudgetRange ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to upsert profile: ${error.message}`);
  return data;
}

export async function ensureProfile(
  client: Client,
  userId: string
): Promise<Profile> {
  const existing = await getProfile(client, userId);
  if (existing) return existing;

  const { data, error } = await client
    .schema("planner")
    .from("profiles")
    .insert({ id: userId })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create profile: ${error.message}`);
  return data;
}
