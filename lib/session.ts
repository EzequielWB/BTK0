import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const AUTH_COOKIE = "bitakra_session";

export function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}::${password}`).digest("hex");
}

export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("password_config")
      .select("password_hash")
      .eq("id", 1)
      .single();

    if (error || !data) return false;
    return token === (data as { password_hash: string }).password_hash;
  } catch {
    return false;
  }
}