import { Header } from '@/components/header'
import { WidgetRFB } from '../../dashboard/widget-rfb'

export default function RfbPage() {
  return (
    <div className="flex flex-col h-full bg-[#EEF2FF] dark:bg-slate-900">
      <Header titulo="Responsável RFB" />
      <div className="flex-1 p-4 sm:p-6 flex items-start justify-center">
        <div className="w-full max-w-sm" style={{ height: '320px' }}>
          <WidgetRFB />
        </div>
      </div>
    </div>
  )
}