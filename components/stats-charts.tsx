"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DEFAULT_COLORS } from "@/lib/colors";
import type { BitacoraColors } from "@/lib/types";

export function StatsCharts({
  data,
  interval = "preserveStartEnd",
  colors = DEFAULT_COLORS,
}: {
  data: { date: string; percent: number }[];
  interval?: number | "preserveStartEnd";
  colors?: BitacoraColors;
}) {
  const axisTick = { fontSize: 10, fill: colors.mut };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={colors.track} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={axisTick}
            stroke={colors.deep}
            interval={interval}
          />
          <YAxis
            domain={[0, 100]}
            unit="%"
            tick={axisTick}
            stroke={colors.deep}
          />
          <Tooltip
            formatter={(value) => `${value}%`}
            cursor={{ fill: "rgba(255,255,255,0.06)" }}
            contentStyle={{
              background: colors.deckBg,
              border: `1px solid ${colors.blk}`,
              borderRadius: 0,
              fontFamily: "inherit",
              color: colors.fg,
            }}
          />
          <Bar dataKey="percent" fill={colors.green} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}