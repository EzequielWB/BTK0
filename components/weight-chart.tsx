"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DEFAULT_COLORS } from "@/lib/colors";
import type { BitacoraColors } from "@/lib/types";
import { kilogramLabel } from "@/lib/weight";

export function WeightChart({
  data,
  colors = DEFAULT_COLORS,
}: {
  data: { label: string; peso: number | null }[];
  colors?: BitacoraColors;
}) {
  const values = data
    .map((point) => point.peso)
    .filter((value): value is number => value !== null);

  const axisTick = { fontSize: 10, fill: colors.mut };

  if (values.length === 0) {
    return (
      <p className="cyb-hint text-sm">
        Todavía no hay pesos registrados en este mes. Cargá el primero y aparece
        el gráfico.
      </p>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, Math.ceil((max - min) * 0.1));
  const yDomain = [
    Math.floor((min - pad) * 10) / 10,
    Math.ceil((max + pad) * 10) / 10,
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={colors.track} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={axisTick}
            stroke={colors.deep}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            unit=" kg"
            tick={axisTick}
            stroke={colors.deep}
          />
          <Tooltip
            formatter={(value) => kilogramLabel(Number(value))}
            labelFormatter={(label) => `Día ${label}`}
            cursor={{ stroke: colors.deep, strokeDasharray: "3 3" }}
            contentStyle={{
              background: colors.deckBg,
              border: `1px solid ${colors.blk}`,
              borderRadius: 0,
              fontFamily: "inherit",
              color: colors.fg,
            }}
          />
          <Line
            dataKey="peso"
            type="monotone"
            stroke={colors.green}
            strokeWidth={2}
            connectNulls
            dot={{ r: 3, fill: colors.green, stroke: colors.green }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}