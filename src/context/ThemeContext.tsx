import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Theme } from '../types'

interface ThemeContextValue {
  theme: Theme | null
  loading: boolean
  applyTheme: (themeName: string, primary: string, accent: string, bg?: string) => Promise<void>
  refreshTheme: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const PRESET_THEMES: Record<string, { primary: string; accent: string; bg: string }> = {
  green: { primary: '#1d7556', accent: '#f59e0b', bg: '#f8fafc' },
  blue: { primary: '#1e40af', accent: '#0ea5e9', bg: '#f8fafc' },
  dark: { primary: '#0f172a', accent: '#6366f1', bg: '#1e293b' },
  pesantren: { primary: '#14532d', accent: '#ca8a04', bg: '#fefce8' },
  modern: { primary: '#7c3aed', accent: '#ec4899', bg: '#fafafa' },
  classic: { primary: '#78350f', accent: '#b45309', bg: '#fef3c7' },
}

function applyCSSVars(primary: string, accent: string, bg: string) {
  const root = document.documentElement
  root.style.setProperty('--theme-primary', primary)
  root.style.setProperty('--theme-accent', accent)
  root.style.setProperty('--theme-bg', bg)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { pondok } = useAuth()
  const [theme, setTheme] = useState<Theme | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTheme = async (pondokId: string) => {
    const { data } = await supabase
      .from('themes')
      .select('*')
      .eq('pondok_id', pondokId)
      .eq('is_active', true)
      .maybeSingle()
    if (data) {
      setTheme(data as Theme)
      applyCSSVars(data.primary_color, data.accent_color, data.bg_color || '#f8fafc')
    } else {
      const preset = PRESET_THEMES['green']
      applyCSSVars(preset.primary, preset.accent, preset.bg)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (pondok) {
      loadTheme(pondok.id)
    } else {
      const preset = PRESET_THEMES['green']
      applyCSSVars(preset.primary, preset.accent, preset.bg)
      setLoading(false)
    }
  }, [pondok])

  const applyTheme = async (themeName: string, primary: string, accent: string, bg?: string) => {
    if (!pondok) return
    const bgColor = bg || '#f8fafc'
    await supabase.from('themes').upsert({
      pondok_id: pondok.id,
      theme_name: themeName,
      primary_color: primary,
      accent_color: accent,
      bg_color: bgColor,
      is_active: true,
    }, { onConflict: 'pondok_id,theme_name' })
    await supabase.from('themes')
      .update({ is_active: false })
      .neq('theme_name', themeName)
      .eq('pondok_id', pondok.id)
    applyCSSVars(primary, accent, bgColor)
    setTheme({
      id: '',
      pondok_id: pondok.id,
      theme_name: themeName,
      primary_color: primary,
      accent_color: accent,
      bg_color: bgColor,
      is_active: true,
      created_at: new Date().toISOString(),
    })
  }

  const refreshTheme = () => (pondok ? loadTheme(pondok.id) : Promise.resolve())

  return (
    <ThemeContext.Provider value={{ theme, loading, applyTheme, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export { PRESET_THEMES }
