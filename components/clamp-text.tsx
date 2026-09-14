"use client";

import { useState } from "react";

const DEFAULT_MAX = 120;

export function ClampText({
  text,
  max = DEFAULT_MAX,
  className,
  as = "p",
}: {
  text: string;
  max?: number;
  className?: string;
  as?: "p" | "strong";
}) {
  const [expanded, setExpanded] = useState(false);
  const needsAction = text.length > max;
  const Tag = as;
  return (
    <>
      <Tag className={className}>
        {needsAction && !expanded ? `${text.slice(0, max).trimEnd()}…` : text}
      </Tag>
      {needsAction ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="cyb-link mt-1"
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      ) : null}
    </>
  );
}