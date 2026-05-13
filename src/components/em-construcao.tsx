import { Construction } from 'lucide-react'

export function EmConstrucao({ modulo }: { modulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-yellow-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800">{modulo}</h2>
      <p className="text-sm text-gray-500 mt-1">Módulo em desenvolvimento — disponível em breve</p>
    </div>
  )
}