import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner } from '../components/ui'
import type { CustomModule, CustomModuleField } from '../types'

// A single record is a dynamic key-value map
type DataRecord = { _id: string; [key: string]: any }

const FIELD_TYPE_LABELS: Record<CustomModuleField['type'], string> = {
  text: 'Teks',
  number: 'Angka',
  date: 'Tanggal',
  select: 'Pilihan',
  textarea: 'Teks Panjang',
  boolean: 'Ya/Tidak',
}

// Generate a unique ID for in-memory records
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

// Build an empty record from field definitions
function emptyRecord(fields: CustomModuleField[]): DataRecord {
  const rec: DataRecord = { _id: genId() }
  for (const f of fields) {
    if (f.type === 'boolean') rec[f.name] = false
    else if (f.type === 'number') rec[f.name] = ''
    else rec[f.name] = ''
  }
  return rec
}

// Format a cell value for display in the table
function formatValue(value: any, type: CustomModuleField['type']): string {
  if (value === null || value === undefined || value === '') return '—'
  if (type === 'boolean') return value ? 'Ya' : 'Tidak'
  if (type === 'date') {
    try {
      return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export default function CustomModulePage() {
  const { slug } = useParams<{ slug: string }>()
  const { pondok } = useAuth()
  const { customModules, loading: modulesLoading, refreshModules } = useModules()

  const [records, setRecords] = useState<DataRecord[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DataRecord | null>(null)
  const [formData, setFormData] = useState<DataRecord>({ _id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // Find the custom module definition by slug
  const moduleDef = useMemo(
    () => customModules.find((cm) => cm.slug === slug) || null,
    [customModules, slug]
  )

  // Load records from the modules table config field
  const loadRecords = async () => {
    if (!pondok || !slug) return
    setLoadingData(true)
    const { data } = await supabase
      .from('modules')
      .select('config')
      .eq('pondok_id', pondok.id)
      .eq('slug', slug)
      .maybeSingle()
    const config = (data as any)?.config
    if (config && Array.isArray(config.records)) {
      setRecords(config.records as DataRecord[])
    } else {
      setRecords([])
    }
    setLoadingData(false)
  }

  useEffect(() => {
    if (moduleDef) {
      loadRecords()
    } else if (!modulesLoading) {
      setLoadingData(false)
    }
  }, [moduleDef, pondok, slug, modulesLoading])

  // Save records back to the modules table config field
  const persistRecords = async (newRecords: DataRecord[]) => {
    if (!pondok || !slug) return
    setRecords(newRecords)
    await supabase
      .from('modules')
      .update({ config: { records: newRecords } })
      .eq('pondok_id', pondok.id)
      .eq('slug', slug)
  }

  // --- CRUD ---
  const openAdd = () => {
    if (!moduleDef) return
    setEditingRecord(null)
    setFormData(emptyRecord(moduleDef.fields))
    setError('')
    setShowModal(true)
  }

  const openEdit = (record: DataRecord) => {
    if (!moduleDef) return
    setEditingRecord(record)
    // Clone the record so editing doesn't mutate state directly
    setFormData({ ...record })
    setError('')
    setShowModal(true)
  }

  const validate = (): boolean => {
    if (!moduleDef) return false
    for (const f of moduleDef.fields) {
      if (f.required) {
        const val = formData[f.name]
        if (val === '' || val === null || val === undefined) {
          setError(`Field "${f.label}" wajib diisi`)
          return false
        }
      }
    }
    return true
  }

  const save = async () => {
    if (!moduleDef || !pondok) return
    setError('')
    if (!validate()) return

    setSaving(true)
    try {
      if (editingRecord) {
        // Update existing record
        const updated = records.map((r) =>
          r._id === editingRecord._id ? { ...formData } : r
        )
        await persistRecords(updated)
      } else {
        // Add new record
        const newRecord = { ...formData, _id: genId() }
        await persistRecords([...records, newRecord])
      }
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (record: DataRecord) => {
    if (!confirm('Hapus data ini?')) return
    const updated = records.filter((r) => r._id !== record._id)
    await persistRecords(updated)
  }

  // --- Filtered records ---
  const filtered = useMemo(() => {
    if (!search) return records
    const q = search.toLowerCase()
    return records.filter((r) =>
      Object.entries(r).some(([key, val]) => {
        if (key === '_id') return false
        return String(val || '').toLowerCase().includes(q)
      })
    )
  }, [records, search])

  // --- Loading & not found states ---
  if (modulesLoading || loadingData) return <LoadingSpinner />

  if (!moduleDef) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Modul Tidak Ditemukan" />
        <div className="card">
          <EmptyState
            icon="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            title="Modul tidak ditemukan"
            desc="Modul yang Anda cari mungkin telah dihapus atau belum dibuat."
          />
          <div className="text-center pb-6">
            <Link to="/app/module-builder" className="btn-primary">
              Buka Module Builder
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Determine which fields to show in the table (limit to first 5 for readability)
  const tableFields = moduleDef.fields.slice(0, 5)
  const hasMoreFields = moduleDef.fields.length > 5

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={moduleDef.name}
        subtitle={`${moduleDef.fields.length} field · ${records.length} data tersimpan`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            + Tambah Data
          </button>
        }
      />

      {/* Module info bar */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={moduleDef.icon || 'M12 4v16m8-8H4'} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-primary-50 text-primary-600">{moduleDef.menu_group}</span>
            <span className="text-xs text-neutral-400 font-mono">{moduleDef.table_name}</span>
          </div>
        </div>
        <Link
          to="/app/module-builder"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1.5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Definisi
        </Link>
      </div>

      {/* Search */}
      {records.length > 0 && (
        <div className="relative mb-5">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-10"
            placeholder="Cari data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Table */}
      {records.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={moduleDef.icon || 'M12 4v16m8-8H4'}
            title="Belum ada data"
            desc={`Klik "Tambah Data" untuk mulai mengisi modul ${moduleDef.name}.`}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            title="Tidak ditemukan"
            desc="Coba ubah kata kunci pencarian."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3.5 font-semibold text-neutral-600 w-12">#</th>
                  {tableFields.map((f) => (
                    <th key={f.name} className="px-5 py-3.5 font-semibold text-neutral-600">
                      {f.label}
                      {f.required && <span className="text-red-400 ml-0.5">*</span>}
                    </th>
                  ))}
                  {hasMoreFields && (
                    <th className="px-5 py-3.5 font-semibold text-neutral-600 text-xs text-neutral-400">
                      +{moduleDef.fields.length - 5} field
                    </th>
                  )}
                  <th className="px-5 py-3.5 font-semibold text-neutral-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((record, idx) => (
                  <tr key={record._id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5 text-neutral-400">{idx + 1}</td>
                    {tableFields.map((f) => (
                      <td key={f.name} className="px-5 py-3.5">
                        {f.type === 'boolean' ? (
                          <span className={`badge ${record[f.name] ? 'bg-green-50 text-green-600' : 'bg-neutral-100 text-neutral-500'}`}>
                            {formatValue(record[f.name], f.type)}
                          </span>
                        ) : f.type === 'textarea' ? (
                          <p className="text-neutral-600 line-clamp-2 max-w-xs">{formatValue(record[f.name], f.type)}</p>
                        ) : (
                          <span className="text-neutral-700">{formatValue(record[f.name], f.type)}</span>
                        )}
                      </td>
                    ))}
                    {hasMoreFields && <td className="px-5 py-3.5" />}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(record)}
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(record)}
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
        </div>
      )}

      {/* === Add/Edit Modal === */}
      {showModal && moduleDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={moduleDef.icon || 'M12 4v16m8-8H4'} />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg">
                    {editingRecord ? 'Edit Data' : 'Tambah Data'}
                  </h2>
                  <p className="text-xs text-neutral-500">{moduleDef.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {moduleDef.fields.map((field) => (
                <div key={field.name}>
                  <label className="label">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    <span className="ml-2 text-xs font-normal text-neutral-400">({FIELD_TYPE_LABELS[field.type]})</span>
                  </label>

                  {field.type === 'text' && (
                    <input
                      className="input"
                      placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                      value={formData[field.name] ?? ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      className="input"
                      placeholder="0"
                      value={formData[field.name] ?? ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  )}

                  {field.type === 'date' && (
                    <input
                      type="date"
                      className="input"
                      value={formData[field.name] ?? ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      className="input"
                      value={formData[field.name] ?? ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    >
                      <option value="">Pilih {field.label.toLowerCase()}...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      className="input min-h-[80px] resize-y"
                      placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                      value={formData[field.name] ?? ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    />
                  )}

                  {field.type === 'boolean' && (
                    <label className="flex items-center gap-3 cursor-pointer select-none py-2">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData[field.name] === true}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 rounded-full peer-checked:bg-primary-500 transition-colors" />
                        <div className="absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
                      </div>
                      <span className="text-sm text-neutral-700">
                        {formData[field.name] ? 'Ya' : 'Tidak'}
                      </span>
                    </label>
                  )}
                </div>
              ))}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-100 sticky bottom-0 bg-white">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Menyimpan...' : editingRecord ? 'Simpan Perubahan' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
