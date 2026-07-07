import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui'
import type { Kelas, Santri, Subject, Nilai } from '../types'

interface SubjectGrade {
  subject: Subject | null
  tugas: Nilai[]
  uts: Nilai[]
  uas: Nilai[]
  quiz: Nilai[]
  finalAverage: number | null
}

const TYPE_LABELS: Record<string, string> = {
  tugas: 'Tugas',
  uts: 'UTS',
  uas: 'UAS',
  quiz: 'Quiz',
}

function avgOf(nilaiList: Nilai[]): number | null {
  if (nilaiList.length === 0) return null
  // Normalize each score to 0-100 scale
  const normalized = nilaiList.map((n) => {
    if (n.max_score > 0) return (n.score / n.max_score) * 100
    return n.score
  })
  return normalized.reduce((a, b) => a + b, 0) / normalized.length
}

function gradeLetter(score: number): { letter: string; color: string } {
  if (score >= 90) return { letter: 'A', color: 'text-green-600' }
  if (score >= 80) return { letter: 'B', color: 'text-blue-600' }
  if (score >= 70) return { letter: 'C', color: 'text-amber-600' }
  if (score >= 60) return { letter: 'D', color: 'text-orange-600' }
  return { letter: 'E', color: 'text-red-600' }
}

export default function RaporPage() {
  const { pondok } = useAuth()
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [santriList, setSantriList] = useState<Santri[]>([])
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedSantri, setSelectedSantri] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingRapor, setLoadingRapor] = useState(false)

  const [santriInfo, setSantriInfo] = useState<Santri | null>(null)
  const [kelasInfo, setKelasInfo] = useState<Kelas | null>(null)
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([])
  const [academicYear, setAcademicYear] = useState('')

  const pid = pondok?.id

  // Load kelas list on mount
  useEffect(() => {
    if (!pid) return
    const loadInitial = async () => {
      const { data } = await supabase
        .from('kelas')
        .select('*')
        .eq('pondok_id', pid)
        .order('name', { ascending: true })
      setKelasList((data as Kelas[]) || [])
      setLoading(false)
    }
    loadInitial()
  }, [pid])

  // Load santri when kelas is selected
  useEffect(() => {
    if (!pid || !selectedKelas) {
      setSantriList([])
      return
    }
    const loadSantri = async () => {
      const { data } = await supabase
        .from('santri')
        .select('*')
        .eq('pondok_id', pid)
        .eq('kelas_id', selectedKelas)
        .order('full_name', { ascending: true })
      setSantriList((data as Santri[]) || [])
    }
    loadSantri()
  }, [pid, selectedKelas])

  // Load rapor data when santri is selected
  const loadRapor = useCallback(async () => {
    if (!pid || !selectedSantri) {
      setSubjectGrades([])
      setSantriInfo(null)
      setKelasInfo(null)
      return
    }
    setLoadingRapor(true)

    // Fetch santri info
    const { data: santri } = await supabase
      .from('santri')
      .select('*')
      .eq('id', selectedSantri)
      .maybeSingle()
    setSantriInfo(santri as Santri | null)

    // Fetch kelas info
    if (santri?.kelas_id) {
      const { data: kelas } = await supabase
        .from('kelas')
        .select('*')
        .eq('id', santri.kelas_id)
        .maybeSingle()
      setKelasInfo(kelas as Kelas | null)
    }

    // Fetch all subjects for this pondok (optionally filtered by kelas)
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('pondok_id', pid)
      .order('name', { ascending: true })
    const subjectList = (subjects as Subject[]) || []

    // Fetch all nilai for this santri
    const { data: nilaiData } = await supabase
      .from('nilai')
      .select('*')
      .eq('pondok_id', pid)
      .eq('santri_id', selectedSantri)
      .order('date', { ascending: true })
    const allNilai = (nilaiData as Nilai[]) || []

    // Group by subject
    const grouped: SubjectGrade[] = subjectList.map((subject) => {
      const subjectNilai = allNilai.filter((n) => n.subject_id === subject.id)
      const tugas = subjectNilai.filter((n) => n.type === 'tugas')
      const uts = subjectNilai.filter((n) => n.type === 'uts')
      const uas = subjectNilai.filter((n) => n.type === 'uas')
      const quiz = subjectNilai.filter((n) => n.type === 'quiz')

      // Compute final average: tugas avg (30%), uts (30%), uas (40%)
      const tugasAvg = avgOf(tugas)
      const utsAvg = avgOf(uts)
      const uasAvg = avgOf(uas)

      let finalAverage: number | null = null
      const components: number[] = []
      const weights: number[] = []
      if (tugasAvg !== null) { components.push(tugasAvg * 0.3); weights.push(0.3) }
      if (utsAvg !== null) { components.push(utsAvg * 0.3); weights.push(0.3) }
      if (uasAvg !== null) { components.push(uasAvg * 0.4); weights.push(0.4) }

      if (components.length > 0) {
        const totalWeight = weights.reduce((a, b) => a + b, 0)
        finalAverage = components.reduce((a, b) => a + b, 0) / totalWeight
      }

      return { subject, tugas, uts, uas, quiz, finalAverage }
    })

    // Only show subjects that have at least one nilai
    setSubjectGrades(grouped.filter((g) => g.tugas.length > 0 || g.uts.length > 0 || g.uas.length > 0 || g.quiz.length > 0))
    setLoadingRapor(false)
  }, [pid, selectedSantri])

  useEffect(() => {
    loadRapor()
  }, [loadRapor])

  // Set default academic year
  useEffect(() => {
    const now = new Date()
    const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
    setAcademicYear(`${year}/${year + 1}`)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  // Compute overall average
  const subjectsWithFinal = subjectGrades.filter((g) => g.finalAverage !== null)
  const overallAverage =
    subjectsWithFinal.length > 0
      ? subjectsWithFinal.reduce((sum, g) => sum + (g.finalAverage || 0), 0) / subjectsWithFinal.length
      : null

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Rapor Santri"
        subtitle="Cetak rapor dan lihat rekap nilai per santri"
        action={
          selectedSantri && subjectGrades.length > 0 ? (
            <button onClick={handlePrint} className="btn-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h14z" />
              </svg>
              Cetak Rapor
            </button>
          ) : null
        }
      />

      {/* Selectors */}
      <div className={`card p-4 mb-6 ${selectedSantri ? 'print:hidden' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => {
                setSelectedKelas(e.target.value)
                setSelectedSantri('')
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
            <label className="label">Santri</label>
            <select
              value={selectedSantri}
              onChange={(e) => setSelectedSantri(e.target.value)}
              className="input"
              disabled={!selectedKelas}
            >
              <option value="">— Pilih Santri —</option>
              {santriList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}{s.nis ? ` (${s.nis})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* No selection */}
      {!selectedSantri && (
        <div className="card">
          <EmptyState
            icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            title="Pilih Kelas dan Santri"
            desc="Silakan pilih kelas dan santri untuk melihat rapor."
          />
        </div>
      )}

      {/* Loading rapor */}
      {selectedSantri && loadingRapor && <LoadingSpinner />}

      {/* No data */}
      {selectedSantri && !loadingRapor && subjectGrades.length === 0 && (
        <div className="card">
          <EmptyState
            icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            title="Belum ada nilai"
            desc="Santri ini belum memiliki nilai yang diinput. Silakan input nilai terlebih dahulu."
          />
        </div>
      )}

      {/* Rapor */}
      {selectedSantri && !loadingRapor && subjectGrades.length > 0 && santriInfo && (
        <div className="card p-8 print:shadow-none print:border-0" id="rapor-print">
          {/* Header */}
          <div className="text-center mb-6 pb-6 border-b-2 border-neutral-200">
            {pondok?.logo_url && (
              <img src={pondok.logo_url} alt="Logo" className="h-16 w-16 mx-auto mb-2 object-contain" />
            )}
            <h1 className="font-display text-2xl font-bold text-neutral-900">{pondok?.name || 'Pondok Pesantren'}</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {pondok?.address || ''}
            </p>
            <h2 className="font-display text-lg font-semibold text-neutral-800 mt-4">
              RAPOR SANTRI
            </h2>
            <p className="text-sm text-neutral-600">Tahun Pelajaran {academicYear}</p>
          </div>

          {/* Santri info */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
            <div className="flex gap-2">
              <span className="font-semibold text-neutral-700 w-32 shrink-0">Nama Santri</span>
              <span className="text-neutral-500">: {santriInfo.full_name}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-neutral-700 w-32 shrink-0">NIS</span>
              <span className="text-neutral-500">: {santriInfo.nis || '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-neutral-700 w-32 shrink-0">Kelas</span>
              <span className="text-neutral-500">: {kelasInfo?.name || '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-neutral-700 w-32 shrink-0">Jenis Kelamin</span>
              <span className="text-neutral-500">: {santriInfo.gender === 'L' ? 'Laki-laki' : santriInfo.gender === 'P' ? 'Perempuan' : '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-neutral-700 w-32 shrink-0">Tempat Lahir</span>
              <span className="text-neutral-500">: {santriInfo.birth_date ? new Date(santriInfo.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-neutral-700 w-32 shrink-0">Wali</span>
              <span className="text-neutral-500">: {santriInfo.parent_name || '-'}</span>
            </div>
          </div>

          {/* Grades table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-neutral-200">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-3 py-2.5 text-left font-semibold text-neutral-700 border-r border-neutral-200 w-8">No</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-neutral-700 border-r border-neutral-200">Mata Pelajaran</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-neutral-700 border-r border-neutral-200">Tugas</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-neutral-700 border-r border-neutral-200">UTS</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-neutral-700 border-r border-neutral-200">UAS</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-neutral-700 border-r border-neutral-200">Nilai Akhir</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-neutral-700">Predikat</th>
                </tr>
              </thead>
              <tbody>
                {subjectGrades.map((g, idx) => {
                  const tugasAvg = avgOf(g.tugas)
                  const utsAvg = avgOf(g.uts)
                  const uasAvg = avgOf(g.uas)
                  const final = g.finalAverage
                  const grade = final !== null ? gradeLetter(final) : null

                  return (
                    <tr key={g.subject?.id || idx} className="border-b border-neutral-100">
                      <td className="px-3 py-2.5 text-neutral-500 border-r border-neutral-200">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-neutral-900 border-r border-neutral-200">
                        {g.subject?.name || '—'}
                        {g.subject?.code && (
                          <span className="text-xs text-neutral-400 ml-1">({g.subject.code})</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-neutral-600 border-r border-neutral-200">
                        {tugasAvg !== null ? tugasAvg.toFixed(1) : '-'}
                        {g.tugas.length > 1 && (
                          <span className="text-xs text-neutral-400 block">({g.tugas.length}x)</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-neutral-600 border-r border-neutral-200">
                        {utsAvg !== null ? utsAvg.toFixed(1) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-neutral-600 border-r border-neutral-200">
                        {uasAvg !== null ? uasAvg.toFixed(1) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-neutral-900 border-r border-neutral-200">
                        {final !== null ? final.toFixed(1) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {grade ? (
                          <span className={`font-display font-bold text-base ${grade.color}`}>
                            {grade.letter}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50 border-t-2 border-neutral-200">
                  <td colSpan={5} className="px-3 py-3 text-right font-semibold text-neutral-700">
                    Rata-rata Nilai Akhir:
                  </td>
                  <td className="px-3 py-3 text-center font-display font-bold text-lg text-neutral-900">
                    {overallAverage !== null ? overallAverage.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {overallAverage !== null && (
                      <span className={`font-display font-bold ${gradeLetter(overallAverage).color}`}>
                        {gradeLetter(overallAverage).letter}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Grade legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="font-bold text-green-600">A</span> 90-100 (Sangat Baik)</span>
            <span className="flex items-center gap-1.5"><span className="font-bold text-blue-600">B</span> 80-89 (Baik)</span>
            <span className="flex items-center gap-1.5"><span className="font-bold text-amber-600">C</span> 70-79 (Cukup)</span>
            <span className="flex items-center gap-1.5"><span className="font-bold text-orange-600">D</span> 60-69 (Kurang)</span>
            <span className="flex items-center gap-1.5"><span className="font-bold text-red-600">E</span> {'<60 (Sangat Kurang)'}</span>
          </div>

          {/* Signature section */}
          <div className="grid grid-cols-3 gap-4 mt-12 text-center text-sm">
            <div>
              <p className="text-neutral-600 mb-1">Mengetahui,</p>
              <p className="font-semibold text-neutral-700 mb-16">Kepala Madrasah</p>
              <div className="border-t border-neutral-300 pt-1">
                <p className="font-semibold text-neutral-900">(_________________)</p>
              </div>
            </div>
            <div>
              <p className="text-neutral-600 mb-1">Wali Kelas,</p>
              <p className="font-semibold text-neutral-700 mb-16">{kelasInfo?.name || ''}</p>
              <div className="border-t border-neutral-300 pt-1">
                <p className="font-semibold text-neutral-900">(_________________)</p>
              </div>
            </div>
            <div>
              <p className="text-neutral-600 mb-1">Orang Tua / Wali,</p>
              <p className="font-semibold text-neutral-700 mb-16">&nbsp;</p>
              <div className="border-t border-neutral-300 pt-1">
                <p className="font-semibold text-neutral-900">(_________________)</p>
              </div>
            </div>
          </div>

          {/* Print date */}
          <div className="text-right mt-6 text-xs text-neutral-400">
            Dicetak pada {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      )}
    </div>
  )
}
