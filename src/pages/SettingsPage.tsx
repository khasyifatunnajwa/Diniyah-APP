import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, LoadingSpinner } from '../components/ui'
import type { PondokType, Role } from '../types'

const PONDOK_TYPES: { value: PondokType; label: string }[] = [
  { value: 'pondok', label: 'Pondok Pesantren' },
  { value: 'madrasah', label: 'Madrasah' },
  { value: 'tpq', label: "TPQ / TPA" },
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

const MODULES = [
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

export default function SettingsPage() {
  const { profile, pondok, refreshProfile } = useAuth()

  // Pondok form
  const [pondokForm, setPondokForm] = useState({
    name: '',
    type: 'pondok' as PondokType,
    address: '',
    phone: '',
    email: '',
    modules: [] as string[],
  })
  const [savingPondok, setSavingPondok] = useState(false)
  const [pondokMsg, setPondokMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [loading, setLoading] = useState(true)

  // Sync forms when data loads
  useEffect(() => {
    if (pondok) {
      setPondokForm({
        name: pondok.name || '',
        type: pondok.type || 'pondok',
        address: pondok.address || '',
        phone: pondok.phone || '',
        email: pondok.email || '',
        modules: pondok.modules || [],
      })
    }
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      })
    }
    if (pondok && profile) setLoading(false)
  }, [pondok, profile])

  const toggleModule = (id: string) => {
    setPondokForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(id) ? prev.modules.filter((m) => m !== id) : [...prev.modules, id],
    }))
  }

  const savePondok = async () => {
    if (!pondok) return
    if (!pondokForm.name.trim()) {
      setPondokMsg({ type: 'error', text: 'Nama lembaga harus diisi' })
      return
    }
    setSavingPondok(true)
    setPondokMsg(null)
    try {
      const { error } = await supabase
        .from('pondok')
        .update({
          name: pondokForm.name.trim(),
          type: pondokForm.type,
          address: pondokForm.address.trim() || null,
          phone: pondokForm.phone.trim() || null,
          email: pondokForm.email.trim() || null,
          modules: pondokForm.modules,
        })
        .eq('id', pondok.id)
      if (error) throw error
      await refreshProfile()
      setPondokMsg({ type: 'success', text: 'Pengaturan lembaga berhasil disimpan' })
    } catch (err) {
      setPondokMsg({ type: 'error', text: err instanceof Error ? err.message : 'Terjadi kesalahan' })
    } finally {
      setSavingPondok(false)
    }
  }

  const saveProfile = async () => {
    if (!profile) return
    if (!profileForm.full_name.trim()) {
      setProfileMsg({ type: 'error', text: 'Nama lengkap harus diisi' })
      return
    }
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim() || null,
        })
        .eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Terjadi kesalahan' })
    } finally {
      setSavingProfile(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader title="Pengaturan" subtitle="Kelola informasi lembaga dan profil Anda" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* === Pondok Settings === */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Lembaga */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">Informasi Lembaga</h2>
                <p className="text-sm text-neutral-500">Data dasar lembaga Anda</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Nama Lembaga *</label>
                <input
                  className="input"
                  value={pondokForm.name}
                  onChange={(e) => setPondokForm({ ...pondokForm, name: e.target.value })}
                  placeholder="Nama lembaga..."
                />
              </div>

              <div>
                <label className="label">Jenis Lembaga</label>
                <select
                  className="input"
                  value={pondokForm.type}
                  onChange={(e) => setPondokForm({ ...pondokForm, type: e.target.value as PondokType })}
                >
                  {PONDOK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Alamat</label>
                <textarea
                  className="input min-h-[70px] resize-y"
                  value={pondokForm.address}
                  onChange={(e) => setPondokForm({ ...pondokForm, address: e.target.value })}
                  placeholder="Alamat lengkap lembaga..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Telepon</label>
                  <input
                    className="input"
                    value={pondokForm.phone}
                    onChange={(e) => setPondokForm({ ...pondokForm, phone: e.target.value })}
                    placeholder="08..."
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={pondokForm.email}
                    onChange={(e) => setPondokForm({ ...pondokForm, email: e.target.value })}
                    placeholder="info@lembaga.com"
                  />
                </div>
              </div>
            </div>

            {pondokMsg && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  pondokMsg.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}
              >
                {pondokMsg.text}
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button className="btn-primary" onClick={savePondok} disabled={savingPondok}>
                {savingPondok ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>

          {/* Modul */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">Modul Aktif</h2>
                <p className="text-sm text-neutral-500">Pilih modul yang digunakan di lembaga Anda</p>
              </div>
            </div>

            <div className="space-y-3">
              {MODULES.map((m) => {
                const active = pondokForm.modules.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleModule(m.id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-center gap-4 ${
                      active ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
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

            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
              Perubahan modul akan disimpan bersama pengaturan lembaga.
            </div>

            <div className="flex justify-end mt-5">
              <button className="btn-primary" onClick={savePondok} disabled={savingPondok}>
                {savingPondok ? 'Menyimpan...' : 'Simpan Modul'}
              </button>
            </div>
          </div>
        </div>

        {/* === Profile Settings === */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">Profil Saya</h2>
                <p className="text-sm text-neutral-500">Informasi akun Anda</p>
              </div>
            </div>

            {/* Avatar + role */}
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
                <input
                  className="input"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  placeholder="Nama lengkap..."
                />
              </div>
              <div>
                <label className="label">Telepon</label>
                <input
                  className="input"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="08..."
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input bg-neutral-50"
                  value={profile ? 'Terhubung via akun' : ''}
                  disabled
                />
                <p className="text-xs text-neutral-400 mt-1">Email terhubung dengan akun autentikasi</p>
              </div>
              <div>
                <label className="label">Peran</label>
                <input
                  className="input bg-neutral-50"
                  value={profile ? ROLE_LABELS[profile.role] : ''}
                  disabled
                />
              </div>
            </div>

            {profileMsg && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  profileMsg.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button className="btn-primary" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </div>

          {/* Info card */}
          <div className="card p-6">
            <h3 className="font-semibold text-sm mb-3">Tentang SIM KBM</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Sistem Informasi Manajemen KBM (Kelembagaan Binaan Masyarakat) adalah platform ERP
              terpadu untuk pondok pesantren, madrasah, dan lembaga pendidikan Islam.
            </p>
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Versi</span>
                <span className="font-medium">1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
