import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner } from '../components/ui'
import type { WorkspaceWidget } from '../types'

/* ============================================================
 * Widget type registry
 * ============================================================ */

type WidgetType =
  | 'stat-santri'
  | 'stat-guru'
  | 'stat-kelas'
  | 'stat-asrama'
  | 'stat-perizinan'
  | 'stat-payments'
  | 'jadwal-hari-ini'
  | 'absensi-hari-ini'
  | 'pengumuman-terbaru'
  | 'grafik-kehadiran'
  | 'agenda-mendatang'
  | 'perizinan-pending'

interface WidgetMeta {
  type: WidgetType
  title: string
  description: string
  icon: string
  defaultWidth: 1 | 2 | 3 | 4
  category: 'Statistik' | 'Jadwal & Absensi' | 'Informasi' | 'Administrasi'
}

const WIDGET_REGISTRY: Record<WidgetType, WidgetMeta> = {
  'stat-santri': { type: 'stat-santri', title: 'Santri Aktif', description: 'Jumlah santri yang aktif', icon: 'M12 4.354a4 4 0 110 5.292M15 8H3m6 0a4 4 0 014 4v3a4 4 0 01-4 4H3', defaultWidth: 1, category: 'Statistik' },
  'stat-guru': { type: 'stat-guru', title: 'Guru & Staff', description: 'Jumlah guru dan staff aktif', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z', defaultWidth: 1, category: 'Statistik' },
  'stat-kelas': { type: 'stat-kelas', title: 'Kelas', description: 'Total kelas terdaftar', icon: 'M8 14l3-3 3 3 5-5', defaultWidth: 1, category: 'Statistik' },
  'stat-asrama': { type: 'stat-asrama', title: 'Asrama', description: 'Total asrama terdaftar', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z', defaultWidth: 1, category: 'Statistik' },
  'stat-perizinan': { type: 'stat-perizinan', title: 'Izin Menunggu', description: 'Permohonan izin belum diproses', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', defaultWidth: 1, category: 'Administrasi' },
  'stat-payments': { type: 'stat-payments', title: 'Pembayaran Tertunggak', description: 'Pembayaran berstatus belum bayar', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8', defaultWidth: 1, category: 'Administrasi' },
  'jadwal-hari-ini': { type: 'jadwal-hari-ini', title: 'Jadwal Hari Ini', description: 'Daftar jadwal pelajaran hari ini', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', defaultWidth: 2, category: 'Jadwal & Absensi' },
  'absensi-hari-ini': { type: 'absensi-hari-ini', title: 'Absensi Hari Ini', description: 'Ringkasan kehadiran santri hari ini', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', defaultWidth: 2, category: 'Jadwal & Absensi' },
  'pengumuman-terbaru': { type: 'pengumuman-terbaru', title: 'Pengumuman Terbaru', description: 'Pengumuman terkini dari lembaga', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6', defaultWidth: 2, category: 'Informasi' },
  'grafik-kehadiran': { type: 'grafik-kehadiran', title: 'Grafik Kehadiran', description: 'Statistik kehadiran 7 hari terakhir', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', defaultWidth: 4, category: 'Jadwal & Absensi' },
  'agenda-mendatang': { type: 'agenda-mendatang', title: 'Agenda Mendatang', description: 'Acara dan agenda yang akan datang', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', defaultWidth: 2, category: 'Informasi' },
  'perizinan-pending': { type: 'perizinan-pending', title: 'Perizinan Menunggu', description: 'Daftar permohonan izin yang menunggu persetujuan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', defaultWidth: 2, category: 'Administrasi' },
}

const ALL_TYPES = Object.keys(WIDGET_REGISTRY) as WidgetType[]

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const todayName = DAY_NAMES[new Date().getDay()]
const todayISO = new Date().toISOString().split('T')[0]

/* ============================================================
 * Helpers
 * ============================================================ */

function colSpanClass(width: number): string {
  // mobile = full width; sm+ respects widget width up to 4 cols
  switch (width) {
    case 1: return 'col-span-1'
    case 2: return 'col-span-1 sm:col-span-2'
    case 3: return 'col-span-1 sm:col-span-3'
    case 4: return 'col-span-1 sm:col-span-4'
    default: return 'col-span-1'
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Baru saja'
  if (min < 60) return `${min} menit lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ============================================================
 * Small presentational helpers
 * ============================================================ */

function WidgetShell({
  widget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onWidthChange,
  isDragging,
  isDropTarget,
  children,
}: {
  widget: WorkspaceWidget
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onRemove: (id: string) => void
  onWidthChange: (id: string, width: number) => void
  isDragging: boolean
  isDropTarget: boolean
  children: React.ReactNode
}) {
  const meta = WIDGET_REGISTRY[widget.widget_type as WidgetType]
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, widget.id)}
      onDragOver={(e) => onDragOver(e, widget.id)}
      onDrop={(e) => onDrop(e, widget.id)}
      onDragEnd={onDragEnd}
      className={`card p-0 overflow-hidden transition-all duration-200 group/widget ${
        isDragging ? 'opacity-40 ring-2 ring-primary-400 scale-[0.98]' : ''
      } ${isDropTarget ? 'ring-2 ring-primary-500 ring-offset-2' : 'hover:shadow-md'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50/60">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            aria-label="Seret untuk mengatur ulang"
            title="Seret untuk mengatur ulang"
            className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 touch-none -ml-1 p-1 rounded-md hover:bg-neutral-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 4a1 1 0 100 2 1 1 0 000-2zM7 9a1 1 0 100 2 1 1 0 000-2zM7 14a1 1 0 100 2 1 1 0 000-2zM13 4a1 1 0 100 2 1 1 0 000-2zM13 9a1 1 0 100 2 1 1 0 000-2zM13 14a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
          </button>
          <div className="h-7 w-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={meta?.icon} />
            </svg>
          </div>
          <h3 className="font-semibold text-sm text-neutral-800 truncate">{widget.title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Width selector */}
          <div className="hidden sm:flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5">
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                type="button"
                title={`Lebar ${w} kolom`}
                onClick={() => onWidthChange(widget.id, w)}
                className={`h-5 w-5 rounded-md text-[10px] font-bold transition-all ${
                  widget.width === w
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          {/* Remove */}
          <button
            type="button"
            aria-label="Hapus widget"
            title="Hapus widget"
            onClick={() => onRemove(widget.id)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {/* Body */}
      <div className="p-4">{children}</div>
    </div>
  )
}

function WidgetLoading() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
    </div>
  )
}

function WidgetError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg className="h-8 w-8 text-red-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p className="text-xs text-red-500">{message}</p>
    </div>
  )
}

function MiniEmpty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="h-9 w-9 rounded-xl bg-neutral-100 flex items-center justify-center mb-2">
        <svg className="h-5 w-5 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-xs text-neutral-400">{text}</p>
    </div>
  )
}

/* ============================================================
 * Stat card widget (reused for the 6 stat widgets)
 * ============================================================ */

function StatWidget({
  pondokId,
  widgetType,
}: {
  pondokId: string
  widgetType: WidgetType
}) {
  const [value, setValue] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        let count = 0
        if (widgetType === 'stat-santri') {
          const r = await supabase.from('santri').select('id', { count: 'exact', head: true }).eq('pondok_id', pondokId).eq('status', 'aktif')
          count = r.count || 0
        } else if (widgetType === 'stat-guru') {
          const r = await supabase.from('guru').select('id', { count: 'exact', head: true }).eq('pondok_id', pondokId).eq('status', 'aktif')
          count = r.count || 0
        } else if (widgetType === 'stat-kelas') {
          const r = await supabase.from('kelas').select('id', { count: 'exact', head: true }).eq('pondok_id', pondokId)
          count = r.count || 0
        } else if (widgetType === 'stat-asrama') {
          const r = await supabase.from('asrama').select('id', { count: 'exact', head: true }).eq('pondok_id', pondokId)
          count = r.count || 0
        } else if (widgetType === 'stat-perizinan') {
          const r = await supabase.from('perizinan').select('id', { count: 'exact', head: true }).eq('pondok_id', pondokId).eq('status', 'pending')
          count = r.count || 0
        } else if (widgetType === 'stat-payments') {
          const r = await supabase.from('payments').select('id', { count: 'exact', head: true }).eq('pondok_id', pondokId).eq('status', 'belum_bayar')
          count = r.count || 0
        }
        if (active) setValue(count)
      } catch {
        if (active) setError('Gagal memuat data')
      }
    }
    load()
    return () => { active = false }
  }, [pondokId, widgetType])

  const theme = useMemo(() => {
    const map: Record<string, { color: string; link: string; label: string }> = {
      'stat-santri': { color: 'bg-primary-50 text-primary-600', link: '/app/santri', label: 'Santri Aktif' },
      'stat-guru': { color: 'bg-blue-50 text-blue-600', link: '/app/guru', label: 'Guru & Staff' },
      'stat-kelas': { color: 'bg-amber-50 text-amber-600', link: '/app/jadwal', label: 'Kelas' },
      'stat-asrama': { color: 'bg-purple-50 text-purple-600', link: '/app/asrama', label: 'Asrama' },
      'stat-perizinan': { color: 'bg-orange-50 text-orange-600', link: '/app/perizinan', label: 'Izin Menunggu' },
      'stat-payments': { color: 'bg-red-50 text-red-600', link: '/app/finance', label: 'Belum Bayar' },
    }
    return map[widgetType] || { color: 'bg-neutral-100 text-neutral-600', link: '/app', label: '' }
  }, [widgetType])

  if (error) return <WidgetError message={error} />
  if (value === null) return <WidgetLoading />

  return (
    <Link to={theme.link} className="block group/stat">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500 font-medium">{theme.label}</p>
          <p className="font-display text-3xl font-bold mt-1 text-neutral-900">{value}</p>
          <p className="text-[11px] text-neutral-400 mt-1 group-hover/stat:text-primary-500 transition-colors">Lihat detail →</p>
        </div>
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${theme.color}`}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={WIDGET_REGISTRY[widgetType].icon} />
          </svg>
        </div>
      </div>
    </Link>
  )
}

/* ============================================================
 * Jadwal hari ini
 * ============================================================ */

function JadwalHariIniWidget({ pondokId }: { pondokId: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data } = await supabase
          .from('jadwal')
          .select('id, start_time, end_time, room, kelas:kelas_id(name), subject:subject_id(name)')
          .eq('pondok_id', pondokId)
          .eq('day', todayName)
          .order('start_time', { ascending: true })
        if (active) setRows(data || [])
      } catch {
        if (active) setError('Gagal memuat jadwal')
      }
    }
    load()
    return () => { active = false }
  }, [pondokId])

  if (error) return <WidgetError message={error} />
  if (rows === null) return <WidgetLoading />
  if (rows.length === 0) return <MiniEmpty text={`Tidak ada jadwal untuk hari ${todayName}`} />

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {rows.map((r: any) => (
        <div key={r.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50 transition-colors">
          <div className="flex flex-col items-center justify-center bg-primary-50 text-primary-600 rounded-lg px-2.5 py-1.5 shrink-0">
            <span className="text-[11px] font-bold leading-none">{r.start_time?.slice(0, 5)}</span>
            <span className="text-[9px] text-primary-400 leading-none mt-0.5">{r.end_time?.slice(0, 5)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-800 truncate">{r.subject?.name || 'Tanpa Mapel'}</p>
            <p className="text-xs text-neutral-500 truncate">{r.kelas?.name || '-'}{r.room ? ` • ${r.room}` : ''}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
 * Absensi hari ini (summary)
 * ============================================================ */

function AbsensiHariIniWidget({ pondokId }: { pondokId: string }) {
  const [summary, setSummary] = useState<{ hadir: number; sakit: number; izin: number; alpha: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data } = await supabase
          .from('absensi')
          .select('status')
          .eq('pondok_id', pondokId)
          .eq('date', todayISO)
        const s = { hadir: 0, sakit: 0, izin: 0, alpha: 0 }
        ;(data || []).forEach((row: any) => {
          if (row.status in s) (s as any)[row.status]++
        })
        if (active) setSummary(s)
      } catch {
        if (active) setError('Gagal memuat absensi')
      }
    }
    load()
    return () => { active = false }
  }, [pondokId])

  if (error) return <WidgetError message={error} />
  if (!summary) return <WidgetLoading />

  const total = summary.hadir + summary.sakit + summary.izin + summary.alpha
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const items = [
    { key: 'hadir', label: 'Hadir', value: summary.hadir, color: 'bg-emerald-500', text: 'text-emerald-600' },
    { key: 'sakit', label: 'Sakit', value: summary.sakit, color: 'bg-amber-400', text: 'text-amber-600' },
    { key: 'izin', label: 'Izin', value: summary.izin, color: 'bg-blue-400', text: 'text-blue-600' },
    { key: 'alpha', label: 'Alpha', value: summary.alpha, color: 'bg-red-400', text: 'text-red-600' },
  ]

  return (
    <div>
      {total === 0 ? (
        <MiniEmpty text="Belum ada data absensi hari ini" />
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500">Total tercatat</span>
            <span className="font-display text-xl font-bold text-neutral-900">{total}</span>
          </div>
          <div className="space-y-2.5">
            {items.map((it) => (
              <div key={it.key} className="flex items-center gap-3">
                <span className="text-xs font-medium text-neutral-600 w-10">{it.label}</span>
                <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div className={`h-full rounded-full ${it.color} transition-all duration-500`} style={{ width: `${pct(it.value)}%` }} />
                </div>
                <span className={`text-xs font-bold w-8 text-right ${it.text}`}>{it.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ============================================================
 * Pengumuman terbaru
 * ============================================================ */

function PengumumanTerbaruWidget({ pondokId }: { pondokId: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data } = await supabase
          .from('announcements')
          .select('id, title, content, category, created_at')
          .eq('pondok_id', pondokId)
          .order('created_at', { ascending: false })
          .limit(5)
        if (active) setRows(data || [])
      } catch {
        if (active) setError('Gagal memuat pengumuman')
      }
    }
    load()
    return () => { active = false }
  }, [pondokId])

  if (error) return <WidgetError message={error} />
  if (rows === null) return <WidgetLoading />
  if (rows.length === 0) return <MiniEmpty text="Belum ada pengumuman" />

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
      {rows.map((a: any) => (
        <div key={a.id} className="rounded-xl border border-neutral-100 p-3.5 hover:bg-neutral-50 transition-colors">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm text-neutral-800">{a.title}</h4>
            <span className="badge bg-primary-50 text-primary-600 shrink-0">{a.category || 'umum'}</span>
          </div>
          <p className="text-xs text-neutral-500 line-clamp-2">{a.content}</p>
          <p className="text-[10px] text-neutral-400 mt-1.5">{relativeTime(a.created_at)}</p>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
 * Grafik kehadiran (7 hari terakhir) — pure CSS bars
 * ============================================================ */

function GrafikKehadiranWidget({ pondokId }: { pondokId: string }) {
  const [data, setData] = useState<{ label: string; hadir: number; sakit: number; izin: number; alpha: number }[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const days: { label: string; date: string }[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          days.push({
            label: DAY_NAMES[d.getDay()].slice(0, 3),
            date: d.toISOString().split('T')[0],
          })
        }
        const start = days[0].date
        const { data: rows } = await supabase
          .from('absensi')
          .select('date, status')
          .eq('pondok_id', pondokId)
          .gte('date', start)
          .lte('date', days[days.length - 1].date)

        const byDate = new Map<string, { hadir: number; sakit: number; izin: number; alpha: number }>()
        ;(rows || []).forEach((row: any) => {
          const d = row.date
          if (!byDate.has(d)) byDate.set(d, { hadir: 0, sakit: 0, izin: 0, alpha: 0 })
          const entry = byDate.get(d)!
          if (row.status in entry) (entry as any)[row.status]++
        })
        const result = days.map((day) => ({ label: day.label, ...(byDate.get(day.date) || { hadir: 0, sakit: 0, izin: 0, alpha: 0 }) }))
        if (active) setData(result)
      } catch {
        if (active) setError('Gagal memuat grafik')
      }
    }
    load()
    return () => { active = false }
  }, [pondokId])

  if (error) return <WidgetError message={error} />
  if (!data) return <WidgetLoading />

  const maxVal = Math.max(1, ...data.map((d) => d.hadir + d.sakit + d.izin + d.alpha))
  const legend = [
    { label: 'Hadir', color: 'bg-emerald-500' },
    { label: 'Sakit', color: 'bg-amber-400' },
    { label: 'Izin', color: 'bg-blue-400' },
    { label: 'Alpha', color: 'bg-red-400' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${l.color}`} />
            <span className="text-[11px] text-neutral-500 font-medium">{l.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-end justify-between gap-2 h-44">
        {data.map((d, i) => {
          const total = d.hadir + d.sakit + d.izin + d.alpha
          const heightPct = (total / maxVal) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] font-semibold text-neutral-500">{total || ''}</span>
              <div className="w-full max-w-[44px] flex flex-col-reverse rounded-lg overflow-hidden bg-neutral-50" style={{ height: `${heightPct}%`, minHeight: total > 0 ? '4px' : '0' }}>
                {d.hadir > 0 && <div className="bg-emerald-500" style={{ height: `${(d.hadir / total) * 100}%` }} />}
                {d.sakit > 0 && <div className="bg-amber-400" style={{ height: `${(d.sakit / total) * 100}%` }} />}
                {d.izin > 0 && <div className="bg-blue-400" style={{ height: `${(d.izin / total) * 100}%` }} />}
                {d.alpha > 0 && <div className="bg-red-400" style={{ height: `${(d.alpha / total) * 100}%` }} />}
              </div>
              <span className="text-[10px] text-neutral-400 font-medium">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================
 * Agenda mendatang
 * ============================================================ */

function AgendaMendatangWidget({ pondokId }: { pondokId: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        // Try a generic 'agenda' table; fall back gracefully if it doesn't exist.
        const { data, error: err } = await supabase
          .from('agenda')
          .select('id, title, date, location')
          .eq('pondok_id', pondokId)
          .gte('date', todayISO)
          .order('date', { ascending: true })
          .limit(6)
        if (err) {
          if (active) setRows([])
          return
        }
        if (active) setRows(data || [])
      } catch {
        if (active) setRows([])
      }
    }
    load()
    return () => { active = false }
  }, [pondokId])

  if (error) return <WidgetError message={error} />
  if (rows === null) return <WidgetLoading />
  if (rows.length === 0) return <MiniEmpty text="Tidak ada agenda mendatang" />

  return (
    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
      {rows.map((a: any) => {
        const d = new Date(a.date)
        return (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50 transition-colors">
            <div className="flex flex-col items-center justify-center bg-primary-50 text-primary-600 rounded-lg w-12 h-12 shrink-0">
              <span className="text-base font-bold leading-none">{d.getDate()}</span>
              <span className="text-[9px] uppercase leading-none mt-0.5">{d.toLocaleDateString('id-ID', { month: 'short' })}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-800 truncate">{a.title}</p>
              <p className="text-xs text-neutral-500 truncate">{a.location || fmtDate(a.date)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
 * Perizinan pending
 * ============================================================ */

function PerizinanPendingWidget({ pondokId }: { pondokId: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data } = await supabase
          .from('perizinan')
          .select('id, type, start_date, end_date, reason, status, santri:santri_id(full_name)')
          .eq('pondok_id', pondokId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(6)
        if (active) setRows(data || [])
      } catch {
        if (active) setError('Gagal memuat perizinan')
      }
    }
    load()
    return () => { active = false }
  }, [pondokId])

  if (error) return <WidgetError message={error} />
  if (rows === null) return <WidgetLoading />
  if (rows.length === 0) return <MiniEmpty text="Tidak ada perizinan menunggu" />

  const typeLabel: Record<string, string> = { pulang: 'Pulang', sakit: 'Sakit', acara: 'Acara', lainnya: 'Lainnya' }

  return (
    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
      {rows.map((p: any) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50 transition-colors">
          <div className="h-9 w-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-800 truncate">{p.santri?.full_name || 'Santri'}</p>
            <p className="text-xs text-neutral-500 truncate">
              {typeLabel[p.type] || p.type} • {fmtDate(p.start_date)}{p.end_date ? ` – ${fmtDate(p.end_date)}` : ''}
            </p>
          </div>
          <span className="badge bg-orange-50 text-orange-600 shrink-0">Menunggu</span>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
 * Widget renderer dispatcher
 * ============================================================ */

function WidgetBody({ widget, pondokId }: { widget: WorkspaceWidget; pondokId: string }) {
  switch (widget.widget_type as WidgetType) {
    case 'stat-santri':
    case 'stat-guru':
    case 'stat-kelas':
    case 'stat-asrama':
    case 'stat-perizinan':
    case 'stat-payments':
      return <StatWidget pondokId={pondokId} widgetType={widget.widget_type as WidgetType} />
    case 'jadwal-hari-ini':
      return <JadwalHariIniWidget pondokId={pondokId} />
    case 'absensi-hari-ini':
      return <AbsensiHariIniWidget pondokId={pondokId} />
    case 'pengumuman-terbaru':
      return <PengumumanTerbaruWidget pondokId={pondokId} />
    case 'grafik-kehadiran':
      return <GrafikKehadiranWidget pondokId={pondokId} />
    case 'agenda-mendatang':
      return <AgendaMendatangWidget pondokId={pondokId} />
    case 'perizinan-pending':
      return <PerizinanPendingWidget pondokId={pondokId} />
    default:
      return <MiniEmpty text="Widget tidak dikenal" />
  }
}

/* ============================================================
 * Widget Gallery modal
 * ============================================================ */

function WidgetGallery({
  open,
  onClose,
  onAdd,
  existingTypes,
}: {
  open: boolean
  onClose: () => void
  onAdd: (type: WidgetType) => void
  existingTypes: Set<string>
}) {
  const categories = useMemo(() => {
    const map = new Map<string, WidgetMeta[]>()
    ALL_TYPES.forEach((t) => {
      const m = WIDGET_REGISTRY[t]
      if (!map.has(m.category)) map.set(m.category, [])
      map.get(m.category)!.push(m)
    })
    return Array.from(map.entries())
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="font-display font-bold text-lg text-neutral-900">Tambah Widget</h2>
            <p className="text-xs text-neutral-500">Pilih widget untuk ditambahkan ke workspace Anda</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-6">
          {categories.map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((m) => {
                  const added = existingTypes.has(m.type)
                  return (
                    <button
                      key={m.type}
                      type="button"
                      disabled={added}
                      onClick={() => onAdd(m.type)}
                      className={`text-left rounded-xl border p-4 transition-all duration-200 ${
                        added
                          ? 'border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed'
                          : 'border-neutral-200 hover:border-primary-300 hover:shadow-sm hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-neutral-800">{m.title}</h4>
                            {added && <span className="badge bg-neutral-200 text-neutral-500">Aktif</span>}
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">{m.description}</p>
                          <p className="text-[10px] text-neutral-400 mt-1.5">Lebar default: {m.defaultWidth} kolom</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * Main Dashboard
 * ============================================================ */

export default function Dashboard() {
  const { profile, pondok, session } = useAuth()
  const [widgets, setWidgets] = useState<WorkspaceWidget[] | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const dragIdRef = useRef<string | null>(null)

  const pondokId = pondok?.id
  const userId = session?.user?.id

  /* ---------- Load widgets ---------- */
  const loadWidgets = useCallback(async () => {
    if (!pondokId || !userId) return
    const { data } = await supabase
      .from('workspace_widgets')
      .select('*')
      .eq('pondok_id', pondokId)
      .eq('user_id', userId)
      .eq('is_visible', true)
      .order('position', { ascending: true })
    setWidgets((data || []) as WorkspaceWidget[])
  }, [pondokId, userId])

  useEffect(() => {
    if (pondokId && userId) loadWidgets()
    else setWidgets(null)
  }, [pondokId, userId, loadWidgets])

  /* ---------- Add widget ---------- */
  const addWidget = async (type: WidgetType) => {
    if (!pondokId || !userId) return
    const meta = WIDGET_REGISTRY[type]
    const maxPos = widgets && widgets.length > 0 ? Math.max(...widgets.map((w) => w.position)) : 0
    const { data } = await supabase
      .from('workspace_widgets')
      .insert({
        pondok_id: pondokId,
        user_id: userId,
        widget_type: type,
        title: meta.title,
        config: {},
        position: maxPos + 1,
        width: meta.defaultWidth,
        is_visible: true,
      })
      .select('*')
      .single()
    if (data) {
      setWidgets((prev) => [...(prev || []), data as WorkspaceWidget])
    }
    setGalleryOpen(false)
  }

  /* ---------- Remove widget ---------- */
  const removeWidget = async (id: string) => {
    setWidgets((prev) => (prev || []).filter((w) => w.id !== id))
    await supabase.from('workspace_widgets').delete().eq('id', id)
  }

  /* ---------- Change width ---------- */
  const changeWidth = async (id: string, width: number) => {
    setWidgets((prev) => (prev || []).map((w) => (w.id === id ? { ...w, width: width as 1 | 2 | 3 | 4 } : w)))
    await supabase.from('workspace_widgets').update({ width }).eq('id', id)
  }

  /* ---------- Drag and drop (swap positions) ---------- */
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    dragIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragIdRef.current) setDropTargetId(id)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = dragIdRef.current
    setDropTargetId(null)
    setDragId(null)
    dragIdRef.current = null
    if (!sourceId || sourceId === targetId) return

    const current = widgets || []
    const source = current.find((w) => w.id === sourceId)
    const target = current.find((w) => w.id === targetId)
    if (!source || !target) return

    // Swap positions locally
    const swapped = current.map((w) =>
      w.id === sourceId ? { ...w, position: target.position }
      : w.id === targetId ? { ...w, position: source.position }
      : w
    )
    swapped.sort((a, b) => a.position - b.position)
    setWidgets(swapped)

    // Persist position updates
    await Promise.all([
      supabase.from('workspace_widgets').update({ position: target.position }).eq('id', sourceId),
      supabase.from('workspace_widgets').update({ position: source.position }).eq('id', targetId),
    ])
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDropTargetId(null)
    dragIdRef.current = null
  }

  const existingTypes = useMemo(() => new Set((widgets || []).map((w) => w.widget_type)), [widgets])

  /* ---------- Render ---------- */
  if (!pondokId || !userId) return <LoadingSpinner />
  if (widgets === null) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Assalamu'alaikum, ${profile?.full_name?.split(' ')[0] || 'Admin'}`}
        subtitle={pondok?.name}
        action={
          <button type="button" onClick={() => setGalleryOpen(true)} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Widget
          </button>
        }
      />

      {widgets.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            icon="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM9 9h6m-6 4h6m-6 4h4"
            title="Workspace Anda masih kosong"
            desc="Personalisasi dashboard Anda dengan menambahkan widget. Susun ulang dengan menyeret dan menjatuhkan widget sesuai keinginan."
          />
          <div className="flex justify-center mt-2">
            <button type="button" onClick={() => setGalleryOpen(true)} className="btn-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Widget Pertama
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {widgets.map((w) => (
            <div key={w.id} className={colSpanClass(w.width)}>
              <WidgetShell
                widget={w}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onRemove={removeWidget}
                onWidthChange={changeWidth}
                isDragging={dragId === w.id}
                isDropTarget={dropTargetId === w.id}
              >
                <WidgetBody widget={w} pondokId={pondokId} />
              </WidgetShell>
            </div>
          ))}
        </div>
      )}

      <WidgetGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onAdd={addWidget}
        existingTypes={existingTypes}
      />
    </div>
  )
}
