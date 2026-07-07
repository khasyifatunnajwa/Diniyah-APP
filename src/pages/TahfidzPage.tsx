import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner, StatusBadge } from '../components/ui'
import type { Tahfidz, Santri } from '../types'

type TahfidzStatus = 'hafalan' | 'murajaah' | 'setoran'

const STATUS_LABELS = {
  hafalan: { text: 'Hafalan', class: 'bg-blue-100 text-blue-700' },
  murajaah: { text: 'Murajaah', class: 'bg-amber-100 text-amber-700' },
  setoran: { text: 'Setoran', class: 'bg-emerald-100 text-emerald-700' },
}

const SURAHS = [
  'Al-Fatihah', 'Al-Baqarah', 'Ali Imran', 'An-Nisa', 'Al-Maidah',
  'Al-Anam', 'Al-Araf', 'Al-Anfal', 'At-Taubah', 'Yunus',
  'Hud', 'Yusuf', 'Ar-Rad', 'Ibrahim', 'Al-Hijr',
  'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha',
  'Al-Anbiya', 'Al-Hajj', 'Al-Muminun', 'An-Nur', 'Al-Furqan',
  'Ash-Shuara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum',
  'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir',
  'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir',
  'Fussilat', 'Ash-Shura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah',
  'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
  'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman',
  'Al-Waqiah', 'Al-Hadid', 'Al-Mujadila', 'Al-Hashr', 'Al-Mumtahanah',
  'As-Saff', 'Al-Jumuah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq',
  'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Maarij',
  'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah',
  'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Naziat', 'Abasa',
  'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj',
  'At-Tariq', 'Al-Ala', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad',
  'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin',
  'Al-Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat',
  'Al-Qariah', 'At-Takathur', 'Al-Asr', 'Al-Humazah', 'Al-Fil',
  'Quraysh', 'Al-Maun', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr',
  'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas',
]

interface FormData {
  santri_id: string
  surah: string
  ayat_start: string
  ayat_end: string
  juz: string
  status: TahfidzStatus
  date: string
  notes: string
}

