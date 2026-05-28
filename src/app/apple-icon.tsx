import { ImageResponse } from 'next/og'

export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 55%, #3b82f6 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 40,
      }}>
        <div style={{
          width: 92, height: 108,
          background: 'rgba(255,255,255,0.18)',
          clipPath: 'polygon(50% 0%, 100% 18%, 100% 62%, 50% 100%, 0% 62%, 0% 18%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            width: 7, height: 26,
            background: 'white', borderRadius: 4,
            transform: 'rotate(45deg) translate(7px, 7px)',
            top: '35%', left: '22%',
          }} />
          <div style={{
            position: 'absolute',
            width: 7, height: 42,
            background: 'white', borderRadius: 4,
            transform: 'rotate(-48deg) translate(-3px, 3px)',
            top: '22%', left: '44%',
          }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
