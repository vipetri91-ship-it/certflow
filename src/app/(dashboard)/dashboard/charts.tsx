'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const receitaMensal = [
  { mes: 'Jan', receita: 8200, despesa: 3100 },
  { mes: 'Fev', receita: 9500, despesa: 2800 },
  { mes: 'Mar', receita: 11200, despesa: 3400 },
  { mes: 'Abr', receita: 10800, despesa: 3200 },
  { mes: 'Mai', receita: 12500, despesa: 4100 },
  { mes: 'Jun', receita: 13800, despesa: 3800 },
]

const pedidosPorTipo = [
  { tipo: 'A1 PF', total: 45 },
  { tipo: 'A1 PJ', total: 32 },
  { tipo: 'A3 Token', total: 28 },
  { tipo: 'A3 Cartão', total: 15 },
  { tipo: 'A3 Nuvem', total: 12 },
]

const vencimentos = [
  { name: 'Vencidos', value: 8, cor: '#ef4444' },
  { name: '7 dias', value: 12, cor: '#f97316' },
  { name: '15 dias', value: 18, cor: '#eab308' },
  { name: '30 dias', value: 25, cor: '#3b82f6' },
  { name: '60 dias', value: 37, cor: '#8b5cf6' },
]

const formatarReais = (valor: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(valor))

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Receita vs Despesa */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Receita vs Despesa (últimos 6 meses)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={receitaMensal}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatarReais} tick={{ fontSize: 11 }} width={70} />
            <Tooltip formatter={(v) => formatarReais(v as number)} />
            <Legend />
            <Area
              type="monotone"
              dataKey="receita"
              name="Receita"
              stroke="#3b82f6"
              fill="url(#colorReceita)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="despesa"
              name="Despesa"
              stroke="#ef4444"
              fill="url(#colorDespesa)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Vencimentos por período */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Vencimentos</h2>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={vencimentos}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              nameKey="name"
            >
              {vencimentos.map((entry) => (
                <Cell key={entry.name} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v} cert.`} />
            <Legend iconSize={10} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Pedidos por tipo de certificado */}
      <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Pedidos por Tipo de Certificado (mês atual)</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={pedidosPorTipo} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="tipo" type="category" tick={{ fontSize: 12 }} width={80} />
            <Tooltip />
            <Bar dataKey="total" name="Pedidos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}