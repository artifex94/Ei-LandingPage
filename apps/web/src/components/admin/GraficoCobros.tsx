"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Mes {
  label: string;
  cobrado: number;
  pendiente: number;
}

interface Props {
  datos: Mes[];
}

const formatARS = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `$${(v / 1_000).toFixed(0)}k`
    : `$${v}`;

export function GraficoCobros({ datos }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatARS}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          formatter={(v) => `$${Number(v).toLocaleString("es-AR")}`}
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
          labelStyle={{ color: "#f1f5f9", fontWeight: 600 }}
          itemStyle={{ color: "#cbd5e1" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
          formatter={(v) => (v === "cobrado" ? "Cobrado" : "Pendiente")}
        />
        <Bar dataKey="cobrado" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="pendiente" fill="#475569" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
