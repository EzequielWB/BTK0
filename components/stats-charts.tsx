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

const AXIS_TICK = { fontSize: 10, fill: "#8f8f8f" };

export function StatsCharts({
  data,
}: {
  data: { date: string; percent: number }[];
}) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            stroke="#4d4d4d"
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            unit="%"
            tick={AXIS_TICK}
            stroke="#4d4d4d"
          />
          <Tooltip
            formatter={(value) => `${value}%`}
            cursor={{ fill: "rgba(255,255,255,0.06)" }}
            contentStyle={{
              background: "#050505",
              border: "1px solid #1f1f1f",
              borderRadius: 0,
              fontFamily: "inherit",
              color: "#f2f2f2",
            }}
          />
          <Bar dataKey="percent" fill="#00ff9d" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}