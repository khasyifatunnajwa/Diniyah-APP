import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { supabase } from '../lib/supabase'
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '../components/ui'
import type { PondokType, Role, RolePermission, BackupConfig, ApiKey, Notification } from '../types'

// ============================================================
// CONSTANTS
// ============================================================

const PONDOK_TYPES: { value: PondokType; label: string }[] = [
  { value: 'pondok', label: 'Pondok Pesantren' },
  { value: 'madrasah', label: 'Madrasah' },
  { value: 'tpq', label: 'TPQ / TPA' },
  { value: 'sekolah', label: 'Sekolah Islam' },
  { value: 'yayasan', label: 'Yayasan' },
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

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: 'Akses penuh ke semua fitur',
  admin_pondok: 'Administrasi lembaga',
  kepala_madrasah: 'Pengawasan akademik',
  guru: 'Pengajaran & nilai',
  musyrif: 'Pembinaan asrama',
  bendahara: 'Manajemen keuangan',
  santri: 'Akun santri',
  wali_santri: 'Akun wali santri',
}

const ALL_ROLES: Role[] = [
  'super_admin', 'admin_pondok', 'kepala_madrasah', 'guru',
  'musyrif', 'bendahara', 'santri', 'wali_santri',
]

const MODULE_CATEGORIES = [
  {
    id: 'akademik',
    label: 'Akademik',
    desc: 'Nilai, jadwal, absensi, mata pelajaran',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    color: 'bg-primary-50 text-primary-600',
  },
  {
    id: 'administrasi',
    label: 'Administrasi',
    desc: 'Keuangan, inventaris, surat menyurat',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'pondok',
    label: 'Pondok',
    desc: 'Asrama, tahfidz, perizinan santri',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z',
    color: 'bg-purple-50 text-purple-600',
  },
]

const STORAGE_OPTIONS = [
  {
    id: 'cloud_simkbm',
    label: 'Cloud SIM KBM',
    desc: 'Penyimpanan terpusat di server SIM KBM. Otomatis backup, akses di mana saja, tanpa konfigurasi.',
    icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.5 4.5 0 003 15z',
    badge: 'Direkomendasikan',
  },
  {
    id: 'supabase',
    label: 'Supabase',
    desc: 'Database Supabase dengan real-time sync dan autentikasi bawaan.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    badge: null,
  },
  {
    id: 'postgresql',
    label: 'PostgreSQL',
    desc: 'Server PostgreSQL mandiri (self-hosted). Cocok untuk lembaga dengan infrastruktur sendiri.',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
    badge: null,
  },
  {
    id: 'offline',
    label: 'Offline / Lokal',
    desc: 'Data disimpan di perangkat ini saja. Tidak ada sinkronisasi cloud. Cocok untuk area dengan koneksi terbatas.',
    icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
    badge: null,
  },
]

