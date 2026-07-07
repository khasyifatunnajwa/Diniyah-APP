import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner, StatusBadge } from '../components/ui'
import type { Inventaris } from '../types'

const CONDITION_LABELS: Record<string, { text: string; class: string }> = {
  baik: { text: 'Baik', class: 'bg-green-100 text-green-700' },
  rusak_ringan: { text: 'Rusak Ringan', class: 'bg-amber-100 text-amber-700' },
  rusak_berat: { text: 'Rusak Berat', class: 'bg-red-100 text-red-700' },
}

const CATEGORIES = [
  'Elektronik',
  'Furniture',
  'Peralatan Kantor',
  'Peralatan Dapur',
  'Peralatan Olahraga',
  'Peralatan Ibadah',
  'Buku & Perpustakaan',
  'Kendaraan',
  'Bangunan',
  'Lainnya',
]

const UNITS = ['unit', 'pcs', 'set', 'box', 'pak', 'lusin', 'meter', 'kg', 'liter']

const emptyForm = {
  name: '',
  category: '',
  quantity: 1,
  unit: 'unit',
  condition: 'baik' as Inventaris['condition'],
  location: '',
  notes: '',
}

export default function InventarisPage() {
  const { pondok } = useAuth()
  const pid = pondok?.id

  const [items, setItems] = useState<Inventaris[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('semua')
  const [filterCondition, setFilterCondition] = useState('semua')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Inventaris | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadItems = async () => {
    if (!pid) return
    setLoading(true)
    const { data } = await supabase
      .from('inventaris')
      .select('*')
      .eq('pondok_id', pid)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  }, [pid])

  // --- Summary stats ---
  const summary = useMemo(() => {
    const totalItems = items.length
    const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0)
    const byCondition = {
      baik: items.filter((i) => i.condition === 'baik').reduce((s, i) => s + i.quantity, 0),
      rusak_ringan: items.filter((i) => i.condition === 'rusak_ringan').reduce((s, i) => s + i.quantity, 0),
      rusak_berat: items.filter((i) => i.condition === 'rusak_berat').reduce((s, i) => s + i.quantity, 0),
    }
    return { totalItems, totalQuantity, byCondition }
  }, [items])

  // --- Filtered items ---
  const filtered = useMemo(() => {
    return items.filter((i) => {
      const searchOk =
        !search ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.location || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.category || '').toLowerCase().includes(search.toLowerCase())
      const catOk = filterCategory === 'semua' || i.category === filterCategory
      const condOk = filterCondition === 'semua' || i.condition === filterCondition
      return searchOk && catOk && condOk
    })
  }, [items, search, filterCategory, filterCondition])

  // --- CRUD ---
  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (item: Inventaris) => {
    setEditing(item)
    setForm({
      name: item.name,
      category: item.category || '',
      quantity: item.quantity,
      unit: item.unit,
      condition: item.condition,
      location: item.location || '',
      notes: item.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  const save = async () => {
    if (!pid) return
    if (!form.name.trim()) { setError('Nama barang harus diisi'); return }
    if (form.quantity < 0) { setError('Jumlah tidak boleh negatif'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        pondok_id: pid,
        name: form.name.trim(),
        category: form.category || null,
        quantity: form.quantity,
        unit: form.unit,
        condition: form.condition,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      }
      if (editing) {
        const { error } = await supabase.from('inventaris').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('inventaris').insert(payload)
        if (error) throw error
      }
      setShowModal(false)
      await loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus item inventaris ini?')) return
    setDeletingId(id)
    await supabase.from('inventaris').delete().eq('id', id)
    setDeletingId(null)
    await loadItems()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventaris"
        subtitle="Kelola aset dan barang milik lembaga"
        action={
          <button className="btn-primary" onClick={openAdd}>
            + Tambah Item
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Total Item</p>
          <p className="font-display text-2xl font-bold mt-1">{summary.totalItems}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Total Jumlah</p>
          <p className="font-display text-2xl font-bold mt-1">{summary.totalQuantity}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Kondisi Baik</p>
          <p className="font-display text-2xl font-bold mt-1 text-green-600">{summary.byCondition.baik}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Rusak</p>
          <p className="font-display text-2xl font-bold mt-1 text-amber-600">
            {summary.byCondition.rusak_ringan + summary.byCondition.rusak_berat}
          </p>
        </div>
      </div>

      {/* Condition breakdown bar */}
      {summary.totalQuantity > 0 && (
        <div className="card p-4 mb-6">
          <p className="text-xs font-semibold text-neutral-500 mb-2">Distribusi Kondisi</p>
          <div className="flex h-3 rounded-full overflow-hidden bg-neutral-100">
            <div
              className="bg-green-500"
              style={{ width: `${(summary.byCondition.baik / summary.totalQuantity) * 100}%` }}
              title={`Baik: ${summary.byCondition.baik}`}
            />
            <div
              className="bg-amber-500"
              style={{ width: `${(summary.byCondition.rusak_ringan / summary.totalQuantity) * 100}%` }}
              title={`Rusak Ringan: ${summary.byCondition.rusak_ringan}`}
            />
            <div
              className="bg-red-500"
              style={{ width: `${(summary.byCondition.rusak_berat / summary.totalQuantity) * 100}%` }}
              title={`Rusak Berat: ${summary.byCondition.rusak_berat}`}
            />
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> Baik ({summary.byCondition.baik})</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Rusak Ringan ({summary.byCondition.rusak_ringan})</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Rusak Berat ({summary.byCondition.rusak_berat})</span>
          </div>
        </div>
      )}

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-10"
            placeholder="Cari nama, lokasi, atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="semua">Semua Kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="input sm:w-48"
          value={filterCondition}
          onChange={(e) => setFilterCondition(e.target.value)}
        >
          <option value="semua">Semua Kondisi</option>
          <option value="baik">Baik</option>
          <option value="rusak_ringan">Rusak Ringan</option>
          <option value="rusak_berat">Rusak Berat</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          title={items.length === 0 ? "Belum ada inventaris" : "Tidak ditemukan"}
          desc={items.length === 0 ? "Tambahkan item inventaris pertama Anda." : "Coba ubah kata kunci atau filter pencarian."}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Nama Barang</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Kategori</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Jumlah</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Kondisi</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Lokasi</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{item.name}</p>
                      {item.notes && <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{item.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500">{item.category || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium">{item.quantity}</span>
                      <span className="text-neutral-400 ml-1">{item.unit}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.condition} labels={CONDITION_LABELS} />
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500">{item.location || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(item)} className="btn-secondary py-1.5 px-3 text-xs">Edit</button>
                        <button
                          onClick={() => remove(item.id)}
                          disabled={deletingId === item.id}
                          className="btn-danger py-1.5 px-3 text-xs"
                        >
                          {deletingId === item.id ? '...' : 'Hapus'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === Modal === */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">
                {editing ? 'Edit Item' : 'Tambah Item Inventaris'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nama Barang *</label>
                <input
                  className="input"
                  placeholder="Contoh: Meja Belajar, Proyektor, Karpet..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kategori</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="">Pilih kategori...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Kondisi</label>
                  <select
                    className="input"
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value as Inventaris['condition'] })}
                  >
                    <option value="baik">Baik</option>
                    <option value="rusak_ringan">Rusak Ringan</option>
                    <option value="rusak_berat">Rusak Berat</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jumlah *</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Satuan</label>
                  <select
                    className="input"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Lokasi</label>
                <input
                  className="input"
                  placeholder="Contoh: Gudang A, Ruang Kelas 3, Asrama Putra..."
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Catatan</label>
                <textarea
                  className="input min-h-[80px] resize-y"
                  placeholder="Catatan tambahan (opsional)..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-100">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
