"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Segmento {
  nombre: string;
  valor: number;
  color: string;
}

interface Props {
  datos: Segmento[];
  titulo?: string;
}

export function GraficoDonut({ datos, titulo }: Props) {
  const total = datos.reduce((s, d) => s + d.valor, 0);

  return (
    <div>
      {titulo && (
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {titulo}
        </p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={datos}
            dataKey="valor"
            nameKey="nombre"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
          >
            {datos.map((s, i) => (
              <Cell key={i} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => { const n = Number(v); return [`${n} (${total ? Math.round((n / total) * 100) : 0}%)`, ""]; }}
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#f1f5f9" }}
            itemStyle={{ color: "#cbd5e1" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
            formatter={(v) => v}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
