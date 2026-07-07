import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner, StatusBadge } from '../components/ui'
import type { Payment, Santri } from '../types'

type PaymentCategory = 'spp' | 'daftar' | 'seragam' | 'kitab' | 'lainnya'
type PaymentStatus = 'lunas' | 'cicilan' | 'belum_bayar'

const STATUS_LABELS = {
  lunas: { text: 'Lunas', class: 'bg-emerald-100 text-emerald-700' },
  cicilan: { text: 'Cicilan', class: 'bg-amber-100 text-amber-700' },
  belum_bayar: { text: 'Belum Bayar', class: 'bg-red-100 text-red-700' },
}

const CATEGORY_LABELS: Record<PaymentCategory, string> = {
  spp: 'SPP',
  daftar: 'Pendaftaran',
  seragam: 'Seragam',
  kitab: 'Kitab',
  lainnya: 'Lainnya',
}

const METHOD_OPTIONS = ['Transfer Bank', 'Tunai', 'QRIS', 'Virtual Account', 'Lainnya']

interface FormData {
  santri_id: string
  category: PaymentCategory
  amount: string
  status: PaymentStatus
  due_date: string
  paid_date: string
  method: string
  notes: string
}

const EMPTY_FORM: FormData = {
  santri_id: '',
  category: 'spp',
  amount: '',
  status: 'belum_bayar',
  due_date: '',
  paid_date: '',
  method: '',
  notes: '',
}

interface PaymentWithSantri extends Payment {
  santri?: { full_name: string; nis: string | null }
}

export default function FinancePage() {
  const { profile, pondok } = useAuth()
  const [payments, setPayments] = useState<PaymentWithSantri[]>([])
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<PaymentWithSantri | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const pid = pondok?.id

  const load = async () => {
    if (!pid) return
    setLoading(true)
    const { data } = await supabase
      .from('payments')
      .select('*, santri:santri_id(full_name, nis)')
      .eq('pondok_id', pid)
      .order('created_at', { ascending: false })
    setPayments((data as PaymentWithSantri[]) || [])
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

  const openEdit = (p: PaymentWithSantri) => {
    setEditItem(p)
    setForm({
      santri_id: p.santri_id,
      category: p.category,
      amount: String(p.amount),
      status: p.status,
      due_date: p.due_date || '',
      paid_date: p.paid_date || '',
      method: p.method || '',
      notes: p.notes || '',
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
      category: form.category,
      amount: Number(form.amount),
      status: form.status,
      due_date: form.due_date || null,
      paid_date: form.paid_date || null,
      method: form.method || null,
      notes: form.notes || null,
      recorded_by: profile.id,
    }

    if (editItem) {
      await supabase.from('payments').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('payments').insert(payload)
    }

    setSaving(false)
    closeModal()
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data pembayaran ini?')) return
    await supabase.from('payments').delete().eq('id', id)
    load()
  }

  const filtered = payments.filter((p) => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const matchCategory = filterCategory === 'all' || p.category === filterCategory
    const santriName = (p.santri as any)?.full_name?.toLowerCase() || ''
    const matchSearch = searchQuery === '' || santriName.includes(searchQuery.toLowerCase())
    return matchStatus && matchCategory && matchSearch
  })

  const totalLunas = payments.filter((p) => p.status === 'lunas').reduce((s, p) => s + p.amount, 0)
  const totalCicilan = payments.filter((p) => p.status === 'cicilan').reduce((s, p) => s + p.amount, 0)
  const totalTertunggak = payments.filter((p) => p.status === 'belum_bayar').reduce((s, p) => s + p.amount, 0)
  const totalPenerimaan = totalLunas + totalCicilan

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Keuangan"
        subtitle="Manajemen pembayaran dan iuran santri"
        action={
          <button onClick={openAdd} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pembayaran
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Total Penerimaan</p>
          <p className="font-display text-xl font-bold text-neutral-900 mt-1">{fmt(totalPenerimaan)}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{payments.filter(p => p.status !== 'belum_bayar').length} transaksi</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Sudah Lunas</p>
          <p className="font-display text-xl font-bold text-emerald-600 mt-1">{fmt(totalLunas)}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{payments.filter(p => p.status === 'lunas').length} santri</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Cicilan</p>
          <p className="font-display text-xl font-bold text-amber-600 mt-1">{fmt(totalCicilan)}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{payments.filter(p => p.status === 'cicilan').length} santri</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Tertunggak</p>
          <p className="font-display text-xl font-bold text-red-600 mt-1">{fmt(totalTertunggak)}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{payments.filter(p => p.status === 'belum_bayar').length} santri</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          className="input sm:max-w-xs"
          placeholder="Cari nama santri..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select className="input sm:max-w-[180px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="lunas">Lunas</option>
          <option value="cicilan">Cicilan</option>
          <option value="belum_bayar">Belum Bayar</option>
        </select>
        <select className="input sm:max-w-[180px]" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">Semua Kategori</option>
          {(Object.keys(CATEGORY_LABELS) as PaymentCategory[]).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            title="Belum ada data pembayaran"
            desc="Klik tombol Tambah Pembayaran untuk mencatat pembayaran pertama"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Santri</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Kategori</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Nominal</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 hidden md:table-cell">Jatuh Tempo</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 hidden md:table-cell">Tgl Bayar</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 hidden lg:table-cell">Metode</th>
                  <th className="text-right px-4 py-3 font-semibold text-neutral-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-800">{(p.santri as any)?.full_name || '-'}</div>
                      <div className="text-xs text-neutral-400">{(p.santri as any)?.nis || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-primary-50 text-primary-700">{CATEGORY_LABELS[p.category]}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-800">{fmt(p.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">
                      {p.due_date ? new Date(p.due_date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">
                      {p.paid_date ? new Date(p.paid_date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 hidden lg:table-cell">{p.method || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="btn-danger py-1.5 px-3 text-xs"
                        >
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
                {editItem ? 'Edit Pembayaran' : 'Tambah Pembayaran'}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kategori *</label>
                  <select
                    className="input"
                    required
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as PaymentCategory }))}
                  >
                    {(Object.keys(CATEGORY_LABELS) as PaymentCategory[]).map(c => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status *</label>
                  <select
                    className="input"
                    required
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as PaymentStatus }))}
                  >
                    <option value="belum_bayar">Belum Bayar</option>
                    <option value="cicilan">Cicilan</option>
                    <option value="lunas">Lunas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Nominal (Rp) *</label>
                <input
                  type="number"
                  className="input"
                  required
                  min={0}
                  placeholder="Contoh: 500000"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jatuh Tempo</label>
                  <input
                    type="date"
                    className="input"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Tanggal Bayar</label>
                  <input
                    type="date"
                    className="input"
                    value={form.paid_date}
                    onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Metode Pembayaran</label>
                <select
                  className="input"
                  value={form.method}
                  onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
                >
                  <option value="">Pilih Metode</option>
                  {METHOD_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
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
                  {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
