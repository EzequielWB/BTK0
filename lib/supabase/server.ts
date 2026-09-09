import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createLocalClient } from "@/lib/local-client";

const LOCAL_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.LOCAL_MODE === "1";

export function isLocalMode(): boolean {
  return LOCAL_MODE;
}

export async function createClient() {
  if (LOCAL_MODE) {
    return createLocalClient();
  }

  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase. Copiá .env.local.example a .env.local y completalas."
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (set) => {
        try {
          for (const { name, value, options } of set) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // No se pueden setear cookies desde un Server Component; se ignora.
        }
      },
    },
  });
}