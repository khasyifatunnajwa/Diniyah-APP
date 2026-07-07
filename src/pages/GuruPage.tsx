import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner, StatusBadge } from '../components/ui'
import type { Guru } from '../types'

const STATUS_LABELS: Record<string, { text: string; class: string }> = {
  aktif: { text: 'Aktif', class: 'bg-green-50 text-green-600' },
  nonaktif: { text: 'Nonaktif', class: 'bg-neutral-100 text-neutral-500' },
}

interface FormState {
  nip: string
  full_name: string
  phone: string
  subject: string
  status: 'aktif' | 'nonaktif'
}

const EMPTY_FORM: FormState = {
  nip: '',
  full_name: '',
  phone: '',
  subject: '',
  status: 'aktif',
}

export default function GuruPage() {
  const { pondok } = useAuth()
  const [guruList, setGuruList] = useState<Guru[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Guru | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Guru | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    if (!pondok) return
    setLoading(true)
    const { data, error } = await supabase
      .from('guru')
      .select('*')
      .eq('pondok_id', pondok.id)
      .order('full_name', { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setGuruList(data as Guru[])
    }
    setLoading(false)
  }, [pondok])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = guruList.filter((g) => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q ||
      g.full_name?.toLowerCase().includes(q) ||
      g.nip?.toLowerCase().includes(q) ||
      g.subject?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || g.status === statusFilter
    return matchSearch && matchStatus
  })

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (g: Guru) => {
    setEditing(g)
    setForm({
      nip: g.nip || '',
      full_name: g.full_name || '',
      phone: g.phone || '',
      subject: g.subject || '',
      status: g.status || 'aktif',
    })
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pondok) return
    if (!form.full_name.trim()) {
      setError('Nama lengkap wajib diisi')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      pondok_id: pondok.id,
      nip: form.nip.trim() || null,
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      subject: form.subject.trim() || null,
      status: form.status,
    }
    let res
    if (editing) {
      res = await supabase.from('guru').update(payload).eq('id', editing.id)
    } else {
      res = await supabase.from('guru').insert(payload)
    }
    if (res.error) {
      setError(res.error.message)
      setSaving(false)
      return
    }
    setShowModal(false)
    setSaving(false)
    await loadData()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error: delErr } = await supabase.from('guru').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (delErr) {
      setError(delErr.message)
      return
    }
    setDeleteTarget(null)
    await loadData()
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Guru & Staff"
        subtitle="Kelola data guru dan staf pesantren"
        action={
          <button onClick={openAdd} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Guru
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, NIP, atau mata pelajaran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input sm:w-48"
          >
            <option value="all">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z"
            title="Belum ada data guru"
            desc="Klik tombol 'Tambah Guru' untuk menambahkan data guru atau staf baru."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="px-4 py-3">NIP</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-4 py-3">No. HP</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600">{g.nip || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
                          {g.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="font-medium text-neutral-900">{g.full_name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{g.subject || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600">{g.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={g.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(g)}
                          className="btn-ghost p-2"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(g)}
                          className="btn-ghost p-2 text-red-500 hover:bg-red-50"
                          title="Hapus"
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
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-neutral-400 mt-3 text-right">
          Menampilkan {filtered.length} dari {guruList.length} guru
        </p>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-display text-lg font-bold">{editing ? 'Edit Guru' : 'Tambah Guru'}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost p-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div>
                <label className="label">NIP</label>
                <input
                  type="text"
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  className="input"
                  placeholder="Nomor Induk Pegawai"
                />
              </div>
              <div>
                <label className="label">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input"
                  placeholder="Nama lengkap guru"
                  required
                />
              </div>
              <div>
                <label className="label">Mata Pelajaran / Bidang</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="input"
                  placeholder="Contoh: Matematika, Tahfidz, Bahasa Arab"
                />
              </div>
              <div>
                <label className="label">No. HP</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'aktif' | 'nonaktif' })}
                  className="input"
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">Hapus Guru?</h3>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Yakin ingin menghapus data <span className="font-semibold text-neutral-700">{deleteTarget.full_name}</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeleteTarget(null); setError(null) }} className="btn-secondary">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger">
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