const EMPTY_FORM: FormData = {
  santri_id: '',
  surah: '',
  ayat_start: '',
  ayat_end: '',
  juz: '',
  status: 'hafalan',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

interface TahfidzWithSantri extends Tahfidz {
  santri?: { full_name: string; nis: string | null }
}

export default function TahfidzPage() {
  const { profile, pondok } = useAuth()
  const [records, setRecords] = useState<TahfidzWithSantri[]>([])
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<TahfidzWithSantri | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [filterSantri, setFilterSantri] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const pid = pondok?.id

  const load = async () => {
    if (!pid) return
    setLoading(true)
    const { data } = await supabase
      .from('tahfidz')
      .select('*, santri:santri_id(full_name, nis)')
      .eq('pondok_id', pid)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setRecords((data as TahfidzWithSantri[]) || [])
    setLoading(false)
  }

  const loadSantri = async () => {
    if (!pid) return
    const { data } = await supabase
      .from('santri')
      .select('id, full_name, nis, status')
      .eq('pondok_id', pid)
      .eq('status', 'aktif')
      .order('full_name')
    setSantriList((data as Santri[]) || [])
  }

  useEffect(() => {
    load()
    loadSantri()
  }, [pid])

  const openAdd = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (t: TahfidzWithSantri) => {
    setEditItem(t)
    setForm({
      santri_id: t.santri_id,
      surah: t.surah,
      ayat_start: t.ayat_start ? String(t.ayat_start) : '',
      ayat_end: t.ayat_end ? String(t.ayat_end) : '',
      juz: t.juz ? String(t.juz) : '',
      status: t.status,
      date: t.date || '',
      notes: t.notes || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditItem(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pid || !profile) return
    setSaving(true)
    const payload = {
      pondok_id: pid,
      santri_id: form.santri_id,
      surah: form.surah,
      ayat_start: form.ayat_start ? Number(form.ayat_start) : null,
      ayat_end: form.ayat_end ? Number(form.ayat_end) : null,
      juz: form.juz ? Number(form.juz) : null,
      status: form.status,
      date: form.date,
      notes: form.notes || null,
      musyrif_id: profile.id,
    }
    if (editItem) {
      await supabase.from('tahfidz').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('tahfidz').insert(payload)
    }
    setSaving(false)
    closeModal()
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus catatan tahfidz ini?')) return
    await supabase.from('tahfidz').delete().eq('id', id)
    load()
  }

  const filtered = records.filter((r) => {
    const matchSantri = filterSantri === 'all' || r.santri_id === filterSantri
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSantri && matchStatus
  })

  // Stats
  const totalHafalan = records.filter(r => r.status === 'hafalan').length
  const totalMurajaah = records.filter(r => r.status === 'murajaah').length
  const totalSetoran = records.filter(r => r.status === 'setoran').length
  const uniqueSantri = new Set(records.map(r => r.santri_id)).size

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tahfidz"
        subtitle="Pelacakan hafalan Al-Qur'an santri"
        action={
          <button onClick={openAdd} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Catat Tahfidz
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Total Catatan</p>
          <p className="font-display text-2xl font-bold text-neutral-900 mt-1">{records.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Hafalan Baru</p>
          <p className="font-display text-2xl font-bold text-blue-600 mt-1">{totalHafalan}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Murajaah</p>
          <p className="font-display text-2xl font-bold text-amber-600 mt-1">{totalMurajaah}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Setoran</p>
          <p className="font-display text-2xl font-bold text-emerald-600 mt-1">{totalSetoran}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <select className="input sm:max-w-xs" value={filterSantri} onChange={e => setFilterSantri(e.target.value)}>
          <option value="all">Semua Santri</option>
          {santriList.map(s => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
        <select className="input sm:max-w-[180px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="hafalan">Hafalan</option>
          <option value="murajaah">Murajaah</option>
          <option value="setoran">Setoran</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            title="Belum ada catatan tahfidz"
            desc="Klik tombol Catat Tahfidz untuk menambah catatan pertama"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Santri</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Surah</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 hidden md:table-cell">Ayat</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 hidden lg:table-cell">Juz</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 hidden md:table-cell">Tanggal</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 hidden lg:table-cell">Catatan</th>
                  <th className="text-right px-4 py-3 font-semibold text-neutral-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-800">{(t.santri as any)?.full_name || '-'}</div>
                      <div className="text-xs text-neutral-400">{(t.santri as any)?.nis || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-800">{t.surah}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">
                      {t.ayat_start && t.ayat_end ? `${t.ayat_start}-${t.ayat_end}` : t.ayat_start || t.ayat_end || '-'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 hidden lg:table-cell">{t.juz || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">
                      {t.date ? new Date(t.date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 hidden lg:table-cell max-w-[200px] truncate">
                      {t.notes || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(t)} className="btn-secondary py-1.5 px-3 text-xs">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="btn-danger py-1.5 px-3 text-xs">
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">
                {editItem ? 'Edit Catatan Tahfidz' : 'Catat Tahfidz'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-2 rounded-xl">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Santri *</label>
                <select
                  className="input"
                  required
                  value={form.santri_id}
                  onChange={e => setForm(f => ({ ...f, santri_id: e.target.value }))}
                >
                  <option value="">Pilih Santri</option>
                  {santriList.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}{s.nis ? ` (${s.nis})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Surah *</label>
                <select
                  className="input"
                  required
                  value={form.surah}
                  onChange={e => setForm(f => ({ ...f, surah: e.target.value }))}
                >
                  <option value="">Pilih Surah</option>
                  {SURAHS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Ayat Mulai</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    placeholder="1"
                    value={form.ayat_start}
                    onChange={e => setForm(f => ({ ...f, ayat_start: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Ayat Selesai</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    placeholder="10"
                    value={form.ayat_end}
                    onChange={e => setForm(f => ({ ...f, ayat_end: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Juz</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={30}
                    placeholder="1-30"
                    value={form.juz}
                    onChange={e => setForm(f => ({ ...f, juz: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Status *</label>
                  <select
                    className="input"
                    required
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as TahfidzStatus }))}
                  >
                    <option value="hafalan">Hafalan</option>
                    <option value="murajaah">Murajaah</option>
                    <option value="setoran">Setoran</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Tanggal *</label>
                <input
                  type="date"
                  className="input"
                  required
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Catatan</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder="Catatan tambahan..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Catat Tahfidz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
