import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner, StatusBadge } from '../components/ui'
import type { Santri, Kelas } from '../types'

const STATUS_LABELS: Record<string, { text: string; class: string }> = {
  aktif: { text: 'Aktif', class: 'bg-green-50 text-green-600' },
  lulus: { text: 'Lulus', class: 'bg-blue-50 text-blue-600' },
  cuti: { text: 'Cuti', class: 'bg-amber-50 text-amber-600' },
  keluar: { text: 'Keluar', class: 'bg-red-50 text-red-600' },
}

const GENDER_LABELS: Record<string, string> = {
  L: 'Laki-laki',
  P: 'Perempuan',
}

interface FormState {
  nis: string
  full_name: string
  gender: 'L' | 'P' | ''
  birth_date: string
  address: string
  phone: string
  parent_name: string
  parent_phone: string
  kelas_id: string
  status: 'aktif' | 'lulus' | 'cuti' | 'keluar'
}

const EMPTY_FORM: FormState = {
  nis: '',
  full_name: '',
  gender: '',
  birth_date: '',
  address: '',
  phone: '',
  parent_name: '',
  parent_phone: '',
  kelas_id: '',
  status: 'aktif',
}

export default function SantriPage() {
  const { pondok } = useAuth()
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Santri | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Santri | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    if (!pondok) return
    const pid = pondok.id
    setLoading(true)
    const [santriRes, kelasRes] = await Promise.all([
      supabase.from('santri').select('*').eq('pondok_id', pid).order('full_name', { ascending: true }),
      supabase.from('kelas').select('*').eq('pondok_id', pid).order('name', { ascending: true }),
    ])
    if (santriRes.data) setSantriList(santriRes.data as Santri[])
    if (kelasRes.data) setKelasList(kelasRes.data as Kelas[])
    setError(santriRes.error?.message || kelasRes.error?.message || null)
    setLoading(false)
  }, [pondok])

  useEffect(() => {
    loadData()
  }, [loadData])

  const kelasName = (id: string | null) => {
    if (!id) return '-'
    return kelasList.find((k) => k.id === id)?.name || '-'
  }

  const filtered = santriList.filter((s) => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q ||
      s.full_name?.toLowerCase().includes(q) ||
      s.nis?.toLowerCase().includes(q) ||
      s.parent_name?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (s: Santri) => {
    setEditing(s)
    setForm({
      nis: s.nis || '',
      full_name: s.full_name || '',
      gender: s.gender || '',
      birth_date: s.birth_date || '',
      address: s.address || '',
      phone: s.phone || '',
      parent_name: s.parent_name || '',
      parent_phone: s.parent_phone || '',
      kelas_id: s.kelas_id || '',
      status: s.status || 'aktif',
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
      nis: form.nis.trim() || null,
      full_name: form.full_name.trim(),
      gender: form.gender || null,
      birth_date: form.birth_date || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      parent_name: form.parent_name.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
      kelas_id: form.kelas_id || null,
      status: form.status,
    }
    let res
    if (editing) {
      res = await supabase.from('santri').update(payload).eq('id', editing.id)
    } else {
      res = await supabase.from('santri').insert(payload)
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
    const { error: delErr } = await supabase.from('santri').delete().eq('id', deleteTarget.id)
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
        title="Data Santri"
        subtitle="Kelola data santri pesantren"
        action={
          <button onClick={openAdd} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Santri
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
              placeholder="Cari nama, NIS, atau wali..."
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
            <option value="lulus">Lulus</option>
            <option value="cuti">Cuti</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="M12 4.354a4 4 0 110 5.292M15 8H3m6 0a4 4 0 014 4v3a4 4 0 01-4 4H3m12-7a4 4 0 014 4v3a4 4 0 01-4 4h-3"
            title="Belum ada data santri"
            desc="Klik tombol 'Tambah Santri' untuk menambahkan data santri baru."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">L/P</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Wali / Orang Tua</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600">{s.nis || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{s.full_name}</div>
                      <div className="text-xs text-neutral-400">{s.phone || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {s.gender ? (
                        <span className="badge bg-neutral-100 text-neutral-600">{s.gender}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{kelasName(s.kelas_id)}</td>
                    <td className="px-4 py-3">
                      <div className="text-neutral-700">{s.parent_name || '-'}</div>
                      <div className="text-xs text-neutral-400">{s.parent_phone || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} labels={STATUS_LABELS} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="btn-ghost p-2"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
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
          Menampilkan {filtered.length} dari {santriList.length} santri
        </p>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-display text-lg font-bold">{editing ? 'Edit Santri' : 'Tambah Santri'}</h2>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">NIS</label>
                  <input
                    type="text"
                    value={form.nis}
                    onChange={(e) => setForm({ ...form, nis: e.target.value })}
                    className="input"
                    placeholder="Nomor Induk Santri"
                  />
                </div>
                <div>
                  <label className="label">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="input"
                    placeholder="Nama lengkap santri"
                    required
                  />
                </div>
                <div>
                  <label className="label">Jenis Kelamin</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as 'L' | 'P' | '' })}
                    className="input"
                  >
                    <option value="">Pilih jenis kelamin</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Alamat</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="input"
                    placeholder="Alamat lengkap"
                  />
                </div>
                <div>
                  <label className="label">No. HP Santri</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="label">Kelas</label>
                  <select
                    value={form.kelas_id}
                    onChange={(e) => setForm({ ...form, kelas_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Tanpa kelas</option>
                    {kelasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}{k.level ? ` (${k.level})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={form.parent_name}
                    onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                    className="input"
                    placeholder="Nama orang tua / wali"
                  />
                </div>
                <div>
                  <label className="label">No. HP Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                    className="input"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as FormState['status'] })}
                    className="input"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="lulus">Lulus</option>
                    <option value="cuti">Cuti</option>
                    <option value="keluar">Keluar</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Santri'}
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
                <h3 className="font-display font-bold text-lg">Hapus Santri?</h3>
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
