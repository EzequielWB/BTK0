"use client";

import { resetCounterAction } from "@/lib/actions";
import { computeCounterView } from "@/lib/counters";
import type { CountersConfig } from "@/lib/types";

/** Recuadros de contadores del banner (junto al tag SYNC). El valor se
 * calcula en el servidor (prop `today`) para que server y cliente coincidan
 * en el hydration. El botón ↺ reinicia ese contador a 0. */
export function BannerCounters({
  config,
  today,
}: {
  config: CountersConfig;
  today: string;
}) {
  if (config.items.length === 0) return null;

  return (
    <span className="cyb-counters">
      {config.items.map((item) => {
        const { display, reached } = computeCounterView(item, today);
        return (
          <span
            key={item.id}
            className={"cyb-count" + (reached ? " reached" : "")}
            style={
              reached ? undefined : { background: config.box, color: config.text }
            }
            title={reached ? "Contador en el límite" : undefined}
          >
            <i>{item.name}</i>
            <b>{display}</b>
            {item.resettable ? (
              <button
                type="button"
                aria-label={`Reiniciar contador ${item.name}`}
                title="Reiniciar"
                className="cyb-count-btn"
                onClick={() => {
                  void resetCounterAction(item.id);
                }}
              >
                ↺
              </button>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}