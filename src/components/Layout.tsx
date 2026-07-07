import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { supabase } from '../lib/supabase'
import type { Role, Notification } from '../types'

interface NavItem {
  to: string
  label: string
  icon: string
  module?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/app/santri', label: 'Santri', icon: 'M12 4.354a4 4 0 110 5.292M15 8H3m6 0a4 4 0 014 4v3a4 4 0 01-4 4H3', module: 'santri' },
  { to: '/app/guru', label: 'Guru & Staff', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z', module: 'guru' },
  { to: '/app/absensi', label: 'Absensi', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', module: 'absensi' },
  { to: '/app/nilai', label: 'Nilai', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', module: 'nilai' },
  { to: '/app/jadwal', label: 'Jadwal', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', module: 'jadwal' },
  { to: '/app/rapor', label: 'Rapor', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', module: 'rapor' },
  { to: '/app/finance', label: 'Keuangan', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8', module: 'finance' },
  { to: '/app/inventaris', label: 'Inventaris', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10', module: 'inventaris' },
  { to: '/app/surat', label: 'Surat', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', module: 'surat' },
  { to: '/app/asrama', label: 'Asrama', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z', module: 'asrama' },
  { to: '/app/tahfidz', label: 'Tahfidz', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253', module: 'tahfidz' },
  { to: '/app/perizinan', label: 'Perizinan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', module: 'perizinan' },
  { to: '/app/announcements', label: 'Pengumuman', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6', module: 'announcements' },
  { to: '/app/agenda', label: 'Agenda', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', module: 'agenda' },
]

const STUDIO_ITEMS: NavItem[] = [
  { to: '/app/marketplace', label: 'Marketplace', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { to: '/app/module-builder', label: 'Module Builder', icon: 'M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM4 9h16M4 9v8a2 2 0 002 2h12a2 2 0 002-2V9' },
  { to: '/app/studio', label: 'SIM KBM Studio', icon: 'M10 20l4-16m-7 4l-3 4 3 4m10-8l3 4-3 4' },
  { to: '/app/theme-store', label: 'Theme Store', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { to: '/app/settings', label: 'Pengaturan', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin_pondok: 'Admin Pondok',
  kepala_madrasah: 'Kepala Madrasah',
  guru: 'Guru',
  musyrif: 'Musyrif',
  bendahara: 'Bendahara',
  santri: 'Santri',
  wali_santri: 'Wali Santri',
}

export default function Layout() {
  const { profile, pondok, signOut } = useAuth()
  const { enabledSlugs, customModules } = useModules()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  useEffect(() => {
    if (!pondok) return
    const loadNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('pondok_id', pondok.id)
        .or(`user_id.eq.${profile?.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(10)
      setNotifications((data || []) as Notification[])
    }
    loadNotifs()
  }, [pondok, profile])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAllRead = async () => {
    if (!pondok || !profile) return
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('pondok_id', pondok.id)
      .or(`user_id.eq.${profile.id},user_id.is.null`)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.module) return true
    return enabledSlugs.includes(item.module)
  })

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-primary-900 text-white flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-primary-500 flex items-center justify-center font-display font-bold text-lg">K</div>
          <div className="min-w-0">
            <div className="font-display font-bold text-sm truncate">SIM KBM</div>
            <div className="text-xs text-primary-300/70 truncate">{pondok?.name || 'Platform'}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-primary-200/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}

          {/* Custom modules */}
          {customModules.map((cm) => (
            <NavLink
              key={cm.slug}
              to={`/app/custom/${cm.slug}`}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-primary-200/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={cm.icon || 'M12 4v16m8-8H4'} />
              </svg>
              {cm.name}
            </NavLink>
          ))}

          {/* Studio section */}
          <div className="pt-4 mt-4 border-t border-white/10">
            <button
              onClick={() => setStudioOpen(!studioOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-primary-300/60 uppercase tracking-wider hover:text-white transition-colors"
            >
              <span>Studio & System</span>
              <svg className={`h-4 w-4 transition-transform ${studioOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {studioOpen && (
              <div className="mt-1 space-y-1 animate-fade-in">
                {STUDIO_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary-500 text-white shadow-sm'
                          : 'text-primary-200/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-white/10 p-3 shrink-0">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white/5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center font-bold text-sm shrink-0">
              {profile?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{profile?.full_name}</div>
              <div className="text-xs text-primary-300/70 truncate">{profile ? ROLE_LABELS[profile.role] : ''}</div>
            </div>
            <button onClick={handleSignOut} className="text-primary-300/70 hover:text-white shrink-0" title="Keluar">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2 lg:hidden">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-display font-bold text-sm hidden sm:block">SIM KBM Platform</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative btn-ghost p-2"
                title="Notifikasi"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 z-40 w-80 card p-0 overflow-hidden animate-fade-in">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                      <span className="font-semibold text-sm">Notifikasi</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-primary-600 font-medium hover:underline">
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-neutral-500 text-center py-8">Tidak ada notifikasi</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 ${!n.is_read ? 'bg-primary-50/50' : ''}`}>
                            <div className="flex items-start gap-2">
                              <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? 'bg-neutral-300' : 'bg-primary-500'}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{n.title}</p>
                                {n.message && <p className="text-xs text-neutral-500 mt-0.5">{n.message}</p>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme indicator */}
            <div className="h-2 w-2 rounded-full bg-primary-500" title="Theme aktif" />

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-200">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center font-bold text-xs text-white">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
