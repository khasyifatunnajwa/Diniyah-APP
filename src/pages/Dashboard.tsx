import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, LoadingSpinner } from '../components/ui'
import { Link } from 'react-router-dom'

interface Stats {
  santriCount: number
  guruCount: number
  kelasCount: number
  asramaCount: number
  pendingPerizinan: number
  unpaidPayments: number
  todayAbsensi: number
  announcements: number
}

export default function Dashboard() {
  const { profile, pondok } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!pondok) return
    const pid = pondok.id
    const load = async () => {
      const [santri, guru, kelas, asrama, perizinan, payments, absensi, ann] = await Promise.all([
        supabase.from('santri').select('id', { count: 'exact', head: true }).eq('pondok_id', pid).eq('status', 'aktif'),
        supabase.from('guru').select('id', { count: 'exact', head: true }).eq('pondok_id', pid).eq('status', 'aktif'),
        supabase.from('kelas').select('id', { count: 'exact', head: true }).eq('pondok_id', pid),
        supabase.from('asrama').select('id', { count: 'exact', head: true }).eq('pondok_id', pid),
        supabase.from('perizinan').select('id', { count: 'exact', head: true }).eq('pondok_id', pid).eq('status', 'pending'),
        supabase.from('payments').select('id, amount', { count: 'exact' }).eq('pondok_id', pid).eq('status', 'belum_bayar'),
        supabase.from('absensi').select('id', { count: 'exact', head: true }).eq('pondok_id', pid).eq('date', new Date().toISOString().split('T')[0]),
        supabase.from('announcements').select('*').eq('pondok_id', pid).order('created_at', { ascending: false }).limit(5),
      ])
      setStats({
        santriCount: santri.count || 0,
        guruCount: guru.count || 0,
        kelasCount: kelas.count || 0,
        asramaCount: asrama.count || 0,
        pendingPerizinan: perizinan.count || 0,
        unpaidPayments: payments.count || 0,
        todayAbsensi: absensi.count || 0,
        announcements: ann.count || 0,
      })
      setRecentAnnouncements(ann.data || [])
      setLoading(false)
    }
    load()
  }, [pondok])

  if (loading) return <LoadingSpinner />

  const cards = [
    { label: 'Santri Aktif', value: stats?.santriCount ?? 0, icon: 'M12 4.354a4 4 0 110 5.292M15 8H3m6 0a4 4 0 014 4v3a4 4 0 01-4 4H3', color: 'bg-primary-50 text-primary-600', link: '/app/santri' },
    { label: 'Guru & Staff', value: stats?.guruCount ?? 0, icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z', color: 'bg-blue-50 text-blue-600', link: '/app/guru' },
    { label: 'Kelas', value: stats?.kelasCount ?? 0, icon: 'M8 14l3-3 3 3 5-5', color: 'bg-amber-50 text-amber-600', link: '/app/jadwal' },
    { label: 'Asrama', value: stats?.asramaCount ?? 0, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z', color: 'bg-purple-50 text-purple-600', link: '/app/asrama' },
    { label: 'Izin Menunggu', value: stats?.pendingPerizinan ?? 0, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-orange-50 text-orange-600', link: '/app/perizinan' },
    { label: 'Pembayaran Tertunggak', value: stats?.unpaidPayments ?? 0, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8', color: 'bg-red-50 text-red-600', link: '/app/finance' },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Assalamu\'alaikum, ${profile?.full_name?.split(' ')[0] || 'Admin'}`}
        subtitle={pondok?.name}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} to={c.link} className="stat-card group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-500">{c.label}</p>
                <p className="font-display text-3xl font-bold mt-1">{c.value}</p>
              </div>
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${c.color}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions + announcements */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-display font-bold text-lg mb-4">Pengumuman Terbaru</h2>
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-neutral-500 py-8 text-center">Belum ada pengumuman</p>
          ) : (
            <div className="space-y-3">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="rounded-xl border border-neutral-100 p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-sm">{a.title}</h3>
                      <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{a.content}</p>
                    </div>
                    <span className="badge bg-primary-50 text-primary-600 shrink-0">{a.category || 'umum'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display font-bold text-lg mb-4">Aksi Cepat</h2>
          <div className="space-y-2">
            {[
              { label: 'Tambah Santri', link: '/app/santri', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
              { label: 'Input Absensi', link: '/app/absensi', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { label: 'Input Nilai', link: '/app/nilai', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
              { label: 'Buat Pengumuman', link: '/app/announcements', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
            ].map((q) => (
              <Link key={q.label} to={q.link} className="flex items-center gap-3 rounded-xl p-3 hover:bg-neutral-50 transition-colors group">
                <div className="h-9 w-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={q.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
