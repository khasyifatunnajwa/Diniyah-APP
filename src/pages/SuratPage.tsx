import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner, StatusBadge } from '../components/ui'
import type { Surat } from '../types'

const TYPE_LABELS: Record<string, { text: string; class: string }> = {
  masuk: { text: 'Surat Masuk', class: 'bg-blue-100 text-blue-700' },
  keluar: { text: 'Surat Keluar', class: 'bg-purple-100 text-purple-700' },
}

const emptyForm = {
  number: '',
  title: '',
  type: 'masuk' as Surat['type'],
  recipient: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function SuratPage() {
  const { pondok } = useAuth()
  const pid = pondok?.id

  const [suratList, setSuratList] = useState<Surat[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'semua' | 'masuk' | 'keluar'>('semua')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Surat | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadSurat = async () => {
    if (!pid) return
    setLoading(true)
    const { data } = await supabase
      .from('surat')
      .select('*')
      .eq('pondok_id', pid)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setSuratList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadSurat()
  }, [pid])

  // --- Summary stats ---
  const summary = useMemo(() => {
    const masuk = suratList.filter((s) => s.type === 'masuk').length
    const keluar = suratList.filter((s) => s.type === 'keluar').length
    return { total: suratList.length, masuk, keluar }
  }, [suratList])

  // --- Filtered list ---
  const filtered = useMemo(() => {
    return suratList.filter((s) => {
      const typeOk = filterType === 'semua' || s.type === filterType
      const searchOk =
        !search ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.number || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.recipient || '').toLowerCase().includes(search.toLowerCase())
      return typeOk && searchOk
    })
  }, [suratList, search, filterType])

  // --- CRUD ---
  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (s: Surat) => {
    setEditing(s)
    setForm({
      number: s.number || '',
      title: s.title,
      type: s.type,
      recipient: s.recipient || '',
      date: s.date,
      notes: s.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  const save = async () => {
    if (!pid) return
    if (!form.title.trim()) { setError('Judul surat harus diisi'); return }
    if (!form.date) { setError('Tanggal harus diisi'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        pondok_id: pid,
        number: form.number.trim() || null,
        title: form.title.trim(),
        type: form.type,
        recipient: form.recipient.trim() || null,
        date: form.date,
        notes: form.notes.trim() || null,
      }
      if (editing) {
        const { error } = await supabase.from('surat').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('surat').insert(payload)
        if (error) throw error
      }
      setShowModal(false)
      await loadSurat()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus surat ini?')) return
    setDeletingId(id)
    await supabase.from('surat').delete().eq('id', id)
    setDeletingId(null)
    await loadSurat()
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Surat Menyurat"
        subtitle="Kelola arsip surat masuk dan keluar"
        action={
          <button className="btn-primary" onClick={openAdd}>
            + Tambah Surat
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Total Surat</p>
          <p className="font-display text-2xl font-bold mt-1">{summary.total}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Surat Masuk</p>
          <p className="font-display text-2xl font-bold mt-1 text-blue-600">{summary.masuk}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Surat Keluar</p>
          <p className="font-display text-2xl font-bold mt-1 text-purple-600">{summary.keluar}</p>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-10"
            placeholder="Cari nomor, judul, atau penerima..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl">
          <button
            onClick={() => setFilterType('semua')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterType === 'semua' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterType('masuk')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterType === 'masuk' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => setFilterType('keluar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterType === 'keluar' ? 'bg-white text-purple-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          title={suratList.length === 0 ? "Belum ada surat" : "Tidak ditemukan"}
          desc={suratList.length === 0 ? "Tambahkan surat masuk atau keluar pertama Anda." : "Coba ubah kata kunci atau filter."}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Nomor</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Jenis</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Judul</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Penerima/Pengirim</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600">Tanggal</th>
                  <th className="px-5 py-3.5 font-semibold text-neutral-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5">
                      {s.number ? (
                        <span className="font-mono text-xs text-neutral-600">{s.number}</span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={s.type} labels={TYPE_LABELS} />
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{s.title}</p>
                      {s.notes && <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{s.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500">{s.recipient || '—'}</td>
                    <td className="px-5 py-3.5 text-neutral-500 whitespace-nowrap">{formatDate(s.date)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="btn-secondary py-1.5 px-3 text-xs">Edit</button>
                        <button
                          onClick={() => remove(s.id)}
                          disabled={deletingId === s.id}
                          className="btn-danger py-1.5 px-3 text-xs"
                        >
                          {deletingId === s.id ? '...' : 'Hapus'}
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
                {editing ? 'Edit Surat' : 'Tambah Surat'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jenis Surat *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'masuk' })}
                      className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                        form.type === 'masuk'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      Surat Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'keluar' })}
                      className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                        form.type === 'keluar'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      Surat Keluar
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Tanggal *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Nomor Surat</label>
                <input
                  className="input"
                  placeholder="Contoh: 001/PP/2024"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Judul / Perihal *</label>
                <input
                  className="input"
                  placeholder="Contoh: Undangan Rapat, Surat Tugas..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="label">
                  {form.type === 'masuk' ? 'Pengirim' : 'Penerima'}
                </label>
                <input
                  className="input"
                  placeholder={form.type === 'masuk' ? 'Dari siapa surat ini...' : 'Kepada siapa surat ini...'}
                  value={form.recipient}
                  onChange={(e) => setForm({ ...form, recipient: e.target.value })}
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
