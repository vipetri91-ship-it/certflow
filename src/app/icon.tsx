import { ImageResponse } from 'next/og'

export const size        = { width: 512, height: 512 }
export const contentType = 'image/png'

// Ícone geométrico — sem texto para evitar problemas de fonte no Vercel
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 55%, #3b82f6 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 110,
      }}>

        {/* Escudo — feito com clip-path e bordas */}
        <div style={{
          width: 260, height: 300,
          background: 'rgba(255,255,255,0.15)',
          clipPath: 'polygon(50% 0%, 100% 18%, 100% 62%, 50% 100%, 0% 62%, 0% 18%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {/* Borda do escudo (camada atrás) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.3)',
            clipPath: 'polygon(50% 0%, 100% 18%, 100% 62%, 50% 100%, 0% 62%, 0% 18%)',
          }} />

          {/* Check mark — linha esquerda */}
          <div style={{
            position: 'absolute',
            width: 18, height: 72,
            background: 'white',
            borderRadius: 9,
            transform: 'rotate(45deg) translate(20px, 20px)',
            top: '36%', left: '24%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }} />

          {/* Check mark — linha direita (mais longa) */}
          <div style={{
            position: 'absolute',
            width: 18, height: 120,
            background: 'white',
            borderRadius: 9,
            transform: 'rotate(-48deg) translate(-8px, 8px)',
            top: '22%', left: '44%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }} />
        </div>

        {/* Círculo decorativo externo */}
        <div style={{
          position: 'absolute',
          width: 340, height: 340,
          borderRadius: '50%',
          border: '6px solid rgba(255,255,255,0.12)',
        }} />

        {/* 4 pontos decorativos nos cantos */}
        {[
          { top: 60,  left: 60  },
          { top: 60,  right: 60 },
          { bottom: 60, left: 60 },
          { bottom: 60, right: 60 },
        ].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', ...pos,
            width: 16, height: 16, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
          }} />
        ))}
      </div>
    ),
    { ...size }
  )
}
