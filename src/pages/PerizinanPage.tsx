import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner, StatusBadge } from '../components/ui'
import type { Perizinan, Santri } from '../types'

type PerizinanType = 'pulang' | 'sakit' | 'acara' | 'lainnya'
type PerizinanStatus = 'pending' | 'approved' | 'rejected'

const STATUS_LABELS = {
  pending: { text: 'Menunggu', class: 'bg-amber-100 text-amber-700' },
  approved: { text: 'Disetujui', class: 'bg-emerald-100 text-emerald-700' },
  rejected: { text: 'Ditolak', class: 'bg-red-100 text-red-700' },
}

const TYPE_LABELS: Record<PerizinanType, string> = {
  pulang: 'Pulang',
  sakit: 'Sakit',
  acara: 'Acara',
  lainnya: 'Lainnya',
}

const TYPE_COLORS: Record<PerizinanType, string> = {
  pulang: 'bg-purple-50 text-purple-700',
  sakit: 'bg-red-50 text-red-700',
  acara: 'bg-blue-50 text-blue-700',
  lainnya: 'bg-neutral-100 text-neutral-700',
}

interface FormData {
  santri_id: string
  type: PerizinanType
  start_date: string
  end_date: string
  reason: string
}

const EMPTY_FORM: FormData = {
  santri_id: '',
  type: 'pulang',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  reason: '',
}

interface PerizinanWithSantri extends Perizinan {
  santri?: { full_name: string; nis: string | null }
}

export default function PerizinanPage() {
  const { profile, pondok } = useAuth()
  const [perizinanList, setPerizinanList] = useState<PerizinanWithSantri[]>([])
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<PerizinanWithSantri | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('pending')

  const pid = pondok?.id

  const load = async () => {
    if (!pid) return
    setLoading(true)
    const { data } = await supabase
      .from('perizinan')
      .select('*, santri:santri_id(full_name, nis)')
      .eq('pondok_id', pid)
      .order('created_at', { ascending: false })
    setPerizinanList((data as PerizinanWithSantri[]) || [])
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

  const openEdit = (p: PerizinanWithSantri) => {
    setEditItem(p)
    setForm({
      santri_id: p.santri_id,
      type: p.type,
      start_date: p.start_date,
      end_date: p.end_date || '',
      reason: p.reason || '',
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
    if (!pid) return
    setSaving(true)
    const payload = {
      pondok_id: pid,
      santri_id: form.santri_id,
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      reason: form.reason || null,
      status: 'pending' as PerizinanStatus,
      approved_by: null,
    }
    if (editItem) {
      await supabase.from('perizinan').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('perizinan').insert(payload)
    }
    setSaving(false)
    closeModal()
    load()
  }

  const handleApprove = async (id: string) => {
    if (!profile) return
    await supabase.from('perizinan').update({ status: 'approved', approved_by: profile.id }).eq('id', id)
    load()
  }

  const handleReject = async (id: string) => {
    if (!profile) return
    await supabase.from('perizinan').update({ status: 'rejected', approved_by: profile.id }).eq('id', id)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data perizinan ini?')) return
    await supabase.from('perizinan').delete().eq('id', id)
    load()
  }

  const baseList = activeTab === 'pending'
    ? perizinanList.filter(p => p.status === 'pending')
    : perizinanList

  const filtered = baseList.filter((p) => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const matchType = filterType === 'all' || p.type === filterType
    return matchStatus && matchType
  })

  const pendingCount = perizinanList.filter(p => p.status === 'pending').length
  const approvedCount = perizinanList.filter(p => p.status === 'approved').length
  const rejectedCount = perizinanList.filter(p => p.status === 'rejected').length

  const daysBetween = (start: string, end: string | null) => {
    if (!end) return 1
    const s = new Date(start)
    const e = new Date(end)
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 1
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Perizinan"
        subtitle="Manajemen izin keluar santri"
        action={
          <button onClick={openAdd} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Buat Izin
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Menunggu</p>
          <p className="font-display text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Disetujui</p>
          <p className="font-display text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Ditolak</p>
          <p className="font-display text-2xl font-bold text-red-600 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-neutral-100 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab('pending'); setFilterStatus('all') }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Menunggu Persetujuan
          {pendingCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">{pendingCount}</span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('all'); setFilterStatus('all') }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'all' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Semua Perizinan
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <select className="input sm:max-w-[180px]" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Semua Jenis</option>
          {(Object.keys(TYPE_LABELS) as PerizinanType[]).map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        {activeTab === 'all' && (
          <select className="input sm:max-w-[180px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            title={activeTab === 'pending' ? 'Tidak ada izin menunggu persetujuan' : 'Belum ada data perizinan'}
            desc={activeTab === 'pending' ? 'Semua izin sudah diproses' : 'Klik tombol Buat Izin untuk membuat perizinan baru'}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="card p-4 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Avatar + Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(p.santri as any)?.full_name?.charAt(0) || 'S'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-800">{(p.santri as any)?.full_name || '-'}</span>
                      <span className={`badge ${TYPE_COLORS[p.type]}`}>{TYPE_LABELS[p.type]}</span>
                      <StatusBadge status={p.status} labels={STATUS_LABELS} />
                    </div>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {new Date(p.start_date).toLocaleDateString('id-ID')}
                      {p.end_date ? ` — ${new Date(p.end_date).toLocaleDateString('id-ID')}` : ''}
                      <span className="ml-1 text-neutral-400">
                        ({daysBetween(p.start_date, p.end_date)} hari)
                      </span>
                    </p>
                    {p.reason && (
                      <p className="text-sm text-neutral-600 mt-1 line-clamp-1">
                        <span className="text-neutral-400">Alasan: </span>{p.reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {p.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(p.id)}
                        className="btn py-1.5 px-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Setujui
                      </button>
                      <button
                        onClick={() => handleReject(p.id)}
                        className="btn-danger py-1.5 px-3 text-xs"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Tolak
                      </button>
                    </>
                  )}
                  <button onClick={() => openEdit(p)} className="btn-secondary py-1.5 px-3 text-xs">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="btn-danger py-1.5 px-3 text-xs">
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">
                {editItem ? 'Edit Perizinan' : 'Buat Izin Baru'}
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
                <label className="label">Jenis Izin *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TYPE_LABELS) as PerizinanType[]).map(t => (
                    <label
                      key={t}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        form.type === t
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={t}
                        checked={form.type === t}
                        onChange={() => setForm(f => ({ ...f, type: t }))}
                        className="sr-only"
                      />
                      <span className={`badge ${TYPE_COLORS[t]}`}>{TYPE_LABELS[t]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tanggal Mulai *</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Tanggal Selesai</label>
                  <input
                    type="date"
                    className="input"
                    min={form.start_date}
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Alasan / Keterangan</label>
                <textarea
                  className="input min-h-[100px] resize-none"
                  placeholder="Tulis alasan izin di sini..."
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Buat Izin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
