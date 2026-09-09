import { redirect } from "next/navigation";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function BitacoraHome() {
  redirect(`/bitacora/${todayISO()}`);
}