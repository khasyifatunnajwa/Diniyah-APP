import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner } from '../components/ui'
import type { CustomModule, CustomModuleField } from '../types'

// Preset icons (SVG path strings) for the icon picker
const PRESET_ICONS: { label: string; path: string }[] = [
  { label: 'Document', path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Users', path: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z' },
  { label: 'Book', path: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253' },
  { label: 'Calendar', path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Chart', path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { label: 'Cube', path: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { label: 'Heart', path: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { label: 'Star', path: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { label: 'Bell', path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { label: 'Mail', path: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { label: 'Phone', path: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { label: 'Map Pin', path: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Tag', path: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.998 1.998 0 013 12V7a4 4 0 014-4z' },
  { label: 'Camera', path: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.9l.812-1.2A2 2 0 0110.07 4h3.86a2 2 0 011.664.9l.812 1.2a2 2 0 001.664.9H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Gift', path: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0H5a2 2 0 100-4h2.382a2 2 0 011.789 1.106L12 8zm0 0h7a2 2 0 100-4h-2.382a2 2 0 00-1.789 1.106L12 8z M3 11h18v9a1 1 0 01-1 1H4a1 1 0 01-1-1v-9z' },
  { label: 'Cog', path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Shield', path: 'M9 12l2 2 4-4m5.618-4.016A11.948 11.948 0 0112 2.944a11.948 11.948 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { label: 'Clock', path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Home', path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Briefcase', path: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { label: 'Truck', path: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
  { label: 'Academic', path: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0084.665 6.479 12.07 12.07 0 006.16 10.578L12 14z M12 14v7m-4-3l4 3 4-3' },
  { label: 'Lightning', path: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { label: 'Fire', path: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.24 17 7.343 18.657 7.343 19 10 19 12c0 .5-.09 1.01-.24 1.47a4 4 0 00-1.41-1.47 4 4 0 00-1.41 1.47c.15-.46.24-.97.24-1.47 0-2-1-4-3-5' },
  { label: 'Globe', path: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M3.6 9h16.8M3.6 15h16.8 M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18' },
  { label: 'Database', path: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
  { label: 'Folder', path: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { label: 'Clipboard', path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { label: 'Pencil', path: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { label: 'Key', path: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { label: 'Wallet', path: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { label: 'Shopping', path: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { label: 'Quran', path: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18s-3.332.477-4.5 1.253' },
  { label: 'Mosque', path: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6M9 11h.01M15 11h.01' },
]

const MENU_GROUPS = [
  { value: 'akademik', label: 'Akademik' },
  { value: 'administrasi', label: 'Administrasi' },
  { value: 'pondok', label: 'Pondok' },
  { value: 'custom', label: 'Kustom' },
]

const FIELD_TYPES: { value: CustomModuleField['type']; label: string; icon: string }[] = [
  { value: 'text', label: 'Teks', icon: 'M4 6h16M4 12h16M4 18h7' },
  { value: 'number', label: 'Angka', icon: 'M7 4V2m0 0L3 6m4-4l4 4M17 20v2m0 0l4-4m-4 4l-4-4' },
  { value: 'date', label: 'Tanggal', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { value: 'select', label: 'Pilihan', icon: 'M8 9l4-4 4 4m0 6l-4 4-4-4' },
  { value: 'textarea', label: 'Teks Panjang', icon: 'M4 6h16M4 12h16M4 18h16' },
  { value: 'boolean', label: 'Ya/Tidak', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
]

// Convert a display name to a URL-safe slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '')
}

const emptyField: Omit<CustomModuleField, 'name'> = {
  label: '',
  type: 'text',
  required: false,
  options: [],
}

export default function ModuleBuilderPage() {
  const { pondok } = useAuth()
  const { customModules, refreshModules, loading } = useModules()

  // Form state
  const [moduleName, setModuleName] = useState('')
  const [moduleIcon, setModuleIcon] = useState(PRESET_ICONS[0].path)
  const [menuGroup, setMenuGroup] = useState('custom')
  const [fields, setFields] = useState<CustomModuleField[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ name: string; slug: string } | null>(null)

  // Edit modal state
  const [editingModule, setEditingModule] = useState<CustomModule | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFields, setEditFields] = useState<CustomModuleField[]>([])
  const [editIcon, setEditIcon] = useState('')
  const [editMenuGroup, setEditMenuGroup] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const slug = slugify(moduleName)
  const tableName = slug ? `custom_${slug}` : ''

  // --- Field builder helpers ---
  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        name: `field_${prev.length + 1}`,
        label: '',
        type: 'text',
        required: false,
        options: [],
      },
    ])
  }

  const updateField = (index: number, patch: Partial<CustomModuleField>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  // Auto-generate field name from label
  const updateFieldLabel = (index: number, label: string) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f
        const name = slugify(label) || `field_${i + 1}`
        return { ...f, label, name }
      })
    )
  }

  // --- Create module ---
  const handleCreate = async () => {
    if (!pondok) return
    setError('')

    if (!moduleName.trim()) {
      setError('Nama modul harus diisi')
      return
    }
    if (!slug) {
      setError('Nama modul harus mengandung huruf atau angka')
      return
    }
    if (fields.length === 0) {
      setError('Tambahkan minimal satu field')
      return
    }
    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].label.trim()) {
        setError(`Field #${i + 1}: label harus diisi`)
        return
      }
      if (!fields[i].name.trim()) {
        setError(`Field #${i + 1}: nama field harus diisi`)
        return
      }
      if (fields[i].type === 'select' && (!fields[i].options || fields[i].options?.length === 0)) {
        setError(`Field "${fields[i].label}": pilih tipe Pilihan harus memiliki opsi`)
        return
      }
    }
    // Check slug uniqueness
    const exists = customModules.some((cm) => cm.slug === slug)
    if (exists) {
      setError(`Modul dengan slug "${slug}" sudah ada. Gunakan nama lain.`)
      return
    }

    setSaving(true)
    try {
      // a) Insert into custom_modules
      const { error: cmError } = await supabase.from('custom_modules').insert({
        pondok_id: pondok.id,
        name: moduleName.trim(),
        slug,
        icon: moduleIcon,
        table_name: tableName,
        fields: fields as any,
        menu_group: menuGroup,
        is_enabled: true,
      })
      if (cmError) throw cmError

      // b) Insert into modules registry
      const { error: modError } = await supabase.from('modules').upsert({
        pondok_id: pondok.id,
        slug,
        name: moduleName.trim(),
        description: `Modul kustom: ${moduleName.trim()}`,
        icon: moduleIcon,
        category: menuGroup,
        is_builtin: false,
        is_enabled: true,
        config: { records: [] },
      }, { onConflict: 'pondok_id,slug' })
      if (modError) throw modError

      // c) Refresh context
      await refreshModules()

      setSuccess({ name: moduleName.trim(), slug })
      // Reset form
      setModuleName('')
      setModuleIcon(PRESET_ICONS[0].path)
      setMenuGroup('custom')
      setFields([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat modul')
    } finally {
      setSaving(false)
    }
  }

  // --- Edit module ---
  const openEdit = (cm: CustomModule) => {
    setEditingModule(cm)
    setEditFields(cm.fields.map((f) => ({ ...f, options: f.options || [] })))
    setEditIcon(cm.icon || PRESET_ICONS[0].path)
    setEditMenuGroup(cm.menu_group)
    setEditError('')
    setShowEditModal(true)
  }

  const updateEditField = (index: number, patch: Partial<CustomModuleField>) => {
    setEditFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const updateEditFieldLabel = (index: number, label: string) => {
    setEditFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f
        const name = slugify(label) || `field_${i + 1}`
        return { ...f, label, name }
      })
    )
  }

  const addEditField = () => {
    setEditFields((prev) => [
      ...prev,
      { name: `field_${prev.length + 1}`, label: '', type: 'text', required: false, options: [] },
    ])
  }

  const removeEditField = (index: number) => {
    setEditFields((prev) => prev.filter((_, i) => i !== index))
  }

  const saveEdit = async () => {
    if (!editingModule || !pondok) return
    setEditError('')

    if (editFields.length === 0) {
      setEditError('Minimal harus ada satu field')
      return
    }
    for (let i = 0; i < editFields.length; i++) {
      if (!editFields[i].label.trim()) {
        setEditError(`Field #${i + 1}: label harus diisi`)
        return
      }
      if (editFields[i].type === 'select' && (!editFields[i].options || editFields[i].options?.length === 0)) {
        setEditError(`Field "${editFields[i].label}": tipe Pilihan harus memiliki opsi`)
        return
      }
    }

    setEditSaving(true)
    try {
      const { error } = await supabase
        .from('custom_modules')
        .update({
          fields: editFields as any,
          icon: editIcon,
          menu_group: editMenuGroup,
        })
        .eq('id', editingModule.id)
      if (error) throw error

      // Also update modules registry icon/category
      await supabase
        .from('modules')
        .update({ icon: editIcon, category: editMenuGroup })
        .eq('pondok_id', pondok.id)
        .eq('slug', editingModule.slug)

      await refreshModules()
      setShowEditModal(false)
      setEditingModule(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setEditSaving(false)
    }
  }

  // --- Delete module ---
  const handleDelete = async (cm: CustomModule) => {
    if (!pondok) return
    if (!confirm(`Hapus modul "${cm.name}"? Semua data dalam modul ini akan dihapus permanen.`)) return

    try {
      // Delete from custom_modules
      await supabase.from('custom_modules').delete().eq('id', cm.id)
      // Delete from modules registry
      await supabase.from('modules').delete().eq('pondok_id', pondok.id).eq('slug', cm.slug)
      await refreshModules()
    } catch (err) {
      alert('Gagal menghapus modul: ' + (err instanceof Error ? err.message : ''))
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Module Builder"
        subtitle="Buat modul kustom tanpa coding — definisikan field dan modul siap dipakai"
      />

      {/* Success banner */}
      {success && (
        <div className="card p-5 mb-6 bg-green-50 border-green-200 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">Modul "{success.name}" berhasil dibuat!</h3>
              <p className="text-sm text-green-700 mt-1">
                Modul kini tersedia di sidebar. Anda dapat mengaksesnya kapan saja.
              </p>
              <div className="flex gap-3 mt-3">
                <Link
                  to={`/app/custom/${success.slug}`}
                  className="btn-primary py-2 px-4 text-sm"
                >
                  Buka Modul
                </Link>
                <button
                  onClick={() => setSuccess(null)}
                  className="btn-secondary py-2 px-4 text-sm"
                >
                  Buat Modul Lain
                </button>
              </div>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-600 hover:text-green-800 shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Builder form */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM4 9h16M4 9v8a2 2 0 002 2h12a2 2 0 002-2V9" />
            </svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-neutral-900">Definisi Modul</h2>
            <p className="text-xs text-neutral-500">Isi detail modul dan tambahkan field yang dibutuhkan</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Module meta */}
          <div className="space-y-5">
            <div>
              <label className="label">Nama Modul *</label>
              <input
                className="input"
                placeholder="Contoh: Perpustakaan, Kesehatan, Beasiswa..."
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
              />
              <p className="text-xs text-neutral-400 mt-1.5">
                Nama ini akan tampil di sidebar menu
              </p>
            </div>

            <div>
              <label className="label">Grup Menu</label>
              <select
                className="input"
                value={menuGroup}
                onChange={(e) => setMenuGroup(e.target.value)}
              >
                {MENU_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 mt-1.5">
                Menentukan kategori modul di sidebar
              </p>
            </div>

            <div>
              <label className="label">Nama Tabel (otomatis)</label>
              <input
                className="input bg-neutral-50 text-neutral-500 font-mono text-sm"
                value={tableName || 'custom_<slug>'}
                readOnly
                placeholder="custom_<slug>"
              />
              <p className="text-xs text-neutral-400 mt-1.5">
                Nama tabel referensi. Data disimpan di config modul.
              </p>
            </div>

            <div>
              <label className="label">Ikon Modul</label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 rounded-xl border border-neutral-200 max-h-48 overflow-y-auto">
                {PRESET_ICONS.map((ic) => (
                  <button
                    key={ic.label}
                    type="button"
                    onClick={() => setModuleIcon(ic.path)}
                    title={ic.label}
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${
                      moduleIcon === ic.path
                        ? 'bg-primary-100 ring-2 ring-primary-500 text-primary-600'
                        : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={ic.path} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Fields builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Field / Kolom Modul</label>
              <button
                type="button"
                onClick={addField}
                className="btn-primary py-1.5 px-3 text-xs"
              >
                + Tambah Field
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-neutral-200 p-8 text-center">
                <svg className="h-10 w-10 text-neutral-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <p className="text-sm text-neutral-500 font-medium">Belum ada field</p>
                <p className="text-xs text-neutral-400 mt-1">Klik "Tambah Field" untuk mulai mendefinisikan kolom modul</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div key={index} className="rounded-xl border border-neutral-200 p-4 bg-neutral-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Field #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="h-7 w-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                        title="Hapus field"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs font-medium text-neutral-600 mb-1 block">Label Tampilan *</label>
                        <input
                          className="input text-sm"
                          placeholder="Contoh: Nama Buku"
                          value={field.label}
                          onChange={(e) => updateFieldLabel(index, e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-neutral-600 mb-1 block">Nama Kolom</label>
                        <input
                          className="input text-sm font-mono"
                          placeholder="nama_buku"
                          value={field.name}
                          onChange={(e) => updateField(index, { name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs font-medium text-neutral-600 mb-1 block">Tipe Field</label>
                        <select
                          className="input text-sm"
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value as CustomModuleField['type'] })}
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer select-none pb-2.5">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-neutral-700">Wajib diisi</span>
                        </label>
                      </div>
                    </div>

                    {field.type === 'select' && (
                      <div>
                        <label className="text-xs font-medium text-neutral-600 mb-1 block">
                          Opsi (pisahkan dengan koma) *
                        </label>
                        <input
                          className="input text-sm"
                          placeholder="Contoh: Baik, Rusak, Hilang"
                          value={(field.options || []).join(', ')}
                          onChange={(e) =>
                            updateField(index, {
                              options: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error + actions */}
        {error && (
          <div className="mt-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-neutral-100">
          <button
            type="button"
            onClick={() => {
              setModuleName('')
              setModuleIcon(PRESET_ICONS[0].path)
              setMenuGroup('custom')
              setFields([])
              setError('')
            }}
            className="btn-secondary"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Membuat Modul...' : 'Buat Modul'}
          </button>
        </div>
      </div>

      {/* Existing custom modules */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-neutral-900">Modul Kustom Aktif</h2>
            <p className="text-xs text-neutral-500">{customModules.length} modul telah dibuat</p>
          </div>
        </div>

        {customModules.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM4 9h16M4 9v8a2 2 0 002 2h12a2 2 0 002-2V9"
              title="Belum ada modul kustom"
              desc="Mulai buat modul pertama Anda menggunakan form di atas."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customModules.map((cm) => (
              <div key={cm.id} className="card p-5 flex flex-col animate-fade-in">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-11 w-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={cm.icon || 'M12 4v16m8-8H4'} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-neutral-900 truncate">{cm.name}</h3>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">{cm.slug}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="badge bg-primary-50 text-primary-600 text-xs">{cm.menu_group}</span>
                  <span className="badge bg-neutral-100 text-neutral-600 text-xs">{cm.fields.length} field</span>
                </div>

                {/* Field preview */}
                <div className="space-y-1 mb-4 flex-1">
                  {cm.fields.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-neutral-500">
                      <svg className="h-3.5 w-3.5 text-neutral-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <span className="truncate">{f.label}</span>
                      <span className="text-neutral-300">·</span>
                      <span className="text-neutral-400">{f.type}</span>
                      {f.required && <span className="text-red-400">*</span>}
                    </div>
                  ))}
                  {cm.fields.length > 4 && (
                    <p className="text-xs text-neutral-400 pl-6">+{cm.fields.length - 4} field lainnya</p>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-neutral-100">
                  <Link
                    to={`/app/custom/${cm.slug}`}
                    className="btn-primary py-1.5 px-3 text-xs flex-1 text-center"
                  >
                    Buka
                  </Link>
                  <button
                    onClick={() => openEdit(cm)}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cm)}
                    className="btn-danger py-1.5 px-3 text-xs"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === Edit Modal === */}
      {showEditModal && editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-display font-bold text-lg">Edit Modul</h2>
                <p className="text-xs text-neutral-500 mt-0.5">{editingModule.name} · {editingModule.slug}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Icon picker */}
              <div>
                <label className="label">Ikon Modul</label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-3 rounded-xl border border-neutral-200 max-h-40 overflow-y-auto">
                  {PRESET_ICONS.map((ic) => (
                    <button
                      key={ic.label}
                      type="button"
                      onClick={() => setEditIcon(ic.path)}
                      title={ic.label}
                      className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                        editIcon === ic.path
                          ? 'bg-primary-100 ring-2 ring-primary-500 text-primary-600'
                          : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                      }`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={ic.path} />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu group */}
              <div>
                <label className="label">Grup Menu</label>
                <select
                  className="input"
                  value={editMenuGroup}
                  onChange={(e) => setEditMenuGroup(e.target.value)}
                >
                  {MENU_GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>

              {/* Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">Field / Kolom</label>
                  <button
                    type="button"
                    onClick={addEditField}
                    className="btn-primary py-1.5 px-3 text-xs"
                  >
                    + Tambah Field
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {editFields.map((field, index) => (
                    <div key={index} className="rounded-xl border border-neutral-200 p-4 bg-neutral-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                          Field #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEditField(index)}
                          className="h-7 w-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs font-medium text-neutral-600 mb-1 block">Label *</label>
                          <input
                            className="input text-sm"
                            placeholder="Label tampilan"
                            value={field.label}
                            onChange={(e) => updateEditFieldLabel(index, e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-neutral-600 mb-1 block">Nama Kolom</label>
                          <input
                            className="input text-sm font-mono"
                            placeholder="nama_kolom"
                            value={field.name}
                            onChange={(e) => updateEditField(index, { name: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-neutral-600 mb-1 block">Tipe</label>
                          <select
                            className="input text-sm"
                            value={field.type}
                            onChange={(e) => updateEditField(index, { type: e.target.value as CustomModuleField['type'] })}
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer select-none pb-2.5">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateEditField(index, { required: e.target.checked })}
                              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-neutral-700">Wajib diisi</span>
                          </label>
                        </div>
                      </div>

                      {field.type === 'select' && (
                        <div className="mt-3">
                          <label className="text-xs font-medium text-neutral-600 mb-1 block">Opsi (pisahkan dengan koma)</label>
                          <input
                            className="input text-sm"
                            placeholder="Opsi1, Opsi2, Opsi3"
                            value={(field.options || []).join(', ')}
                            onChange={(e) =>
                              updateEditField(index, {
                                options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {editError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {editError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-100 sticky bottom-0 bg-white">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
