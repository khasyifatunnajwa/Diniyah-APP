import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner } from '../components/ui'
import type { Kelas, Santri, Subject, Nilai } from '../types'

const TYPE_OPTIONS: { value: Nilai['type']; label: string }[] = [
  { value: 'tugas', label: 'Tugas' },
  { value: 'uts', label: 'UTS' },
  { value: 'uas', label: 'UAS' },
  { value: 'quiz', label: 'Quiz' },
]

const TYPE_LABELS: Record<string, string> = {
  tugas: 'Tugas',
  uts: 'UTS',
  uas: 'UAS',
  quiz: 'Quiz',
}

interface GradeRow {
  santri_id: string
  full_name: string
  nis: string | null
  score: string
  existing_id: string | null
}

export default function NilaiPage() {
  const { pondok, profile } = useAuth()
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [subjectList, setSubjectList] = useState<Subject[]>([])
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedType, setSelectedType] = useState<Nilai['type']>('tugas')
  const [maxScore, setMaxScore] = useState('100')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<GradeRow[]>([])
  const [recentRecords, setRecentRecords] = useState<Nilai[]>([])
  const [recentSantriNames, setRecentSantriNames] = useState<Record<string, string>>({})
  const [recentSubjectNames, setRecentSubjectNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Load kelas and subjects on mount
  useEffect(() => {
    if (!pondok) return
    const loadInitial = async () => {
      const [kelasRes, subjectRes] = await Promise.all([
        supabase.from('kelas').select('*').eq('pondok_id', pondok.id).order('name', { ascending: true }),
        supabase.from('subjects').select('*').eq('pondok_id', pondok.id).order('name', { ascending: true }),
      ])
      if (kelasRes.data) setKelasList(kelasRes.data as Kelas[])
      if (subjectRes.data) setSubjectList(subjectRes.data as Subject[])
      setLoading(false)
    }
    loadInitial()
  }, [pondok])

  // Filter subjects by selected kelas (or subjects with no kelas_id)
  const availableSubjects = subjectList.filter((s) => {
    if (!selectedKelas) return true
    return s.kelas_id === selectedKelas || s.kelas_id === null
  })

  // Load roster when kelas/subject/type/date changes
  const loadRoster = useCallback(async () => {
    if (!pondok || !selectedKelas || !selectedSubject) return
    setLoadingRoster(true)
    setError(null)
    setSaveMsg(null)

    // Fetch all students in this kelas
    const { data: santriData, error: santriErr } = await supabase
      .from('santri')
      .select('*')
      .eq('pondok_id', pondok.id)
      .eq('kelas_id', selectedKelas)
      .order('full_name', { ascending: true })
    if (santriErr) {
      setError(santriErr.message)
      setLoadingRoster(false)
      return
    }
    const santri = (santriData || []) as Santri[]

    // Fetch existing nilai records for this kelas+subject+type+date
    const { data: existing, error: existingErr } = await supabase
      .from('nilai')
      .select('*')
      .eq('pondok_id', pondok.id)
      .eq('kelas_id', selectedKelas)
      .eq('subject_id', selectedSubject)
      .eq('type', selectedType)
      .eq('date', selectedDate)
    if (existingErr) {
      setError(existingErr.message)
      setLoadingRoster(false)
      return
    }
    const existingRecords = (existing || []) as Nilai[]

    // Build rows
    const newRows: GradeRow[] = santri.map((s) => {
      const rec = existingRecords.find((r) => r.santri_id === s.id)
      return {
        santri_id: s.id,
        full_name: s.full_name,
        nis: s.nis,
        score: rec ? String(rec.score) : '',
        existing_id: rec?.id || null,
      }
    })
    setRows(newRows)

    // Update maxScore from existing record if available
    if (existingRecords.length > 0 && existingRecords[0].max_score) {
      setMaxScore(String(existingRecords[0].max_score))
    }

    setLoadingRoster(false)
  }, [pondok, selectedKelas, selectedSubject, selectedType, selectedDate])

  // Load recent records
  const loadRecent = useCallback(async () => {
    if (!pondok) return
    const { data } = await supabase
      .from('nilai')
      .select('*')
      .eq('pondok_id', pondok.id)
      .order('date', { ascending: false })
      .limit(50)
    if (data) {
      const records = data as Nilai[]
      setRecentRecords(records)
      const santriIds = [...new Set(records.map((r) => r.santri_id))]
      const subjectIds = [...new Set(records.map((r) => r.subject_id).filter(Boolean) as string[])]
      const [santriRes, subjectRes] = await Promise.all([
        supabase.from('santri').select('id, full_name').in('id', santriIds),
        supabase.from('subjects').select('id, name').in('id', subjectIds),
      ])
      const nameMap: Record<string, string> = {}
      ;(santriRes.data || []).forEach((s: { id: string; full_name: string }) => {
        nameMap[s.id] = s.full_name
      })
      const subjMap: Record<string, string> = {}
      ;(subjectRes.data || []).forEach((s: { id: string; name: string }) => {
        subjMap[s.id] = s.name
      })
      setRecentSantriNames(nameMap)
      setRecentSubjectNames(subjMap)
    }
  }, [pondok])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  const setScore = (santriId: string, score: string) => {
    setRows((prev) => prev.map((r) => (r.santri_id === santriId ? { ...r, score } : r)))
  }

  const handleSave = async () => {
    if (!pondok || !profile || rows.length === 0) return
    const maxScoreNum = parseFloat(maxScore) || 100
    if (maxScoreNum <= 0) {
      setError('Nilai maksimal harus lebih dari 0')
      return
    }
    setSaving(true)
    setError(null)
    setSaveMsg(null)

    const toInsert: Omit<Nilai, 'id' | 'created_at'>[] = []
    const toUpdate: { id: string; payload: Partial<Nilai> }[] = []

    for (const row of rows) {
      const scoreNum = parseFloat(row.score)
      if (isNaN(scoreNum)) continue // skip empty scores
      if (scoreNum < 0 || scoreNum > maxScoreNum) {
        setError(`Nilai untuk ${row.full_name} (${scoreNum}) di luar rentang 0-${maxScoreNum}`)
        setSaving(false)
        return
      }
      const payload = {
        pondok_id: pondok.id,
        santri_id: row.santri_id,
        subject_id: selectedSubject,
        kelas_id: selectedKelas,
        type: selectedType,
        score: scoreNum,
        max_score: maxScoreNum,
        date: selectedDate,
        recorded_by: profile.id,
      }
      if (row.existing_id) {
        toUpdate.push({ id: row.existing_id, payload })
      } else {
        toInsert.push(payload)
      }
    }

    if (toInsert.length === 0 && toUpdate.length === 0) {
      setError('Tidak ada nilai yang diisi. Silakan masukkan nilai terlebih dahulu.')
      setSaving(false)
      return
    }

    // Process inserts
    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('nilai').insert(toInsert)
      if (insErr) {
        setError(insErr.message)
        setSaving(false)
        return
      }
    }

    // Process updates
    for (const upd of toUpdate) {
      const { error: updErr } = await supabase
        .from('nilai')
        .update(upd.payload)
        .eq('id', upd.id)
      if (updErr) {
        setError(updErr.message)
        setSaving(false)
        return
      }
    }

    const totalSaved = toInsert.length + toUpdate.length
    setSaveMsg(`Berhasil menyimpan ${totalSaved} nilai.`)
    setSaving(false)
    await loadRecent()
    await loadRoster()
  }

  // Compute stats
  const filledRows = rows.filter((r) => r.score !== '' && !isNaN(parseFloat(r.score)))
  const avgScore = filledRows.length > 0
    ? (filledRows.reduce((sum, r) => sum + parseFloat(r.score), 0) / filledRows.length).toFixed(1)
    : '0'
  const highestScore = filledRows.length > 0
    ? Math.max(...filledRows.map((r) => parseFloat(r.score)))
    : 0
  const lowestScore = filledRows.length > 0
    ? Math.min(...filledRows.map((r) => parseFloat(r.score)))
    : 0

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Input Nilai"
        subtitle="Input nilai santri per kelas dan mata pelajaran"
        action={null}
      />

      {/* Selectors */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => {
                setSelectedKelas(e.target.value)
                setSelectedSubject('')
              }}
              className="input"
            >
              <option value="">— Pilih Kelas —</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}{k.level ? ` (${k.level})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Mata Pelajaran</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="input"
              disabled={!selectedKelas}
            >
              <option value="">— Pilih Mapel —</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.code ? ` (${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Jenis Penilaian</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as Nilai['type'])}
              className="input"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tanggal</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Nilai Maksimal</label>
          <input
            type="number"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            className="input w-32"
            min="1"
          />
        </div>
      </div>

      {/* Loading roster */}
      {loadingRoster && <LoadingSpinner />}

      {/* No selection */}
      {!loadingRoster && (!selectedKelas || !selectedSubject) && (
        <div className="card">
          <EmptyState
            icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            title="Pilih Kelas dan Mata Pelajaran"
            desc="Silakan pilih kelas dan mata pelajaran untuk mulai menginput nilai santri."
          />
        </div>
      )}

      {/* No santri */}
      {!loadingRoster && selectedKelas && selectedSubject && rows.length === 0 && (
        <div className="card">
          <EmptyState
            icon="M12 4.354a4 4 0 110 5.292M15 8H3m6 0a4 4 0 014 4v3a4 4 0 01-4 4H3"
            title="Tidak ada santri di kelas ini"
            desc="Belum ada santri yang terdaftar di kelas ini. Tambahkan santri dan assign kelas terlebih dahulu."
          />
        </div>
      )}

      {/* Grade input table */}
      {!loadingRoster && selectedKelas && selectedSubject && rows.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="card p-3">
              <div className="text-xs text-neutral-500">Terisi</div>
              <div className="font-display text-2xl font-bold">{filledRows.length}<span className="text-sm text-neutral-400">/{rows.length}</span></div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-neutral-500">Rata-rata</div>
              <div className="font-display text-2xl font-bold">{avgScore}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-neutral-500">Tertinggi</div>
              <div className="font-display text-2xl font-bold text-green-600">{highestScore}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-neutral-500">Terendah</div>
              <div className="font-display text-2xl font-bold text-red-600">{lowestScore}</div>
            </div>
          </div>

          <div className="card overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
              <h2 className="font-display font-bold text-sm">
                Input Nilai — {TYPE_LABELS[selectedType]} (Max: {maxScore})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="px-4 py-3 w-12">No.</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3 w-40">Nilai</th>
                    <th className="px-4 py-3 w-32">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {rows.map((row, idx) => {
                    const scoreNum = parseFloat(row.score)
                    const maxNum = parseFloat(maxScore) || 100
                    const percentage = !isNaN(scoreNum) && maxNum > 0 ? (scoreNum / maxNum * 100).toFixed(0) : '0'
                    return (
                      <tr key={row.santri_id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-4 py-3 text-neutral-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-neutral-900">{row.full_name}</div>
                          {row.nis && <div className="text-xs text-neutral-400 font-mono">{row.nis}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={row.score}
                            onChange={(e) => setScore(row.santri_id, e.target.value)}
                            className="input py-1.5"
                            placeholder="0"
                            min="0"
                            max={maxScore}
                            step="0.1"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  parseFloat(percentage) >= 75 ? 'bg-green-500' : parseFloat(percentage) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-neutral-500 font-medium w-10 text-right">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-neutral-100 bg-neutral-50/50">
              {saveMsg && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs text-green-600">
                  {saveMsg}
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-600">
                  {error}
                </div>
              )}
              <div className="flex-1" />
              <button
                onClick={handleSave}
                disabled={saving || loadingRoster}
                className="btn-primary"
              >
                {saving ? 'Menyimpan...' : 'Simpan Nilai'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Recent Records */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
          <h2 className="font-display font-bold text-sm">Riwayat Nilai Terbaru</h2>
        </div>
        {recentRecords.length === 0 ? (
          <EmptyState
            icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            title="Belum ada riwayat nilai"
            desc="Riwayat nilai yang telah diinput akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Santri</th>
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {recentRecords.slice(0, 20).map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3 text-neutral-600">{r.date}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {recentSantriNames[r.santri_id] || '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {r.subject_id ? (recentSubjectNames[r.subject_id] || '—') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-primary-50 text-primary-600">
                        {TYPE_LABELS[r.type] || r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-neutral-900">{r.score}</span>
                      <span className="text-neutral-400 text-xs">/{r.max_score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
