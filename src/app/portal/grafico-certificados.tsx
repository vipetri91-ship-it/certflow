'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'

interface Props {
  dados: { mes: string; total: number; label: string }[]
}

export function GraficoCertificados({ dados }: Props) {
  const mesAtual = dados[dados.length - 1]?.mes

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dados} margin={{ top: 20, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }}
          cursor={{ fill: '#eff6ff' }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {dados.map(entry => (
            <Cell key={entry.mes} fill={entry.mes === mesAtual ? '#7c3aed' : '#2563eb'} />
          ))}
          <LabelList
            dataKey="total"
            position="top"
            style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
