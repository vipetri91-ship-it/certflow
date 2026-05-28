import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ erro: 'Nenhum arquivo enviado' }, { status: 400 })

  // Limite de 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ erro: 'Arquivo muito grande (máx. 10MB)' }, { status: 400 })
  }

  try {
    const blob = await put(`documentos/${Date.now()}-${file.name}`, file, {
      access: 'public',
    })
    return NextResponse.json({ url: blob.url, nome: file.name })
  } catch (err) {
    console.error('Erro no upload:', err)
    return NextResponse.json({ erro: 'Erro ao fazer upload do arquivo' }, { status: 500 })
  }
}