const BACKUP_PROVIDERS = [
  { id: 'google_drive', label: 'Google Drive', icon: 'M14.5 14.5h-5v-5h5v5z', color: 'text-blue-600 bg-blue-50' },
  { id: 'dropbox', label: 'Dropbox', icon: 'M7 4h3l2 4 2-4h3l-3 5 3 5h-3l-2-4-2 4H7l3-5-3-5z', color: 'text-sky-600 bg-sky-50' },
  { id: 'onedrive', label: 'OneDrive', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', color: 'text-indigo-600 bg-indigo-50' },
  { id: 'nas', label: 'NAS Server', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2', color: 'text-purple-600 bg-purple-50' },
  { id: 'ftp', label: 'FTP / SFTP', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.5 4.5 0 003 15z', color: 'text-amber-600 bg-amber-50' },
  { id: 'local', label: 'Penyimpanan Lokal', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2', color: 'text-green-600 bg-green-50' },
]

const BACKUP_SCHEDULES = [
  { id: 'manual', label: 'Manual', desc: 'Backup hanya saat tombol ditekan' },
  { id: 'daily', label: 'Harian', desc: 'Setiap hari pada jam yang ditentukan' },
  { id: 'weekly', label: 'Mingguan', desc: 'Setiap minggu pada hari yang ditentukan' },
  { id: 'monthly', label: 'Bulanan', desc: 'Setiap bulan pada tanggal yang ditentukan' },
]

const API_PERMISSION_OPTIONS = [
  'read: santri', 'write: santri', 'read: guru', 'write: guru',
  'read: finance', 'write: finance', 'read: absensi', 'write: absensi',
  'read: nilai', 'write: nilai', 'read: perizinan', 'write: perizinan',
  'read: announcements', 'write: announcements', 'admin: all',
]

const NOTIFICATION_TOGGLES = [
  { key: 'email', label: 'Notifikasi Email', desc: 'Terima notifikasi melalui email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'push', label: 'Notifikasi Push', desc: 'Notifikasi langsung di perangkat', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { key: 'announcement', label: 'Notifikasi Pengumuman', desc: 'Notifikasi saat ada pengumuman baru', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6' },
  { key: 'perizinan', label: 'Notifikasi Perizinan', desc: 'Notifikasi saat ada permohonan izin', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'payment', label: 'Notifikasi Pembayaran', desc: 'Notifikasi untuk transaksi pembayaran', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8' },
]

const TABS = [
  { id: 'profil', label: 'Profil Lembaga', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z' },
  { id: 'roles', label: 'Peran & Hak Akses', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'storage', label: 'Penyimpanan & Backup', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
  { id: 'api', label: 'API & Integrasi', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'notifikasi', label: 'Notifikasi', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'tentang', label: 'Tentang', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
] as const

type TabId = typeof TABS[number]['id']

// ============================================================
// HELPER COMPONENTS
// ============================================================

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary-600' : 'bg-neutral-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-600',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }
  const icons = {
    success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    error: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${styles[type]}`}>
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icons[type]} />
        </svg>
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 text-current opacity-60 hover:opacity-100">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function SectionCard({ icon, iconColor, title, subtitle, children, footer }: {
  icon: string
  iconColor: string
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <p className="text-sm text-neutral-500">{subtitle}</p>
        </div>
      </div>
      {children}
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  )
}

function MsgBox({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null
  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
        msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'
      }`}
    >
      {msg.text}
    </div>
  )
}

// ============================================================
// TAB 1: PROFIL LEMBAGA
// ============================================================

function ProfilLembagaTab() {
  const { profile, pondok, refreshProfile } = useAuth()

  const [pondokForm, setPondokForm] = useState({
    name: '', type: 'pondok' as PondokType, address: '', phone: '', email: '', modules: [] as string[],
  })
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
  const [savingPondok, setSavingPondok] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [pondokMsg, setPondokMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (pondok) {
      setPondokForm({
        name: pondok.name || '', type: pondok.type || 'pondok',
        address: pondok.address || '', phone: pondok.phone || '',
        email: pondok.email || '', modules: pondok.modules || [],
      })
    }
    if (profile) {
      setProfileForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
    }
  }, [pondok, profile])

  const toggleModule = (id: string) => {
    setPondokForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(id) ? prev.modules.filter((m) => m !== id) : [...prev.modules, id],
    }))
  }

  const savePondok = async () => {
    if (!pondok) return
    if (!pondokForm.name.trim()) { setPondokMsg({ type: 'error', text: 'Nama lembaga harus diisi' }); return }
    setSavingPondok(true); setPondokMsg(null)
    try {
      const { error } = await supabase.from('pondok').update({
        name: pondokForm.name.trim(), type: pondokForm.type,
        address: pondokForm.address.trim() || null,
        phone: pondokForm.phone.trim() || null,
        email: pondokForm.email.trim() || null,
        modules: pondokForm.modules,
      }).eq('id', pondok.id)
      if (error) throw error
      await refreshProfile()
      setPondokMsg({ type: 'success', text: 'Pengaturan lembaga berhasil disimpan' })
    } catch (err) {
      setPondokMsg({ type: 'error', text: err instanceof Error ? err.message : 'Terjadi kesalahan' })
    } finally { setSavingPondok(false) }
  }

  const saveProfile = async () => {
    if (!profile) return
    if (!profileForm.full_name.trim()) { setProfileMsg({ type: 'error', text: 'Nama lengkap harus diisi' }); return }
    setSavingProfile(true); setProfileMsg(null)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim() || null,
      }).eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Terjadi kesalahan' })
    } finally { setSavingProfile(false) }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Info Lembaga + Modul */}
      <div className="lg:col-span-2 space-y-6">
        <SectionCard
          icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z"
          iconColor="bg-primary-50 text-primary-600"
          title="Informasi Lembaga"
          subtitle="Data dasar lembaga Anda"
          footer={
            <>
              <MsgBox msg={pondokMsg} />
              <div className="flex justify-end mt-4">
                <button className="btn-primary" onClick={savePondok} disabled={savingPondok}>
                  {savingPondok ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">Nama Lembaga *</label>
              <input className="input" value={pondokForm.name}
                onChange={(e) => setPondokForm({ ...pondokForm, name: e.target.value })}
                placeholder="Nama lembaga..." />
            </div>
            <div>
              <label className="label">Jenis Lembaga</label>
              <select className="input" value={pondokForm.type}
                onChange={(e) => setPondokForm({ ...pondokForm, type: e.target.value as PondokType })}>
                {PONDOK_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
            </div>
            <div>
              <label className="label">Alamat</label>
              <textarea className="input min-h-[70px] resize-y" value={pondokForm.address}
                onChange={(e) => setPondokForm({ ...pondokForm, address: e.target.value })}
                placeholder="Alamat lengkap lembaga..." />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Telepon</label>
                <input className="input" value={pondokForm.phone}
                  onChange={(e) => setPondokForm({ ...pondokForm, phone: e.target.value })}
                  placeholder="08..." />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={pondokForm.email}
                  onChange={(e) => setPondokForm({ ...pondokForm, email: e.target.value })}
                  placeholder="info@lembaga.com" />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          iconColor="bg-blue-50 text-blue-600"
          title="Modul Aktif"
          subtitle="Pilih modul yang digunakan di lembaga Anda"
          footer={
            <>
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                Perubahan modul akan disimpan bersama pengaturan lembaga.
              </div>
              <div className="flex justify-end mt-4">
                <button className="btn-primary" onClick={savePondok} disabled={savingPondok}>
                  {savingPondok ? 'Menyimpan...' : 'Simpan Modul'}
                </button>
              </div>
            </>
          }
        >
          <div className="space-y-3">
            {MODULE_CATEGORIES.map((m) => {
              const active = pondokForm.modules.includes(m.id)
              return (
                <button key={m.id} onClick={() => toggleModule(m.id)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-center gap-4 ${
                    active ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                  }`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${active ? 'bg-primary-500' : 'bg-neutral-100'}`}>
                    <svg className={`h-5 w-5 ${active ? 'text-white' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{m.label}</div>
                    <div className="text-sm text-neutral-500">{m.desc}</div>
                  </div>
                  <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    active ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                  }`}>
                    {active && (
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </SectionCard>
      </div>

      {/* Profile Settings */}
      <div className="space-y-6">
        <SectionCard
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          iconColor="bg-purple-50 text-purple-600"
          title="Profil Saya"
          subtitle="Informasi akun Anda"
          footer={
            <>
              <MsgBox msg={profileMsg} />
              <div className="flex justify-end mt-4">
                <button className="btn-primary" onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </>
          }
        >
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-neutral-100">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-display font-bold text-2xl">
              {(profileForm.full_name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{profile?.full_name || 'Pengguna'}</p>
              <span className="badge bg-primary-50 text-primary-600 mt-1">
                {profile ? ROLE_LABELS[profile.role] : '—'}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Nama Lengkap *</label>
              <input className="input" value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                placeholder="Nama lengkap..." />
            </div>
            <div>
              <label className="label">Telepon</label>
              <input className="input" value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="08..." />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input bg-neutral-50" value="Terhubung via akun" disabled />
              <p className="text-xs text-neutral-400 mt-1">Email terhubung dengan akun autentikasi</p>
            </div>
            <div>
              <label className="label">Peran</label>
              <input className="input bg-neutral-50" value={profile ? ROLE_LABELS[profile.role] : ''} disabled />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// ============================================================
// TAB 2: PERAN & HAK AKSES
// ============================================================

type PermMatrix = Record<string, Record<string, { can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean }>>

function RolesTab({ pondokId, showToast }: { pondokId: string; showToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const { builtinModules } = useModules()
  const [matrix, setMatrix] = useState<PermMatrix>({})
  const [originalMatrix, setOriginalMatrix] = useState<PermMatrix>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const moduleSlugs = builtinModules.map((m) => m.slug)

  const loadPermissions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('pondok_id', pondokId)
    const m: PermMatrix = {}
    for (const role of ALL_ROLES) {
      m[role] = {}
      for (const slug of moduleSlugs) {
        m[role][slug] = { can_create: false, can_read: true, can_update: false, can_delete: false }
      }
    }
    for (const row of (data || []) as RolePermission[]) {
      if (m[row.role] && m[row.role][row.module_slug]) {
        m[row.role][row.module_slug] = {
          can_create: row.can_create, can_read: row.can_read,
          can_update: row.can_update, can_delete: row.can_delete,
        }
      }
    }
    setMatrix(m)
    setOriginalMatrix(JSON.parse(JSON.stringify(m)))
    setLoading(false)
  }, [pondokId, moduleSlugs.join(',')])

  useEffect(() => { loadPermissions() }, [loadPermissions])

  const togglePerm = (role: string, slug: string, perm: 'can_create' | 'can_read' | 'can_update' | 'can_delete') => {
    setMatrix((prev) => {
      const next = { ...prev, [role]: { ...prev[role], [slug]: { ...prev[role][slug], [perm]: !prev[role][slug][perm] } } }
      setDirty(JSON.stringify(next) !== JSON.stringify(originalMatrix))
      return next
    })
  }

  const setAllForRole = (role: string, value: boolean) => {
    setMatrix((prev) => {
      const next = { ...prev }
      next[role] = {}
      for (const slug of moduleSlugs) {
        next[role][slug] = { can_create: value, can_read: value, can_update: value, can_delete: value }
      }
      setDirty(JSON.stringify(next) !== JSON.stringify(originalMatrix))
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const rows = []
      for (const role of ALL_ROLES) {
        for (const slug of moduleSlugs) {
          const p = matrix[role][slug]
          rows.push({
            pondok_id: pondokId, role, module_slug: slug,
            can_create: p.can_create, can_read: p.can_read,
            can_update: p.can_update, can_delete: p.can_delete,
          })
        }
      }
      const { error } = await supabase
        .from('role_permissions')
        .upsert(rows, { onConflict: 'pondok_id,role,module_slug' })
      if (error) throw error
      setOriginalMatrix(JSON.parse(JSON.stringify(matrix)))
      setDirty(false)
      showToast('Hak akses berhasil disimpan', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  const permLabels: { key: 'can_create' | 'can_read' | 'can_update' | 'can_delete'; short: string; full: string }[] = [
    { key: 'can_create', short: 'C', full: 'Create' },
    { key: 'can_read', short: 'R', full: 'Read' },
    { key: 'can_update', short: 'U', full: 'Update' },
    { key: 'can_delete', short: 'D', full: 'Delete' },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <SectionCard
        icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        iconColor="bg-primary-50 text-primary-600"
        title="Peran & Hak Akses"
        subtitle="Atur izin CRUD untuk setiap peran dan modul"
        footer={
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-500">
              {dirty ? <span className="text-amber-600 font-medium">Ada perubahan belum disimpan</span> : 'Semua perubahan tersimpan'}
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={loadPermissions} disabled={saving || !dirty}>
                Reset
              </button>
              <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
                {saving ? 'Menyimpan...' : 'Simpan Hak Akses'}
              </button>
            </div>
          </div>
        }
      >
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-neutral-500">
          {permLabels.map((p) => (
            <div key={p.key} className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-neutral-700">{p.short}</span>
              <span>= {p.full}</span>
            </div>
          ))}
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-4 py-3 font-semibold text-neutral-700 sticky left-0 bg-neutral-50 z-10 min-w-[160px]">
                  Peran
                </th>
                {moduleSlugs.map((slug) => {
                  const meta = builtinModules.find((m) => m.slug === slug)
                  return (
                    <th key={slug} className="px-2 py-3 text-center min-w-[120px]">
                      <div className="font-semibold text-neutral-700 text-xs">{meta?.name || slug}</div>
                    </th>
                  )
                })}
                <th className="px-3 py-3 text-center min-w-[100px]">
                  <span className="text-xs font-semibold text-neutral-500">Aksi Cepat</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ALL_ROLES.map((role, idx) => (
                <tr key={role} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                  <td className="px-4 py-3 sticky left-0 z-10 bg-inherit border-r border-neutral-100">
                    <div className="font-semibold text-neutral-800">{ROLE_LABELS[role]}</div>
                    <div className="text-xs text-neutral-400">{ROLE_DESCRIPTIONS[role]}</div>
                  </td>
                  {moduleSlugs.map((slug) => {
                    const p = matrix[role]?.[slug]
                    return (
                      <td key={slug} className="px-2 py-3">
                        <div className="flex justify-center gap-1">
                          {permLabels.map((pl) => (
                            <button
                              key={pl.key}
                              onClick={() => togglePerm(role, slug, pl.key)}
                              title={`${pl.full} - ${meta_name(builtinModules, slug)}`}
                              className={`h-7 w-7 rounded-md text-xs font-mono font-bold transition-all ${
                                p?.[pl.key]
                                  ? 'bg-primary-600 text-white shadow-sm'
                                  : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                              }`}
                            >
                              {pl.short}
                            </button>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-3 py-3">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => setAllForRole(role, true)}
                        title="Centang semua"
                        className="h-7 px-2 rounded-md text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      >
                        ✓ All
                      </button>
                      <button
                        onClick={() => setAllForRole(role, false)}
                        title="Hapus semua"
                        className="h-7 px-2 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
          <strong>Super Admin</strong> selalu memiliki akses penuh terlepas dari pengaturan di atas.
          Perubahan disimpan per kombinasi peran + modul.
        </div>
      </SectionCard>
    </div>
  )
}

function meta_name(modules: { slug: string; name: string }[], slug: string) {
  return modules.find((m) => m.slug === slug)?.name || slug
}

// ============================================================
// TAB 3: PENYIMPANAN & BACKUP
// ============================================================

function StorageBackupTab({ pondokId, showToast }: { pondokId: string; showToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [storage, setStorage] = useState<string>('cloud_simkbm')
  const [savingStorage, setSavingStorage] = useState(false)
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null)
  const [backupProvider, setBackupProvider] = useState('local')
  const [backupSchedule, setBackupSchedule] = useState('manual')
  const [savingBackup, setSavingBackup] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const { data: pondok } = await supabase.from('pondok').select('config').eq('id', pondokId).maybeSingle()
    const cfg = (pondok as any)?.config || {}
    setStorage(cfg.storage || 'cloud_simkbm')

    const { data: backup } = await supabase
      .from('backup_config')
      .select('*')
      .eq('pondok_id', pondokId)
      .eq('is_active', true)
      .maybeSingle()
    if (backup) {
      setBackupConfig(backup as BackupConfig)
      setBackupProvider((backup as BackupConfig).provider)
      setBackupSchedule((backup as BackupConfig).schedule)
    }
    setLoading(false)
  }, [pondokId])

  useEffect(() => { loadConfig() }, [loadConfig])

  const saveStorage = async () => {
    setSavingStorage(true)
    try {
      const { data: pondok } = await supabase.from('pondok').select('config').eq('id', pondokId).maybeSingle()
      const currentConfig = (pondok as any)?.config || {}
      const { error } = await supabase.from('pondok').update({
        config: { ...currentConfig, storage },
      }).eq('id', pondokId)
      if (error) throw error
      showToast('Pilihan penyimpanan disimpan', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', 'error')
    } finally { setSavingStorage(false) }
  }

  const saveBackup = async () => {
    setSavingBackup(true)
    try {
      const { error } = await supabase.from('backup_config').upsert({
        pondok_id: pondokId, provider: backupProvider, schedule: backupSchedule,
        is_active: true, settings: {},
      }, { onConflict: 'pondok_id,provider' })
      if (error) throw error
      // Deactivate other providers
      await supabase.from('backup_config')
        .update({ is_active: false })
        .neq('provider', backupProvider)
        .eq('pondok_id', pondokId)
      await loadConfig()
      showToast('Konfigurasi backup disimpan', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', 'error')
    } finally { setSavingBackup(false) }
  }

  const backupNow = async () => {
    setBackingUp(true)
    try {
      // Update last_backup timestamp
      await supabase.from('backup_config')
        .update({ last_backup: new Date().toISOString() })
        .eq('pondok_id', pondokId)
        .eq('is_active', true)
      await loadConfig()
      showToast('Backup dimulai. Proses berjalan di latar belakang.', 'info')
    } catch {
      showToast('Gagal memulai backup', 'error')
    } finally { setBackingUp(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in space-y-6">
      {/* Storage Selection */}
      <SectionCard
        icon="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
        iconColor="bg-primary-50 text-primary-600"
        title="Pilihan Penyimpanan"
        subtitle="Pilih di mana data lembaga Anda disimpan"
        footer={
          <div className="flex justify-end">
            <button className="btn-primary" onClick={saveStorage} disabled={savingStorage}>
              {savingStorage ? 'Menyimpan...' : 'Simpan Pilihan'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {STORAGE_OPTIONS.map((opt) => {
            const active = storage === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setStorage(opt.id)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-start gap-4 ${
                  active ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-primary-500' : 'bg-neutral-100'}`}>
                  <svg className={`h-5 w-5 ${active ? 'text-white' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{opt.label}</span>
                    {opt.badge && <span className="badge bg-primary-50 text-primary-600 text-xs">{opt.badge}</span>}
                  </div>
                  <div className="text-sm text-neutral-500 mt-0.5">{opt.desc}</div>
                </div>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                  active ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                }`}>
                  {active && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            )
          })}
        </div>
      </SectionCard>

      {/* Backup Configuration */}
      <SectionCard
        icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        iconColor="bg-blue-50 text-blue-600"
        title="Konfigurasi Backup"
        subtitle="Atur jadwal dan tujuan backup otomatis"
        footer={
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-500">
              {backupConfig?.last_backup ? (
                <span>Backup terakhir: <strong className="text-neutral-700">{new Date(backupConfig.last_backup).toLocaleString('id-ID')}</strong></span>
              ) : (
                <span>Belum pernah backup</span>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={backupNow} disabled={backingUp}>
                {backingUp ? 'Memulai...' : '⚡ Backup Now'}
              </button>
              <button className="btn-primary" onClick={saveBackup} disabled={savingBackup}>
                {savingBackup ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="label mb-2">Penyedia Backup</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BACKUP_PROVIDERS.map((p) => {
                const active = backupProvider === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setBackupProvider(p.id)}
                    className={`rounded-xl border-2 p-3 transition-all flex flex-col items-center gap-2 text-center ${
                      active ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${active ? 'bg-primary-500 text-white' : p.color}`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                      </svg>
                    </div>
                    <span className="text-xs font-medium">{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Schedule Selection */}
          <div>
            <label className="label mb-2">Jadwal Backup</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BACKUP_SCHEDULES.map((s) => {
                const active = backupSchedule === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setBackupSchedule(s.id)}
                    className={`rounded-xl border-2 p-3 transition-all text-left ${
                      active ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{s.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status */}
          {backupConfig && (
            <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${backupConfig.is_active ? 'bg-green-500' : 'bg-neutral-300'}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  Backup {backupConfig.is_active ? 'Aktif' : 'Nonaktif'} — {BACKUP_PROVIDERS.find((p) => p.id === backupConfig.provider)?.label || backupConfig.provider}
                </div>
                <div className="text-xs text-neutral-500">
                  Jadwal: {BACKUP_SCHEDULES.find((s) => s.id === backupConfig.schedule)?.label || backupConfig.schedule}
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

// ============================================================
// TAB 4: API & INTEGRASI
// ============================================================

function ApiTab({ pondokId, showToast }: { pondokId: string; showToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('pondok_id', pondokId)
      .order('created_at', { ascending: false })
    setKeys((data || []) as ApiKey[])
    setLoading(false)
  }, [pondokId])

  useEffect(() => { loadKeys() }, [loadKeys])

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const segments = []
    for (let s = 0; s < 4; s++) {
      let seg = ''
      for (let i = 0; i < 8; i++) seg += chars[Math.floor(Math.random() * chars.length)]
      segments.push(seg)
    }
    return `skk_${segments.join('_')}`
  }

  const hashKey = async (key: string) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(key)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  const createKey = async () => {
    if (!newKeyName.trim()) { showToast('Nama API key harus diisi', 'error'); return }
    setCreating(true)
    try {
      const rawKey = generateApiKey()
      const hash = await hashKey(rawKey)
      const { error } = await supabase.from('api_keys').insert({
        pondok_id: pondokId,
        name: newKeyName.trim(),
        key_hash: hash,
        permissions: newKeyPerms,
        is_active: true,
      })
      if (error) throw error
      setCreatedKey(rawKey)
      setNewKeyName('')
      setNewKeyPerms([])
      setShowCreate(false)
      await loadKeys()
      showToast('API key berhasil dibuat', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat API key', 'error')
    } finally { setCreating(false) }
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Hapus API key ini? Tindakan tidak dapat dibatalkan.')) return
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', id)
      if (error) throw error
      await loadKeys()
      showToast('API key dihapus', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus', 'error')
    }
  }

  const toggleKeyActive = async (key: ApiKey) => {
    try {
      const { error } = await supabase.from('api_keys')
        .update({ is_active: !key.is_active }).eq('id', key.id)
      if (error) throw error
      await loadKeys()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah status', 'error')
    }
  }

  const togglePerm = (perm: string) => {
    setNewKeyPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm])
  }

  const maskKey = (hash: string) => {
    if (!hash || hash.length < 12) return hash
    return `${hash.slice(0, 8)}${'•'.repeat(24)}${hash.slice(-4)}`
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in space-y-6">
      {/* Created Key Modal */}
      {createdKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={() => setCreatedKey(null)}>
          <div className="card p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">API Key Dibuat</h3>
                <p className="text-sm text-neutral-500">Salin sekarang — tidak akan ditampilkan lagi</p>
              </div>
            </div>
            <div className="rounded-xl bg-neutral-900 p-4 font-mono text-sm text-green-400 break-all select-all">
              {createdKey}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="btn-secondary flex-1"
                onClick={() => { navigator.clipboard?.writeText(createdKey); showToast('API key disalin ke clipboard', 'success') }}
              >
                Salin
              </button>
              <button className="btn-primary flex-1" onClick={() => setCreatedKey(null)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      <SectionCard
        icon="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        iconColor="bg-primary-50 text-primary-600"
        title="API & Integrasi"
        subtitle="Kelola kunci API untuk integrasi eksternal"
        footer={
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Tutup' : '+ Buat API Key'}
            </button>
          </div>
        }
      >
        {/* Create Form */}
        {showCreate && (
          <div className="mb-6 rounded-xl border-2 border-primary-200 bg-primary-50/30 p-5 animate-fade-in">
            <h3 className="font-semibold mb-4">Buat API Key Baru</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Nama API Key *</label>
                <input className="input" value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="mis. Integrasi Mobile App" />
              </div>
              <div>
                <label className="label">Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {API_PERMISSION_OPTIONS.map((perm) => {
                    const active = newKeyPerms.includes(perm)
                    return (
                      <button
                        key={perm}
                        onClick={() => togglePerm(perm)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          active ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {perm}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={createKey} disabled={creating}>
                  {creating ? 'Membuat...' : 'Generate API Key'}
                </button>
                <button className="btn-secondary" onClick={() => { setShowCreate(false); setNewKeyName(''); setNewKeyPerms([]) }}>
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keys Table */}
        {keys.length === 0 ? (
          <EmptyState
            icon="M15 7a2 2 0 12-4 2 2 0 014 0zM7 7a2 2 0 11-4 0 2 2 0 014 0zM12 17v-3m0 0a4 4 0 00-4-4H4m8 4a4 4 0 014-4h4"
            title="Belum ada API Key"
            desc="Buat API key untuk mengintegrasikan aplikasi eksternal dengan SIM KBM"
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700">Key Hash</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700">Permissions</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700">Terakhir Dipakai</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-700">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-neutral-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key, idx) => (
                  <tr key={key.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-800">{key.name}</div>
                      <div className="text-xs text-neutral-400">Dibuat {new Date(key.created_at).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-neutral-500">{maskKey(key.key_hash)}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(key.permissions || []).slice(0, 3).map((p: string) => (
                          <span key={p} className="badge bg-neutral-100 text-neutral-600 text-xs">{p}</span>
                        ))}
                        {(key.permissions || []).length > 3 && (
                          <span className="badge bg-neutral-100 text-neutral-500 text-xs">+{(key.permissions || []).length - 3}</span>
                        )}
                        {(key.permissions || []).length === 0 && <span className="text-xs text-neutral-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {key.last_used ? new Date(key.last_used).toLocaleString('id-ID') : 'Belum pernah'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={key.is_active ? 'active' : 'inactive'}
                        labels={{
                          active: { text: 'Aktif', class: 'bg-green-50 text-green-600' },
                          inactive: { text: 'Nonaktif', class: 'bg-neutral-100 text-neutral-500' },
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => toggleKeyActive(key)}
                          title={key.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={key.is_active ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteKey(key.id)}
                          title="Hapus"
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
          ⚠️ API key hanya ditampilkan sekali saat pembuatan. Simpan di tempat aman. Hash disimpan di database.
        </div>
      </SectionCard>
    </div>
  )
}

// ============================================================
// TAB 5: NOTIFIKASI
// ============================================================

function NotifikasiTab({ pondokId, showToast }: { pondokId: string; showToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({
    email: true, push: true, announcement: true, perizinan: true, payment: true,
  })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: pondok } = await supabase.from('pondok').select('config').eq('id', pondokId).maybeSingle()
    const cfg = (pondok as any)?.config || {}
    setNotifSettings({
      email: cfg.notifications?.email ?? true,
      push: cfg.notifications?.push ?? true,
      announcement: cfg.notifications?.announcement ?? true,
      perizinan: cfg.notifications?.perizinan ?? true,
      payment: cfg.notifications?.payment ?? true,
    })

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('pondok_id', pondokId)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifications((notifs || []) as Notification[])
    setLoading(false)
  }, [pondokId])

  useEffect(() => { load() }, [load])

  const toggle = (key: string) => {
    setNotifSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const { data: pondok } = await supabase.from('pondok').select('config').eq('id', pondokId).maybeSingle()
      const currentConfig = (pondok as any)?.config || {}
      const { error } = await supabase.from('pondok').update({
        config: { ...currentConfig, notifications: notifSettings },
      }).eq('id', pondokId)
      if (error) throw error
      showToast('Pengaturan notifikasi disimpan', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  const typeIcons: Record<string, string> = {
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    error: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  }

  return (
    <div className="animate-fade-in space-y-6">
      <SectionCard
        icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        iconColor="bg-primary-50 text-primary-600"
        title="Pengaturan Notifikasi"
        subtitle="Pilih jenis notifikasi yang ingin Anda terima"
        footer={
          <div className="flex justify-end">
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {NOTIFICATION_TOGGLES.map((n) => (
            <div
              key={n.key}
              className="flex items-center gap-4 rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold">{n.label}</div>
                <div className="text-sm text-neutral-500">{n.desc}</div>
              </div>
              <ToggleSwitch checked={notifSettings[n.key]} onChange={() => toggle(n.key)} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Recent Notifications */}
      <SectionCard
        icon="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6"
        iconColor="bg-blue-50 text-blue-600"
        title="Notifikasi Terbaru"
        subtitle="10 notifikasi terakhir di lembaga Anda"
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            title="Belum ada notifikasi"
            desc="Notifikasi yang muncul di lembaga Anda akan ditampilkan di sini"
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                  n.is_read ? 'border-neutral-200 bg-white' : 'border-primary-200 bg-primary-50/30'
                }`}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  n.is_read ? 'bg-neutral-100 text-neutral-400' : 'bg-primary-50 text-primary-600'
                }`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[n.type] || typeIcons.info} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-neutral-800">{n.title}</span>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />}
                  </div>
                  {n.message && <p className="text-xs text-neutral-500 mt-0.5 truncate">{n.message}</p>}
                  <div className="text-xs text-neutral-400 mt-1">{new Date(n.created_at).toLocaleString('id-ID')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ============================================================
// TAB 6: TENTANG
// ============================================================

function TentangTab() {
  const techStack = [
    { name: 'React 18', desc: 'UI Framework', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { name: 'TypeScript', desc: 'Type Safety', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
    { name: 'Tailwind CSS', desc: 'Styling', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { name: 'Vite', desc: 'Build Tool', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { name: 'Supabase', desc: 'Backend & Database', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { name: 'React Router', desc: 'Routing', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
  ]

  const links = [
    { label: 'SIM KBM Studio', desc: 'Custom modul & workflow builder', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z', color: 'bg-primary-50 text-primary-600' },
    { label: 'Marketplace', desc: 'Modul dan template tambahan', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', color: 'bg-blue-50 text-blue-600' },
    { label: 'Theme Store', desc: 'Tema dan kustomisasi tampilan', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="animate-fade-in">
      {/* Hero Card */}
      <div className="card p-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-br from-primary-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="relative flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-display font-bold text-3xl mb-4 shadow-lg">
            K
          </div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">SIM KBM Platform</h2>
          <p className="text-sm text-neutral-500 mt-1 max-w-md">
            Sistem Informasi Manajemen Kelembagaan Binaan Masyarakat — Platform ERP terpadu untuk pondok pesantren, madrasah, dan lembaga pendidikan Islam.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="badge bg-primary-50 text-primary-600">v1.0.0</span>
            <span className="badge bg-blue-50 text-blue-600">PWA Ready</span>
            <span className="badge bg-green-50 text-green-600">Open Source</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tech Stack */}
        <SectionCard
          icon="M10.325 4.317c.698-2.026 3.988-2.026 4.686 0a2.7 2.7 0 002.7 1.937c2.14 0 3.4 2.4 2.4 4.2a2.7 2.7 0 001.937 2.7c2.026.698 2.026 3.988 0 4.686a2.7 2.7 0 00-1.937 2.7c0 2.14-2.4 3.4-4.2 2.4a2.7 2.7 0 00-2.7 1.937c-.698 2.026-3.988 2.026-4.686 0a2.7 2.7 0 00-2.7-1.937c-2.14 0-3.4-2.4-2.4-4.2a2.7 2.7 0 00-1.937-2.7c-2.026-.698-2.026-3.988 0-4.686a2.7 2.7 0 001.937-2.7c0-2.14 2.4-3.4 4.2-2.4a2.7 2.7 0 002.7-1.937z"
          iconColor="bg-primary-50 text-primary-600"
          title="Teknologi"
          subtitle="Stack teknologi yang digunakan"
        >
          <div className="space-y-2">
            {techStack.map((t) => (
              <div key={t.name} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-neutral-500">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Links */}
        <SectionCard
          icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          iconColor="bg-blue-50 text-blue-600"
          title="Tautan Terkait"
          subtitle="Jelajahi ekosistem SIM KBM"
        >
          <div className="space-y-2">
            {links.map((l) => (
              <a
                key={l.label}
                href="#"
                className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${l.color}`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={l.icon} />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm group-hover:text-primary-600 transition-colors">{l.label}</div>
                  <div className="text-xs text-neutral-500">{l.desc}</div>
                </div>
                <svg className="h-4 w-4 text-neutral-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Info Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <div className="card p-5">
          <div className="text-xs text-neutral-500 mb-1">Versi Aplikasi</div>
          <div className="font-display font-bold text-lg">1.0.0</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-neutral-500 mb-1">Platform</div>
          <div className="font-display font-bold text-lg">PWA</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-neutral-500 mb-1">Lisensi</div>
          <div className="font-display font-bold text-lg">MIT</div>
        </div>
      </div>

      <div className="card p-5 mt-6 text-center">
        <p className="text-sm text-neutral-500">
          © {new Date().getFullYear()} SIM KBM Platform. Dibuat dengan ❤️ untuk pendidikan Islam.
        </p>
      </div>
    </div>
  )
}

// ============================================================
// MAIN SETTINGS PAGE
// ============================================================

export default function SettingsPage() {
  const { profile, pondok } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('profil')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pondok && profile) setLoading(false)
  }, [pondok, profile])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
  }, [])

  if (loading) return <LoadingSpinner />

  const pondokId = pondok?.id || ''

  return (
    <div className="animate-fade-in">
      <PageHeader title="Pengaturan" subtitle="Kelola informasi lembaga, hak akses, dan konfigurasi sistem" />

      {/* Tab Navigation */}
      <div className="mb-6">
        {/* Desktop: sidebar tabs */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 shrink-0">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {TABS.map((tab) => {
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all whitespace-nowrap lg:whitespace-normal ${
                      active
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                    </svg>
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profil' && <ProfilLembagaTab />}
            {activeTab === 'roles' && pondokId && <RolesTab pondokId={pondokId} showToast={showToast} />}
            {activeTab === 'storage' && pondokId && <StorageBackupTab pondokId={pondokId} showToast={showToast} />}
            {activeTab === 'api' && pondokId && <ApiTab pondokId={pondokId} showToast={showToast} />}
            {activeTab === 'notifikasi' && pondokId && <NotifikasiTab pondokId={pondokId} showToast={showToast} />}
            {activeTab === 'tentang' && <TentangTab />}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
