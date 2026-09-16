"use client";

import { logoutAction } from "@/lib/actions";

export function LogoffButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="cyb-link red icon"
        aria-label="Salir"
        title="Salir"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h7" />
          <path d="M13 12h8m-4-4 4 4-4 4" />
        </svg>
      </button>
    </form>
  );
}