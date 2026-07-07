import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui'
import type { Announcement, Perizinan, Jadwal } from '../types'

interface CalendarEvent {
  id: string
  title: string
  time?: string
  location?: string
  description?: string
  category: string
  source: 'announcement' | 'perizinan' | 'jadwal'
  date: string // YYYY-MM-DD
}

const DAYS_OF_WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const CATEGORY_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  rapat: { label: 'Rapat', dot: 'bg-red-500', badge: 'bg-red-50 text-red-600' },
  acara: { label: 'Acara', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-600' },
  kegiatan: { label: 'Kegiatan', dot: 'bg-green-500', badge: 'bg-green-50 text-green-600' },
  ujian: { label: 'Ujian', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-600' },
  libur: { label: 'Libur', dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-600' },
  pengumuman: { label: 'Pengumuman', dot: 'bg-primary-500', badge: 'bg-primary-50 text-primary-600' },
  perizinan: { label: 'Perizinan', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-600' },
  jadwal: { label: 'Jadwal', dot: 'bg-teal-500', badge: 'bg-teal-50 text-teal-600' },
}

const DAY_TO_INDEX: Record<string, number> = {
  Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6,
  Ahad: 0,
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function AgendaPage() {
  const { pondok } = useAuth()
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Add form state
  const [form, setForm] = useState({
    title: '',
    date: toDateStr(new Date()),
    time: '',
    location: '',
    description: '',
    category: 'kegiatan' as string,
  })

  const pid = pondok?.id
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const loadEvents = useCallback(async () => {
    if (!pid) return
    setLoading(true)

    // Calculate date range for the current month (with some padding for adjacent days visible in grid)
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const rangeStart = new Date(firstDay)
    rangeStart.setDate(firstDay.getDate() - 7)
    const rangeEnd = new Date(lastDay)
    rangeEnd.setDate(lastDay.getDate() + 7)

    const startStr = toDateStr(rangeStart)
    const endStr = toDateStr(rangeEnd)

    const [annRes, perizinanRes, jadwalRes] = await Promise.all([
      // Announcements - use created_at as the date
      supabase
        .from('announcements')
        .select('*')
        .eq('pondok_id', pid)
        .gte('created_at', startStr + 'T00:00:00')
        .lte('created_at', endStr + 'T23:59:59')
        .order('created_at', { ascending: true }),
      // Perizinan - use start_date
      supabase
        .from('perizinan')
        .select('*')
        .eq('pondok_id', pid)
        .gte('start_date', startStr)
        .lte('start_date', endStr)
        .order('start_date', { ascending: true }),
      // Jadwal - day-based, fetch all and filter by day-of-week
      supabase
        .from('jadwal')
        .select('*, subject:subject_id(name)')
        .eq('pondok_id', pid)
        .order('start_time', { ascending: true }),
    ])

    const allEvents: CalendarEvent[] = []

    // Process announcements
    for (const a of (annRes.data as Announcement[]) || []) {
      const dateStr = a.created_at.split('T')[0]
      allEvents.push({
        id: `ann-${a.id}`,
        title: a.title,
        description: a.content,
        category: a.category?.toLowerCase() || 'pengumuman',
        source: 'announcement',
        date: dateStr,
      })
    }

    // Process perizinan
    for (const p of (perizinanRes.data as Perizinan[]) || []) {
      allEvents.push({
        id: `per-${p.id}`,
        title: `Izin ${p.type === 'pulang' ? 'Pulang' : p.type === 'sakit' ? 'Sakit' : p.type === 'acara' ? 'Acara' : 'Lainnya'}`,
        description: p.reason || undefined,
        category: 'perizinan',
        source: 'perizinan',
        date: p.start_date,
      })
    }

    // Process jadwal - map to recurring weekly events in the current month
    const jadwalList = (jadwalRes.data as (Jadwal & { subject?: { name: string } | null })[]) || []
    // Generate dates for each jadwal's day-of-week within the month range
    const iter = new Date(firstDay)
    while (iter <= lastDay) {
      const dow = iter.getDay()
      const dateStr = toDateStr(iter)
      for (const j of jadwalList) {
        const jadwalDow = DAY_TO_INDEX[j.day]
        if (jadwalDow === dow) {
          allEvents.push({
            id: `jad-${j.id}-${dateStr}`,
            title: j.subject?.name || 'Jadwal Pelajaran',
            time: j.start_time,
            location: j.room || undefined,
            category: 'jadwal',
            source: 'jadwal',
            date: dateStr,
          })
        }
      }
      iter.setDate(iter.getDate() + 1)
    }

    setEvents(allEvents)
    setLoading(false)
  }, [pid, year, month])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const startOffset = firstDayOfMonth.getDay() // 0 = Sunday
    const totalDays = lastDayOfMonth.getDate()

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = []

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, isCurrentMonth: false, dateStr: toDateStr(d) })
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i)
      days.push({ date: d, isCurrentMonth: true, dateStr: toDateStr(d) })
    }

    // Next month padding to fill 6 rows (42 cells)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ date: d, isCurrentMonth: false, dateStr: toDateStr(d) })
    }

    return days
  }, [year, month])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date)!.push(e)
    }
    return map
  }, [events])

  const todayStr = toDateStr(new Date())

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  const goToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(todayStr)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pid) return
    setSaving(true)

    // Store as an announcement with category='agenda' and the date encoded in the link field
    await supabase.from('announcements').insert({
      pondok_id: pid,
      title: form.title,
      content: form.description || form.location || '',
      category: 'agenda',
      audience: 'all',
      link: `${form.date}|${form.time}|${form.location}|${form.category}`,
    })

    setSaving(false)
    setShowAddModal(false)
    setForm({
      title: '',
      date: toDateStr(new Date()),
      time: '',
      location: '',
      description: '',
      category: 'kegiatan',
    })
    loadEvents()
  }

  const selectedDayEvents = selectedDay ? eventsByDate.get(selectedDay) || [] : []

  // Upcoming events (sorted, from today forward)
  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return (a.time || '').localeCompare(b.time || '')
      })
      .slice(0, 8)
  }, [events, todayStr])

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Agenda & Kalender"
        subtitle="Lihat kegiatan, pengumuman, dan jadwal dalam tampilan kalender"
        action={
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Agenda
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-5">
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-neutral-900">
              {MONTH_NAMES[month]} {year}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="btn-secondary p-2 rounded-xl">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button onClick={goToday} className="btn-secondary py-2 px-3 text-sm">
                Hari Ini
              </button>
              <button onClick={nextMonth} className="btn-secondary p-2 rounded-xl">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-neutral-500 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayEvents = eventsByDate.get(day.dateStr) || []
              const isToday = day.dateStr === todayStr
              const isSelected = day.dateStr === selectedDay

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDay(day.dateStr)}
                  className={`relative min-h-[72px] sm:min-h-[88px] rounded-xl p-1.5 text-left transition-all border ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : isToday
                      ? 'border-primary-300 bg-primary-50/50'
                      : 'border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50'
                  } ${!day.isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        isToday
                          ? 'h-5 w-5 rounded-full bg-primary-600 text-white flex items-center justify-center'
                          : 'text-neutral-700'
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-neutral-400 font-medium">{dayEvents.length}</span>
                    )}
                  </div>
                  {/* Event dots */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => {
                      const cfg = CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG.kegiatan
                      return (
                        <div
                          key={e.id}
                          className="flex items-center gap-1 text-[10px] leading-tight overflow-hidden"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className="text-neutral-600 truncate">{e.title}</span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-neutral-400 pl-2.5">
                        +{dayEvents.length - 3} lainnya
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-neutral-100">
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-neutral-500">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: selected day + upcoming */}
        <div className="space-y-6">
          {/* Selected day events */}
          <div className="card p-5">
            <h3 className="font-display font-bold text-sm mb-3">
              {selectedDay
                ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : 'Pilih Tanggal'}
            </h3>
            {selectedDay && selectedDayEvents.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4 text-center">Tidak ada agenda pada tanggal ini</p>
            ) : selectedDay ? (
              <div className="space-y-2">
                {selectedDayEvents.map((e) => {
                  const cfg = CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG.kegiatan
                  return (
                    <div key={e.id} className="rounded-xl border border-neutral-100 p-3 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                        {e.time && <span className="text-xs text-neutral-400 font-mono">{e.time}</span>}
                      </div>
                      <p className="text-sm font-medium text-neutral-900">{e.title}</p>
                      {e.location && (
                        <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {e.location}
                        </p>
                      )}
                      {e.description && (
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{e.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 py-4 text-center">Klik tanggal untuk melihat detail agenda</p>
            )}
          </div>

          {/* Upcoming events */}
          <div className="card p-5">
            <h3 className="font-display font-bold text-sm mb-3">Agenda Mendatang</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4 text-center">Tidak ada agenda mendatang</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((e) => {
                  const cfg = CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG.kegiatan
                  const eventDate = new Date(e.date + 'T00:00:00')
                  return (
                    <div key={e.id} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-neutral-50 transition-colors">
                      <div className="text-center shrink-0">
                        <div className="text-xs text-neutral-400 font-medium">
                          {eventDate.toLocaleDateString('id-ID', { weekday: 'short' })}
                        </div>
                        <div className="font-display text-xl font-bold text-neutral-900 leading-none">
                          {eventDate.getDate()}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {eventDate.toLocaleDateString('id-ID', { month: 'short' })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 border-l border-neutral-100 pl-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`h-2 w-2 rounded-full ${cfg.dot} shrink-0`} />
                          <p className="text-sm font-medium text-neutral-900 truncate">{e.title}</p>
                        </div>
                        {e.time && (
                          <p className="text-xs text-neutral-400 font-mono">{e.time}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Agenda Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">Tambah Agenda Baru</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-ghost p-2 rounded-xl"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="label">Judul Agenda *</label>
                <input
                  className="input"
                  required
                  placeholder="Judul agenda..."
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tanggal *</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Waktu</label>
                  <input
                    type="time"
                    className="input"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Lokasi</label>
                  <input
                    className="input"
                    placeholder="Lokasi..."
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="rapat">Rapat</option>
                    <option value="acara">Acara</option>
                    <option value="kegiatan">Kegiatan</option>
                    <option value="ujian">Ujian</option>
                    <option value="libur">Libur</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  className="input min-h-[100px] resize-y"
                  placeholder="Deskripsi agenda..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Category preview */}
              <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3 flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${(CATEGORY_CONFIG[form.category] || CATEGORY_CONFIG.kegiatan).dot}`} />
                <span className="text-sm text-neutral-600">
                  Aka ditampilkan sebagai: <span className="font-medium">{(CATEGORY_CONFIG[form.category] || CATEGORY_CONFIG.kegiatan).label}</span>
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
