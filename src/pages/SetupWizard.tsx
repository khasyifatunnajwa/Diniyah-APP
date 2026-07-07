import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { PondokType } from '../types'

const PONDOK_TYPES: { value: PondokType; label: string; desc: string }[] = [
  { value: 'pondok', label: 'Pondok Pesantren', desc: 'Pondok pesantren tradisional' },
  { value: 'madrasah', label: 'Madrasah', desc: 'Madrasah diniyah / tsanawiyyah' },
  { value: 'tpq', label: 'TPQ / TPA', desc: 'Taman Pendidikan Al-Qur\'an' },
  { value: 'sekolah', label: 'Sekolah Islam', desc: 'Sekolah Islam terpadu' },
  { value: 'yayasan', label: 'Yayasan', desc: 'Yayasan pendidikan Islam' },
]

const MODULES = [
  { id: 'akademik', label: 'Akademik', desc: 'Nilai, jadwal, absensi', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { id: 'administrasi', label: 'Administrasi', desc: 'Keuangan, inventaris, surat', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'pondok', label: 'Pondok', desc: 'Asrama, tahfidz, perizinan', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z' },
]

export default function SetupWizard() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, refreshProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [pondokType, setPondokType] = useState<PondokType>('pondok')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>(['akademik', 'administrasi', 'pondok'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleModule = (id: string) => {
    setSelectedModules((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id])
  }

  const handleFinish = async () => {
    setError('')
    setLoading(true)
    try {
      const userId = session?.user?.id
      if (!userId) throw new Error('Sesi tidak ditemukan')

      const { data: pondok, error: pondokErr } = await supabase
        .from('pondok')
        .insert({
          name,
          type: pondokType,
          address: address || null,
          phone: phone || null,
          email: email || null,
          modules: selectedModules,
        })
        .select()
        .single()
      if (pondokErr) throw pondokErr

      const { error: profErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          pondok_id: pondok.id,
          full_name: session?.user?.user_metadata?.full_name || 'Admin',
          role: 'admin_pondok',
        })
      if (profErr) throw profErr

      await refreshProfile()
      navigate('/app/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => setStep((s) => Math.min(s + 1, 4))
  const prevStep = () => setStep((s) => Math.max(s - 1, 1))

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 to-primary-800 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-primary-500 flex items-center justify-center font-display font-bold text-2xl text-white">K</div>
            <span className="font-display font-bold text-xl text-white">Setup Wizard</span>
          </div>
          <p className="text-primary-200/70">Konfigurasi lembaga Anda dalam beberapa menit</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s <= step ? 'bg-accent-400 text-primary-950' : 'bg-white/10 text-white/40'
              }`}>{s}</div>
              {s < 4 && <div className={`w-12 h-0.5 mx-1 ${s < step ? 'bg-accent-400' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-8 animate-fade-in">
          {/* Step 1: Type */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-2">Pilih Jenis Lembaga</h2>
              <p className="text-sm text-neutral-500 mb-6">Pilih jenis lembaga pendidikan Anda</p>
              <div className="space-y-3">
                {PONDOK_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setPondokType(t.value)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      pondokType === t.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{t.label}</div>
                        <div className="text-sm text-neutral-500">{t.desc}</div>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        pondokType === t.value ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                      }`}>
                        {pondokType === t.value && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Info */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-2">Informasi Lembaga</h2>
              <p className="text-sm text-neutral-500 mb-6">Isi data dasar lembaga Anda</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Nama Lembaga *</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pondok Pesantren..." required />
                </div>
                <div>
                  <label className="label">Alamat</label>
                  <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lembaga" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Telepon</label>
                    <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08..." />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@lembaga.com" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Modules */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-2">Pilih Modul</h2>
              <p className="text-sm text-neutral-500 mb-6">Pilih modul yang ingin digunakan. Dapat diubah nanti.</p>
              <div className="space-y-3">
                {MODULES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleModule(m.id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-center gap-4 ${
                      selectedModules.includes(m.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      selectedModules.includes(m.id) ? 'bg-primary-500' : 'bg-neutral-100'
                    }`}>
                      <svg className={`h-5 w-5 ${selectedModules.includes(m.id) ? 'text-white' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{m.label}</div>
                      <div className="text-sm text-neutral-500">{m.desc}</div>
                    </div>
                    <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center ${
                      selectedModules.includes(m.id) ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                    }`}>
                      {selectedModules.includes(m.id) && (
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-2">Konfirmasi</h2>
              <p className="text-sm text-neutral-500 mb-6">Periksa kembali sebelum menyelesaikan setup</p>
              <div className="space-y-3 rounded-xl bg-neutral-50 p-5">
                <div className="flex justify-between"><span className="text-neutral-500">Jenis</span><span className="font-medium">{PONDOK_TYPES.find(t => t.value === pondokType)?.label}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Nama</span><span className="font-medium">{name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Telepon</span><span className="font-medium">{phone || '-'}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Email</span><span className="font-medium">{email || '-'}</span></div>
                <div className="flex justify-between items-start"><span className="text-neutral-500">Modul</span><span className="font-medium text-right">{selectedModules.map(m => MODULES.find(x => x.id === m)?.label).join(', ')}</span></div>
              </div>
              <div className="mt-4 rounded-xl bg-primary-50 border border-primary-200 p-4 text-sm text-primary-700">
                Akun Anda akan menjadi <strong>Admin Pondok</strong> dengan akses penuh ke seluruh modul.
              </div>
              {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between mt-8">
            <button onClick={prevStep} disabled={step === 1} className="btn-secondary">
              Kembali
            </button>
            {step < 4 ? (
              <button onClick={nextStep} disabled={(step === 2 && !name)} className="btn-primary">
                Lanjut
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading} className="btn-primary">
                {loading ? 'Menyimpan...' : 'Selesaikan Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
