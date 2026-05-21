'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [dark,    setDark]    = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Lê preferência salva; padrão é escuro
    const saved = localStorage.getItem('certflow-theme')
    const isDark = saved ? saved === 'dark' : true
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('certflow-theme', next ? 'dark' : 'light')
  }

  // Evita hidration mismatch — não renderiza no servidor
  if (!mounted) return <div className="w-9 h-9" />

  return (
    <button
      onClick={toggle}
      title={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      className="p-2 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-slate-700 dark:hover:text-yellow-400 transition"
    >
      {dark
        ? <Sun  style={{ width: 18, height: 18 }} />
        : <Moon style={{ width: 18, height: 18 }} />}
    </button>
  )
}
