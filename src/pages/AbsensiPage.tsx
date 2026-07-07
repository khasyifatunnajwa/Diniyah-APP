import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner } from '../components/ui'
import type { Kelas, Santri, Absensi } from '../types'

const STATUS_OPTIONS: { value: Absensi['status']; label: string; class: string }[] = [
  { value: 'hadir', label: 'Hadir', class: 'bg-green-500 text-white' },
  { value: 'sakit', label: 'Sakit', class: 'bg-amber-500 text-white' },
  { value: 'izin', label: 'Izin', class: 'bg-blue-500 text-white' },
  { value: 'alpha', label: 'Alpha', class: 'bg-red-500 text-white' },
]

const STATUS_BADGES: Record<string, { text: string; class: string }> = {
  hadir: { text: 'Hadir', class: 'bg-green-50 text-green-600' },
  sakit: { text: 'Sakit', class: 'bg-amber-50 text-amber-600' },
  izin: { text: 'Izin', class: 'bg-blue-50 text-blue-600' },
  alpha: { text: 'Alpha', class: 'bg-red-50 text-red-600' },
}

interface AttendanceRow {
  santri_id: string
  full_name: string
  nis: string | null
  status: Absensi['status']
  notes: string
  existing_id: string | null
}

export default function AbsensiPage() {
  const { pondok, profile } = useAuth()
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [recentRecords, setRecentRecords] = useState<Absensi[]>([])
  const [recentSantriNames, setRecentSantriNames] = useState<Record<string, string>>({})
  const [recentKelasNames, setRecentKelasNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Load kelas list on mount
  useEffect(() => {
    if (!pondok) return
    const loadKelas = async () => {
      const { data } = await supabase
        .from('kelas')
        .select('*')
        .eq('pondok_id', pondok.id)
        .order('name', { ascending: true })
      if (data) setKelasList(data as Kelas[])
      setLoading(false)
    }
    loadKelas()
  }, [pondok])

  // Load roster (santri + existing attendance) when kelas or date changes
  const loadRoster = useCallback(async () => {
    if (!pondok || !selectedKelas || !selectedDate) return
    setLoadingRoster(true)
    setError(null)
    setSaveMsg(null)

    // Fetch all active students in this kelas
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
    setSantriList(santri)

    // Load existing absensi records for this kelas+date
    const { data: existing, error: existingErr } = await supabase
      .from('absensi')
      .select('*')
      .eq('pondok_id', pondok.id)
      .eq('kelas_id', selectedKelas)
      .eq('date', selectedDate)
    if (existingErr) {
      setError(existingErr.message)
      setLoadingRoster(false)
      return
    }
    const existingRecords = (existing || []) as Absensi[]

    // Build rows by merging santri with existing attendance
    const newRows: AttendanceRow[] = santri.map((s) => {
      const rec = existingRecords.find((r) => r.santri_id === s.id)
      return {
        santri_id: s.id,
        full_name: s.full_name,
        nis: s.nis,
        status: rec?.status || 'hadir',
        notes: rec?.notes || '',
        existing_id: rec?.id || null,
      }
    })
    setRows(newRows)
    setLoadingRoster(false)
  }, [pondok, selectedKelas, selectedDate])

  // Load recent attendance records
  const loadRecent = useCallback(async () => {
    if (!pondok) return
    const { data } = await supabase
      .from('absensi')
      .select('*')
      .eq('pondok_id', pondok.id)
      .order('date', { ascending: false })
      .limit(50)
    if (data) {
      const records = data as Absensi[]
      setRecentRecords(records)
      // Fetch related santri names
      const santriIds = [...new Set(records.map((r) => r.santri_id))]
      const kelasIds = [...new Set(records.map((r) => r.kelas_id).filter(Boolean) as string[])]
      const [santriRes, kelasRes] = await Promise.all([
        supabase.from('santri').select('id, full_name').in('id', santriIds),
        supabase.from('kelas').select('id, name').in('id', kelasIds),
      ])
      const nameMap: Record<string, string> = {}
      ;(santriRes.data || []).forEach((s: { id: string; full_name: string }) => {
        nameMap[s.id] = s.full_name
      })
      const kelasMap: Record<string, string> = {}
      ;(kelasRes.data || []).forEach((k: { id: string; name: string }) => {
        kelasMap[k.id] = k.name
      })
      setRecentSantriNames(nameMap)
      setRecentKelasNames(kelasMap)
    }
  }, [pondok])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  const setStatus = (santriId: string, status: Absensi['status']) => {
    setRows((prev) => prev.map((r) => (r.santri_id === santriId ? { ...r, status } : r)))
  }

  const setNotes = (santriId: string, notes: string) => {
    setRows((prev) => prev.map((r) => (r.santri_id === santriId ? { ...r, notes } : r)))
  }

  // Set all students to a given status (quick action)
  const setAllStatus = (status: Absensi['status']) => {
    setRows((prev) => prev.map((r) => ({ ...r, status })))
  }

  const handleSave = async () => {
    if (!pondok || !profile || rows.length === 0) return
    setSaving(true)
    setError(null)
    setSaveMsg(null)

    // Build upsert payload - insert new records + update existing ones
    const toInsert: Omit<Absensi, 'id' | 'created_at'>[] = []
    const toUpdate: { id: string; payload: Partial<Absensi> }[] = []

    for (const row of rows) {
      const payload = {
        pondok_id: pondok.id,
        kelas_id: selectedKelas,
        subject_id: null,
        santri_id: row.santri_id,
        date: selectedDate,
        status: row.status,
        notes: row.notes || null,
        recorded_by: profile.id,
      }
      if (row.existing_id) {
        toUpdate.push({ id: row.existing_id, payload })
      } else {
        toInsert.push(payload)
      }
    }

    // Process inserts
    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('absensi').insert(toInsert)
      if (insErr) {
        setError(insErr.message)
        setSaving(false)
        return
      }
    }

    // Process updates
    for (const upd of toUpdate) {
      const { error: updErr } = await supabase
        .from('absensi')
        .update(upd.payload)
        .eq('id', upd.id)
      if (updErr) {
        setError(updErr.message)
        setSaving(false)
        return
      }
    }

    setSaveMsg(`Berhasil menyimpan absensi untuk ${rows.length} santri.`)
    setSaving(false)
    await loadRecent()
    await loadRoster()
  }

  // Compute summary
  const summary = rows.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Absensi"
        subtitle="Catat kehadiran santi per kelas"
        action={null}
      />

      {/* Selector */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Pilih Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
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
            <label className="label">Tanggal</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Loading roster */}
      {loadingRoster && <LoadingSpinner />}

      {/* No kelas selected */}
      {!loadingRoster && !selectedKelas && (
        <div className="card">
          <EmptyState
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            title="Pilih Kelas dan Tanggal"
            desc="Silakan pilih kelas dan tanggal untuk mulai menginput absensi santri."
          />
        </div>
      )}

      {/* Roster */}
      {!loadingRoster && selectedKelas && rows.length === 0 && (
        <div className="card">
          <EmptyState
            icon="M12 4.354a4 4 0 110 5.292M15 8H3m6 0a4 4 0 014 4v3a4 4 0 01-4 4H3"
            title="Tidak ada santri di kelas ini"
            desc="Belum ada santri yang terdaftar di kelas ini. Tambahkan santri dan assign kelas terlebih dahulu."
          />
        </div>
      )}

      {!loadingRoster && selectedKelas && rows.length > 0 && (
        <>
          {/* Summary + quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {STATUS_OPTIONS.map((opt) => (
              <div key={opt.value} className="card p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-neutral-500">{opt.label}</div>
                  <div className="font-display text-2xl font-bold">{summary[opt.value] || 0}</div>
                </div>
                <div className={`h-9 w-9 rounded-lg ${opt.class} flex items-center justify-center`}>
                  <span className="text-xs font-bold">{opt.label.charAt(0)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
              <h2 className="font-display font-bold text-sm">Daftar Kehadiran ({rows.length} santri)</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 hidden sm:inline">Set semua:</span>
                <button onClick={() => setAllStatus('hadir')} className="badge bg-green-50 text-green-600 hover:bg-green-100 transition-colors cursor-pointer">
                  Hadir
                </button>
                <button onClick={() => setAllStatus('alpha')} className="badge bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer">
                  Alpha
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {rows.map((row) => (
                    <tr key={row.santri_id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{row.full_name}</div>
                        {row.nis && <div className="text-xs text-neutral-400 font-mono">{row.nis}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setStatus(row.santri_id, opt.value)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                row.status === opt.value
                                  ? `${opt.class} shadow-sm`
                                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => setNotes(row.santri_id, e.target.value)}
                          className="input text-xs py-1.5"
                          placeholder="Keterangan (opsional)"
                        />
                      </td>
                    </tr>
                  ))}
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
                {saving ? 'Menyimpan...' : 'Simpan Absensi'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Recent Records */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
          <h2 className="font-display font-bold text-sm">Riwayat Absensi Terbaru</h2>
        </div>
        {recentRecords.length === 0 ? (
          <EmptyState
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            title="Belum ada riwayat absensi"
            desc="Riwayat absensi yang telah diinput akan muncul di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Santri</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Keterangan</th>
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
                      {r.kelas_id ? (recentKelasNames[r.kelas_id] || '—') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGES[r.status]?.class || 'bg-neutral-100 text-neutral-600'}`}>
                        {STATUS_BADGES[r.status]?.text || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">{r.notes || '-'}</td>
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
