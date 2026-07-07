import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Module, CustomModule } from '../types'

export interface ModuleMeta {
  slug: string
  name: string
  description: string
  icon: string
  category: string
  builtin: boolean
}

const BUILTIN_MODULES: ModuleMeta[] = [
  { slug: 'santri', name: 'Santri', description: 'Manajemen data santri', icon: 'M12 4.354a4 4 0 110 5.292M15 8H3m6 0a4 4 0 014 4v3a4 4 0 01-4 4H3', category: 'akademik', builtin: true },
  { slug: 'guru', name: 'Guru & Staff', description: 'Manajemen guru dan staff', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z', category: 'akademik', builtin: true },
  { slug: 'absensi', name: 'Absensi', description: 'Pencatatan kehadiran', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', category: 'akademik', builtin: true },
  { slug: 'nilai', name: 'Nilai', description: 'Input dan rekap nilai', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', category: 'akademik', builtin: true },
  { slug: 'jadwal', name: 'Jadwal', description: 'Jadwal pelajaran', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', category: 'akademik', builtin: true },
  { slug: 'rapor', name: 'Rapor', description: 'Cetak rapor santri', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', category: 'akademik', builtin: true },
  { slug: 'finance', name: 'Keuangan', description: 'Pembayaran dan keuangan', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8', category: 'administrasi', builtin: true },
  { slug: 'inventaris', name: 'Inventaris', description: 'Manajemen aset/inventaris', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10', category: 'administrasi', builtin: true },
  { slug: 'surat', name: 'Surat', description: 'Surat masuk/keluar', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', category: 'administrasi', builtin: true },
  { slug: 'asrama', name: 'Asrama', description: 'Manajemen asrama', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z', category: 'pondok', builtin: true },
  { slug: 'tahfidz', name: 'Tahfidz', description: 'Tracking hafalan Quran', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253', category: 'pondok', builtin: true },
  { slug: 'perizinan', name: 'Perizinan', description: 'Permohonan izin santri', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', category: 'pondok', builtin: true },
  { slug: 'announcements', name: 'Pengumuman', description: 'Pengumuman lembaga', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6', category: 'umum', builtin: true },
  { slug: 'agenda', name: 'Agenda', description: 'Agenda dan kalender', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', category: 'umum', builtin: true },
]

interface ModuleContextValue {
  modules: Module[]
  customModules: CustomModule[]
  enabledSlugs: string[]
  loading: boolean
  installModule: (slug: string) => Promise<void>
  uninstallModule: (slug: string) => Promise<void>
  toggleModule: (slug: string, enabled: boolean) => Promise<void>
  refreshModules: () => Promise<void>
  getModuleMeta: (slug: string) => ModuleMeta | undefined
  builtinModules: ModuleMeta[]
}

const ModuleContext = createContext<ModuleContextValue | undefined>(undefined)

export function ModuleProvider({ children }: { children: ReactNode }) {
  const { pondok } = useAuth()
  const [modules, setModules] = useState<Module[]>([])
  const [customModules, setCustomModules] = useState<CustomModule[]>([])
  const [loading, setLoading] = useState(true)

  const loadModules = async (pondokId: string) => {
    const [modRes, customRes] = await Promise.all([
      supabase.from('modules').select('*').eq('pondok_id', pondokId).order('created_at', { ascending: true }),
      supabase.from('custom_modules').select('*').eq('pondok_id', pondokId).eq('is_enabled', true),
    ])
    setModules((modRes.data || []) as Module[])
    setCustomModules((customRes.data || []) as CustomModule[])
    setLoading(false)
  }

  useEffect(() => {
    if (pondok) {
      loadModules(pondok.id)
    } else {
      setModules([])
      setCustomModules([])
      setLoading(false)
    }
  }, [pondok])

  const enabledSlugs = modules.filter((m) => m.is_enabled).map((m) => m.slug)

  const installModule = async (slug: string) => {
    if (!pondok) return
    const meta = BUILTIN_MODULES.find((m) => m.slug === slug)
    if (!meta) return
    await supabase.from('modules').upsert({
      pondok_id: pondok.id,
      slug: meta.slug,
      name: meta.name,
      description: meta.description,
      icon: meta.icon,
      category: meta.category,
      is_builtin: true,
      is_enabled: true,
    }, { onConflict: 'pondok_id,slug' })
    await loadModules(pondok.id)
  }

  const uninstallModule = async (slug: string) => {
    if (!pondok) return
    await supabase.from('modules').delete().eq('pondok_id', pondok.id).eq('slug', slug)
    await loadModules(pondok.id)
  }

  const toggleModule = async (slug: string, enabled: boolean) => {
    if (!pondok) return
    await supabase.from('modules').update({ is_enabled: enabled }).eq('pondok_id', pondok.id).eq('slug', slug)
    await loadModules(pondok.id)
  }

  const refreshModules = () => (pondok ? loadModules(pondok.id) : Promise.resolve())

  const getModuleMeta = (slug: string) => BUILTIN_MODULES.find((m) => m.slug === slug)

  return (
    <ModuleContext.Provider value={{
      modules, customModules, enabledSlugs, loading,
      installModule, uninstallModule, toggleModule, refreshModules, getModuleMeta,
      builtinModules: BUILTIN_MODULES,
    }}>
      {children}
    </ModuleContext.Provider>
  )
}

export function useModules() {
  const ctx = useContext(ModuleContext)
  if (!ctx) throw new Error('useModules must be used within ModuleProvider')
  return ctx
}
