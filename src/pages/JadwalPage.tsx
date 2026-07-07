import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner } from '../components/ui'
import type { Jadwal, Kelas, Subject } from '../types'

const DAYS = [
  { key: 'senin', label: 'Senin' },
  { key: 'selasa', label: 'Selasa' },
  { key: 'rabu', label: 'Rabu' },
  { key: 'kamis', label: 'Kamis' },
  { key: 'jumat', label: "Jum'at" },
  { key: 'sabtu', label: 'Sabtu' },
  { key: 'ahad', label: 'Ahad' },
]

type Tab = 'jadwal' | 'mapel'

interface JadwalWithRel extends Jadwal {
  kelas?: { name: string }
  subjects?: { name: string; code: string | null }
}

const emptyJadwalForm = {
  kelas_id: '',
  subject_id: '',
  day: 'senin',
  start_time: '07:00',
  end_time: '08:00',
  room: '',
}

const emptySubjectForm = {
  name: '',
  code: '',
  kelas_id: '',
}

export default function JadwalPage() {
  const { pondok } = useAuth()
  const [tab, setTab] = useState<Tab>('jadwal')

  // Jadwal state
  const [jadwalList, setJadwalList] = useState<JadwalWithRel[]>([])
  const [kelas, setKelas] = useState<Kelas[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string>('semua')
  const [filterKelas, setFilterKelas] = useState<string>('semua')
  const [showJadwalModal, setShowJadwalModal] = useState(false)
  const [editingJadwal, setEditingJadwal] = useState<JadwalWithRel | null>(null)
  const [jadwalForm, setJadwalForm] = useState(emptyJadwalForm)
  const [savingJadwal, setSavingJadwal] = useState(false)
  const [jadwalError, setJadwalError] = useState('')

  // Subject state
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm)
  const [savingSubject, setSavingSubject] = useState(false)
  const [subjectError, setSubjectError] = useState('')
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null)
  const [deletingJadwalId, setDeletingJadwalId] = useState<string | null>(null)

  const pid = pondok?.id

  const loadData = async () => {
    if (!pid) return
    setLoading(true)
    const [jRes, kRes, sRes] = await Promise.all([
      supabase
        .from('jadwal')
        .select('*, kelas(name), subjects(name, code)')
        .eq('pondok_id', pid)
        .order('start_time'),
      supabase.from('kelas').select('*').eq('pondok_id', pid).order('name'),
      supabase.from('subjects').select('*').eq('pondok_id', pid).order('name'),
    ])
    setJadwalList((jRes.data as JadwalWithRel[]) || [])
    setKelas(kRes.data || [])
    setSubjects(sRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [pid])

  // --- Jadwal CRUD ---
  const openAddJadwal = () => {
    setEditingJadwal(null)
    setJadwalForm(emptyJadwalForm)
    setJadwalError('')
    setShowJadwalModal(true)
  }

  const openEditJadwal = (j: JadwalWithRel) => {
    setEditingJadwal(j)
    setJadwalForm({
      kelas_id: j.kelas_id,
      subject_id: j.subject_id || '',
      day: j.day,
      start_time: j.start_time,
      end_time: j.end_time,
      room: j.room || '',
    })
    setJadwalError('')
    setShowJadwalModal(true)
  }

  const saveJadwal = async () => {
    if (!pid) return
    if (!jadwalForm.kelas_id) { setJadwalError('Pilih kelas terlebih dahulu'); return }
    if (!jadwalForm.day) { setJadwalError('Pilih hari terlebih dahulu'); return }
    if (!jadwalForm.start_time || !jadwalForm.end_time) { setJadwalError('Waktu harus diisi'); return }
    setSavingJadwal(true)
    setJadwalError('')
    try {
      const payload = {
        pondok_id: pid,
        kelas_id: jadwalForm.kelas_id,
        subject_id: jadwalForm.subject_id || null,
        day: jadwalForm.day,
        start_time: jadwalForm.start_time,
        end_time: jadwalForm.end_time,
        room: jadwalForm.room || null,
      }
      if (editingJadwal) {
        const { error } = await supabase.from('jadwal').update(payload).eq('id', editingJadwal.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('jadwal').insert(payload)
        if (error) throw error
      }
      setShowJadwalModal(false)
      await loadData()
    } catch (err) {
      setJadwalError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSavingJadwal(false)
    }
  }

  const deleteJadwal = async (id: string) => {
    if (!confirm('Hapus jadwal ini?')) return
    setDeletingJadwalId(id)
    await supabase.from('jadwal').delete().eq('id', id)
    setDeletingJadwalId(null)
    await loadData()
  }

  // --- Subject CRUD ---
  const openAddSubject = () => {
    setEditingSubject(null)
    setSubjectForm(emptySubjectForm)
    setSubjectError('')
    setShowSubjectModal(true)
  }

  const openEditSubject = (s: Subject) => {
    setEditingSubject(s)
    setSubjectForm({ name: s.name, code: s.code || '', kelas_id: s.kelas_id || '' })
    setSubjectError('')
    setShowSubjectModal(true)
  }

  const saveSubject = async () => {
    if (!pid) return
    if (!subjectForm.name.trim()) { setSubjectError('Nama mapel harus diisi'); return }
    setSavingSubject(true)
    setSubjectError('')
    try {
      const payload = {
        pondok_id: pid,
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim() || null,
        kelas_id: subjectForm.kelas_id || null,
      }
      if (editingSubject) {
        const { error } = await supabase.from('subjects').update(payload).eq('id', editingSubject.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('subjects').insert(payload)
        if (error) throw error
      }
      setShowSubjectModal(false)
      await loadData()
    } catch (err) {
      setSubjectError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSavingSubject(false)
    }
  }

  const deleteSubject = async (id: string) => {
    if (!confirm('Hapus mata pelajaran ini?')) return
    setDeletingSubjectId(id)
    await supabase.from('subjects').delete().eq('id', id)
    setDeletingSubjectId(null)
    await loadData()
  }

  // --- Filtered display ---
  const filteredJadwal = jadwalList.filter((j) => {
    const dayOk = selectedDay === 'semua' || j.day === selectedDay
    const kelasOk = filterKelas === 'semua' || j.kelas_id === filterKelas
    return dayOk && kelasOk
  })

  const jadwalByDay = DAYS.reduce<Record<string, JadwalWithRel[]>>((acc, d) => {
    acc[d.key] = filteredJadwal.filter((j) => j.day === d.key)
    return acc
  }, {})

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Jadwal Pelajaran"
        subtitle="Kelola jadwal dan mata pelajaran"
        action={
          <div className="flex gap-2">
            {tab === 'jadwal' && (
              <button className="btn-primary" onClick={openAddJadwal}>
                + Tambah Jadwal
              </button>
            )}
            {tab === 'mapel' && (
              <button className="btn-primary" onClick={openAddSubject}>
                + Tambah Mapel
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab('jadwal')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'jadwal' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Jadwal Mingguan
        </button>
        <button
          onClick={() => setTab('mapel')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'mapel' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Mata Pelajaran
        </button>
      </div>

      {/* --- Jadwal Tab --- */}
      {tab === 'jadwal' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <select
              className="input w-auto"
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
            >
              <option value="semua">Semua Kelas</option>
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setSelectedDay('semua')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedDay === 'semua' ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300'
                }`}
              >
                Semua
              </button>
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setSelectedDay(d.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedDay === d.key ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-primary-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {filteredJadwal.length === 0 ? (
            <EmptyState
              icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              title="Belum ada jadwal"
              desc="Tambahkan jadwal pelajaran menggunakan tombol di atas."
            />
          ) : selectedDay === 'semua' ? (
            // Weekly grid view
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {DAYS.map((d) => (
                <div key={d.key} className="card overflow-hidden">
                  <div className="bg-primary-50 border-b border-primary-100 px-4 py-3">
                    <h3 className="font-semibold text-primary-900">{d.label}</h3>
                    <p className="text-xs text-primary-600">{jadwalByDay[d.key].length} sesi</p>
                  </div>
                  <div className="p-3 space-y-2">
                    {jadwalByDay[d.key].length === 0 ? (
                      <p className="text-xs text-neutral-400 py-3 text-center">Tidak ada jadwal</p>
                    ) : (
                      jadwalByDay[d.key].map((j) => (
                        <JadwalCard
                          key={j.id}
                          j={j}
                          onEdit={() => openEditJadwal(j)}
                          onDelete={() => deleteJadwal(j.id)}
                          deleting={deletingJadwalId === j.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Single day list view
            <div className="card overflow-hidden">
              <div className="bg-primary-50 border-b border-primary-100 px-5 py-4">
                <h3 className="font-semibold text-primary-900">
                  {DAYS.find((d) => d.key === selectedDay)?.label}
                </h3>
                <p className="text-xs text-primary-600">{filteredJadwal.length} sesi</p>
              </div>
              <div className="divide-y divide-neutral-100">
                {filteredJadwal.map((j) => (
                  <div key={j.id} className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-center bg-primary-50 rounded-xl px-3 py-2 min-w-[70px]">
                        <p className="text-xs font-semibold text-primary-700">{j.start_time}</p>
                        <p className="text-xs text-primary-400">—</p>
                        <p className="text-xs font-semibold text-primary-700">{j.end_time}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{j.subjects?.name || <span className="text-neutral-400 italic">Mapel belum dipilih</span>}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {j.kelas?.name}{j.room ? ` · ${j.room}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditJadwal(j)} className="btn-secondary py-1.5 px-3 text-xs">Edit</button>
                      <button
                        onClick={() => deleteJadwal(j.id)}
                        disabled={deletingJadwalId === j.id}
                        className="btn-danger py-1.5 px-3 text-xs"
                      >
                        {deletingJadwalId === j.id ? '...' : 'Hapus'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* --- Mapel Tab --- */}
      {tab === 'mapel' && (
        <>
          {subjects.length === 0 ? (
            <EmptyState
              icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              title="Belum ada mata pelajaran"
              desc="Tambahkan mata pelajaran yang diajarkan di lembaga Anda."
            />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 text-left">
                    <th className="px-5 py-3.5 font-semibold text-neutral-600">Nama Mapel</th>
                    <th className="px-5 py-3.5 font-semibold text-neutral-600">Kode</th>
                    <th className="px-5 py-3.5 font-semibold text-neutral-600">Kelas</th>
                    <th className="px-5 py-3.5 font-semibold text-neutral-600 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium">{s.name}</td>
                      <td className="px-5 py-3.5 text-neutral-500">
                        {s.code ? <span className="badge bg-neutral-100 text-neutral-600">{s.code}</span> : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500">
                        {kelas.find((k) => k.id === s.kelas_id)?.name || 'Semua kelas'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditSubject(s)} className="btn-secondary py-1.5 px-3 text-xs">Edit</button>
                          <button
                            onClick={() => deleteSubject(s.id)}
                            disabled={deletingSubjectId === s.id}
                            className="btn-danger py-1.5 px-3 text-xs"
                          >
                            {deletingSubjectId === s.id ? '...' : 'Hapus'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* === Modal Tambah/Edit Jadwal === */}
      {showJadwalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">
                {editingJadwal ? 'Edit Jadwal' : 'Tambah Jadwal'}
              </h2>
              <button
                onClick={() => setShowJadwalModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Kelas *</label>
                <select
                  className="input"
                  value={jadwalForm.kelas_id}
                  onChange={(e) => setJadwalForm({ ...jadwalForm, kelas_id: e.target.value })}
                >
                  <option value="">Pilih kelas...</option>
                  {kelas.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Mata Pelajaran</label>
                <select
                  className="input"
                  value={jadwalForm.subject_id}
                  onChange={(e) => setJadwalForm({ ...jadwalForm, subject_id: e.target.value })}
                >
                  <option value="">Pilih mapel...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hari *</label>
                <select
                  className="input"
                  value={jadwalForm.day}
                  onChange={(e) => setJadwalForm({ ...jadwalForm, day: e.target.value })}
                >
                  {DAYS.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jam Mulai *</label>
                  <input
                    type="time"
                    className="input"
                    value={jadwalForm.start_time}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Jam Selesai *</label>
                  <input
                    type="time"
                    className="input"
                    value={jadwalForm.end_time}
                    onChange={(e) => setJadwalForm({ ...jadwalForm, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Ruangan</label>
                <input
                  className="input"
                  placeholder="Contoh: Kelas A, Lab IPA, Masjid..."
                  value={jadwalForm.room}
                  onChange={(e) => setJadwalForm({ ...jadwalForm, room: e.target.value })}
                />
              </div>
              {jadwalError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {jadwalError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-100">
              <button className="btn-secondary" onClick={() => setShowJadwalModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={saveJadwal} disabled={savingJadwal}>
                {savingJadwal ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Modal Tambah/Edit Mapel === */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">
                {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
              </h2>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nama Mata Pelajaran *</label>
                <input
                  className="input"
                  placeholder="Contoh: Matematika, Fiqih, Bahasa Arab..."
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Kode Mapel</label>
                <input
                  className="input"
                  placeholder="Contoh: MTK, FQH, B.ARAB..."
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Kelas (opsional)</label>
                <select
                  className="input"
                  value={subjectForm.kelas_id}
                  onChange={(e) => setSubjectForm({ ...subjectForm, kelas_id: e.target.value })}
                >
                  <option value="">Semua kelas</option>
                  {kelas.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>
              {subjectError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {subjectError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-100">
              <button className="btn-secondary" onClick={() => setShowSubjectModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={saveSubject} disabled={savingSubject}>
                {savingSubject ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Reusable jadwal card component for grid view ---
function JadwalCard({
  j,
  onEdit,
  onDelete,
  deleting,
}: {
  j: JadwalWithRel
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 hover:border-primary-200 hover:bg-primary-50/40 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary-600">
            {j.start_time} – {j.end_time}
          </p>
          <p className="font-semibold text-sm truncate mt-0.5">
            {j.subjects?.name || <span className="text-neutral-400 italic text-xs">Mapel kosong</span>}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {j.kelas?.name}{j.room ? ` · ${j.room}` : ''}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onEdit}
            className="h-6 w-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center hover:border-primary-300 transition-colors"
            title="Edit"
          >
            <svg className="h-3 w-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="h-6 w-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-colors"
            title="Hapus"
          >
            <svg className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
