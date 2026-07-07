import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner, StatusBadge } from '../components/ui'
import type { Asrama, AsramaSantri, Santri, Profile } from '../types'

interface AsramaWithCount extends Asrama {
  musyrif?: { full_name: string } | null
  occupancy: number
}

interface AsramaSantriWithDetails extends AsramaSantri {
  santri?: { full_name: string; nis: string | null }
}

const EMPTY_ASRAMA = {
  name: '',
  building: '',
  capacity: '',
  mushrif_id: '',
}

const EMPTY_ASSIGN = {
  asrama_id: '',
  santri_id: '',
  room_number: '',
  bed_number: '',
}

export default function AsramaPage() {
  const { profile, pondok } = useAuth()
  const [asramaList, setAsramaList] = useState<AsramaWithCount[]>([])
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [musyrifList, setMusyrifList] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAsramaModal, setShowAsramaModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [editItem, setEditItem] = useState<AsramaWithCount | null>(null)
  const [selectedAsrama, setSelectedAsrama] = useState<AsramaWithCount | null>(null)
  const [asramaForm, setAsramaForm] = useState(EMPTY_ASRAMA)
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN)
  const [assignments, setAssignments] = useState<AsramaSantriWithDetails[]>([])

  const pid = pondok?.id

  const loadAsrama = async () => {
    if (!pid) return
    const { data } = await supabase
      .from('asrama')
      .select('*, musyrif:mushrif_id(full_name)')
      .eq('pondok_id', pid)
      .order('created_at', { ascending: false })
    const list = (data as AsramaWithCount[]) || []
    // Get occupancy counts
    const counts = await Promise.all(
      list.map(async (a) => {
        const { count } = await supabase
          .from('asrama_santri')
          .select('id', { count: 'exact', head: true })
          .eq('asrama_id', a.id)
        return { ...a, occupancy: count || 0 }
      })
    )
    setAsramaList(counts)
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

  const loadMusyrif = async () => {
    if (!pid) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('pondok_id', pid)
      .eq('role', 'musyrif')
      .order('full_name')
    setMusyrifList((data as Profile[]) || [])
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadAsrama(), loadSantri(), loadMusyrif()])
      setLoading(false)
    }
    init()
  }, [pid])

  const loadAssignments = async (asramaId: string) => {
    const { data } = await supabase
      .from('asrama_santri')
      .select('*, santri:santri_id(full_name, nis)')
      .eq('asrama_id', asramaId)
      .order('created_at', { ascending: false })
    setAssignments((data as AsramaSantriWithDetails[]) || [])
  }

  const openAddAsrama = () => {
    setEditItem(null)
    setAsramaForm(EMPTY_ASRAMA)
    setShowAsramaModal(true)
  }

  const openEditAsrama = (a: AsramaWithCount) => {
    setEditItem(a)
    setAsramaForm({
      name: a.name,
      building: a.building || '',
      capacity: String(a.capacity),
      mushrif_id: a.mushrif_id || '',
    })
    setShowAsramaModal(true)
  }

  const closeAsramaModal = () => {
    setShowAsramaModal(false)
    setEditItem(null)
    setAsramaForm(EMPTY_ASRAMA)
  }

  const handleSaveAsrama = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pid) return
    setSaving(true)
    const payload = {
      pondok_id: pid,
      name: asramaForm.name,
      building: asramaForm.building || null,
      capacity: Number(asramaForm.capacity),
      mushrif_id: asramaForm.mushrif_id || null,
    }
    if (editItem) {
      await supabase.from('asrama').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('asrama').insert(payload)
    }
    setSaving(false)
    closeAsramaModal()
    loadAsrama()
  }

  const handleDeleteAsrama = async (id: string) => {
    if (!confirm('Hapus asrama ini? Semua penempatan santri di asrama ini juga akan dihapus.')) return
    await supabase.from('asrama_santri').delete().eq('asrama_id', id)
    await supabase.from('asrama').delete().eq('id', id)
    setSelectedAsrama(null)
    loadAsrama()
  }

  const openAssignModal = (a: AsramaWithCount) => {
    setAssignForm({ ...EMPTY_ASSIGN, asrama_id: a.id })
    setShowAssignModal(true)
  }

  const closeAssignModal = () => {
    setShowAssignModal(false)
    setAssignForm(EMPTY_ASSIGN)
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('asrama_santri').insert({
      asrama_id: assignForm.asrama_id,
      santri_id: assignForm.santri_id,
      room_number: assignForm.room_number || null,
      bed_number: assignForm.bed_number || null,
      date_assigned: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    closeAssignModal()
    if (selectedAsrama) {
      loadAssignments(selectedAsrama.id)
    }
    loadAsrama()
  }

  const handleUnassign = async (id: string) => {
    if (!confirm('Keluarkan santri dari asrama ini?')) return
    await supabase.from('asrama_santri').delete().eq('id', id)
    if (selectedAsrama) {
      loadAssignments(selectedAsrama.id)
    }
    loadAsrama()
  }

  const openDetail = (a: AsramaWithCount) => {
    setSelectedAsrama(a)
    loadAssignments(a.id)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Asrama"
        subtitle="Manajemen asrama dan penempatan santri"
        action={
          <button onClick={openAddAsrama} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Asrama
          </button>
        }
      />

      {/* Asrama Cards */}
      {asramaList.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z"
            title="Belum ada asrama"
            desc="Klik tombol Tambah Asrama untuk membuat asrama pertama"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {asramaList.map((a) => {
            const pct = a.capacity > 0 ? Math.min((a.occupancy / a.capacity) * 100, 100) : 0
            const isFull = a.occupancy >= a.capacity
            return (
              <div key={a.id} className="card p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-11 w-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z" />
                    </svg>
                  </div>
                  <StatusBadge
                    status={isFull ? 'full' : 'available'}
                    labels={{
                      full: { text: 'Penuh', class: 'bg-red-100 text-red-700' },
                      available: { text: 'Tersedia', class: 'bg-emerald-100 text-emerald-700' },
                    }}
                  />
                </div>
                <h3 className="font-display font-bold text-lg text-neutral-900">{a.name}</h3>
                <p className="text-sm text-neutral-500">{a.building || 'Tanpa gedung'}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Musyrif: {(a.musyrif as any)?.full_name || 'Belum ditunjuk'}
                </p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-neutral-600">Kapasitas</span>
                    <span className="font-semibold text-neutral-800">{a.occupancy} / {a.capacity}</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-primary-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => openDetail(a)} className="btn-secondary flex-1 py-2 text-xs">
                    Lihat Santri
                  </button>
                  <button onClick={() => openEditAsrama(a)} className="btn-secondary py-2 px-3 text-xs">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteAsrama(a.id)} className="btn-danger py-2 px-3 text-xs">
                    Hapus
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Panel */}
      {selectedAsrama && (
        <div className="card p-6 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-lg">Santri di {selectedAsrama.name}</h2>
              <p className="text-sm text-neutral-500">{selectedAsrama.building || ''} • {assignments.length} santri</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openAssignModal(selectedAsrama)} className="btn-primary py-2 text-xs">
                + Tambah Santri
              </button>
              <button onClick={() => setSelectedAsrama(null)} className="btn-secondary py-2 px-3 text-xs">
                Tutup
              </button>
            </div>
          </div>

          {assignments.length === 0 ? (
            <p className="text-sm text-neutral-500 py-8 text-center">Belum ada santri di asrama ini</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/60">
                    <th className="text-left px-4 py-3 font-semibold text-neutral-600">Santri</th>
                    <th className="text-left px-4 py-3 font-semibold text-neutral-600">NIS</th>
                    <th className="text-left px-4 py-3 font-semibold text-neutral-600">Kamar</th>
                    <th className="text-left px-4 py-3 font-semibold text-neutral-600">Bed</th>
                    <th className="text-left px-4 py-3 font-semibold text-neutral-600">Tgl Masuk</th>
                    <th className="text-right px-4 py-3 font-semibold text-neutral-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-neutral-800">{(a.santri as any)?.full_name || '-'}</td>
                      <td className="px-4 py-3 text-neutral-600">{(a.santri as any)?.nis || '-'}</td>
                      <td className="px-4 py-3 text-neutral-600">{a.room_number || '-'}</td>
                      <td className="px-4 py-3 text-neutral-600">{a.bed_number || '-'}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {a.date_assigned ? new Date(a.date_assigned).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleUnassign(a.id)} className="btn-danger py-1.5 px-3 text-xs">
                          Keluarkan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Asrama Modal */}
      {showAsramaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">
                {editItem ? 'Edit Asrama' : 'Tambah Asrama'}
              </h2>
              <button onClick={closeAsramaModal} className="btn-ghost p-2 rounded-xl">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveAsrama} className="p-6 space-y-4">
              <div>
                <label className="label">Nama Asrama *</label>
                <input
                  className="input"
                  required
                  placeholder="Contoh: Asrama Putra 1"
                  value={asramaForm.name}
                  onChange={e => setAsramaForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Gedung / Lokasi</label>
                <input
                  className="input"
                  placeholder="Contoh: Gedung A Lt. 2"
                  value={asramaForm.building}
                  onChange={e => setAsramaForm(f => ({ ...f, building: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Kapasitas *</label>
                <input
                  type="number"
                  className="input"
                  required
                  min={1}
                  placeholder="Contoh: 50"
                  value={asramaForm.capacity}
                  onChange={e => setAsramaForm(f => ({ ...f, capacity: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Musyrif</label>
                <select
                  className="input"
                  value={asramaForm.mushrif_id}
                  onChange={e => setAsramaForm(f => ({ ...f, mushrif_id: e.target.value }))}
                >
                  <option value="">Pilih Musyrif</option>
                  {musyrifList.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
                {musyrifList.length === 0 && (
                  <p className="text-xs text-neutral-400 mt-1">Belum ada musyrif terdaftar</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeAsramaModal} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Asrama'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">Tambah Santri ke Asrama</h2>
              <button onClick={closeAssignModal} className="btn-ghost p-2 rounded-xl">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4">
              <div>
                <label className="label">Asrama</label>
                <select className="input" required value={assignForm.asrama_id} onChange={e => setAssignForm(f => ({ ...f, asrama_id: e.target.value }))}>
                  <option value="">Pilih Asrama</option>
                  {asramaList.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.occupancy}/{a.capacity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Santri *</label>
                <select className="input" required value={assignForm.santri_id} onChange={e => setAssignForm(f => ({ ...f, santri_id: e.target.value }))}>
                  <option value="">Pilih Santri</option>
                  {santriList.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}{s.nis ? ` (${s.nis})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nomor Kamar</label>
                  <input
                    className="input"
                    placeholder="Contoh: 101"
                    value={assignForm.room_number}
                    onChange={e => setAssignForm(f => ({ ...f, room_number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Nomor Bed</label>
                  <input
                    className="input"
                    placeholder="Contoh: A1"
                    value={assignForm.bed_number}
                    onChange={e => setAssignForm(f => ({ ...f, bed_number: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeAssignModal} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Tambah ke Asrama'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
