import { redirect } from "next/navigation";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** `?antesala=1` marca la entrada desde el login: la vista del día abre con la
 * ventana de la antesala. Navegar dentro de la bitácora no lo arrastra. */
export default async function BitacoraHome({
  searchParams,
}: {
  searchParams: Promise<{ antesala?: string | string[] }>;
}) {
  const { antesala } = await searchParams;
  const entry = antesala === "1" ? "?antesala=1" : "";
  redirect(`/bitacora/${todayISO()}${entry}`);
}
