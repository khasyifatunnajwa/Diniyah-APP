import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader, EmptyState, LoadingSpinner, StatusBadge } from '../components/ui'
import type { Announcement } from '../types'

type AudienceType = 'all' | 'guru' | 'santri' | 'wali' | 'musyrif'

const AUDIENCE_LABELS: Record<AudienceType, { text: string; class: string }> = {
  all: { text: 'Semua', class: 'bg-primary-100 text-primary-700' },
  guru: { text: 'Guru', class: 'bg-blue-100 text-blue-700' },
  santri: { text: 'Santri', class: 'bg-emerald-100 text-emerald-700' },
  wali: { text: 'Wali Santri', class: 'bg-purple-100 text-purple-700' },
  musyrif: { text: 'Musyrif', class: 'bg-amber-100 text-amber-700' },
}

const CATEGORY_SUGGESTIONS = [
  'Umum', 'Akademik', 'Kegiatan', 'Libur', 'Kesehatan', 'Keuangan', 'Pembinaan',
]

interface FormData {
  title: string
  content: string
  category: string
  audience: AudienceType
}

const EMPTY_FORM: FormData = {
  title: '',
  content: '',
  category: 'Umum',
  audience: 'all',
}

interface AnnouncementWithAuthor extends Announcement {
  author?: { full_name: string } | null
}

export default function AnnouncementsPage() {
  const { profile, pondok } = useAuth()
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<AnnouncementWithAuthor | null>(null)
  const [viewItem, setViewItem] = useState<AnnouncementWithAuthor | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [filterAudience, setFilterAudience] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [customCategory, setCustomCategory] = useState('')

  const pid = pondok?.id

  const load = async () => {
    if (!pid) return
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('*, author:created_by(full_name)')
      .eq('pondok_id', pid)
      .order('created_at', { ascending: false })
    setAnnouncements((data as AnnouncementWithAuthor[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [pid])

  const openAdd = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setCustomCategory('')
    setShowModal(true)
  }

  const openEdit = (a: AnnouncementWithAuthor) => {
    setEditItem(a)
    const isCustom = !CATEGORY_SUGGESTIONS.includes(a.category || '')
    setForm({
      title: a.title,
      content: a.content,
      category: isCustom ? 'custom' : (a.category || 'Umum'),
      audience: a.audience,
    })
    setCustomCategory(isCustom ? (a.category || '') : '')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditItem(null)
    setForm(EMPTY_FORM)
    setCustomCategory('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pid || !profile) return
    setSaving(true)

    const finalCategory = form.category === 'custom' ? customCategory : form.category

    const payload = {
      pondok_id: pid,
      title: form.title,
      content: form.content,
      category: finalCategory || null,
      audience: form.audience,
      created_by: profile.id,
    }

    if (editItem) {
      await supabase.from('announcements').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('announcements').insert(payload)
    }

    setSaving(false)
    closeModal()
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return
    await supabase.from('announcements').delete().eq('id', id)
    load()
  }

  const allCategories = Array.from(new Set(announcements.map(a => a.category).filter(Boolean)))

  const filtered = announcements.filter((a) => {
    const matchAudience = filterAudience === 'all' || a.audience === filterAudience
    const matchCategory = filterCategory === 'all' || a.category === filterCategory
    const matchSearch = searchQuery === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchAudience && matchCategory && matchSearch
  })

  const relativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 7) return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    if (days > 0) return `${days} hari yang lalu`
    if (hours > 0) return `${hours} jam yang lalu`
    if (mins > 0) return `${mins} menit yang lalu`
    return 'Baru saja'
  }

  const audienceIcons: Record<AudienceType, string> = {
    all: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z',
    guru: 'M12 4a4 4 0 100 8 4 4 0 000-8zM6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2',
    santri: 'M12 4.354a4 4 0 110 5.292M15 8H3',
    wali: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    musyrif: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l7-3 7 3z',
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pengumuman"
        subtitle="Informasi dan pengumuman untuk seluruh warga pondok"
        action={
          <button onClick={openAdd} className="btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Buat Pengumuman
          </button>
        }
      />

      {/* Audience quick filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'guru', 'santri', 'wali', 'musyrif'] as AudienceType[]).map(a => (
          <button
            key={a}
            onClick={() => setFilterAudience(a)}
            className={`btn py-2 px-4 text-sm transition-all ${
              filterAudience === a
                ? `bg-primary-600 text-white`
                : 'btn-secondary'
            }`}
          >
            {a === 'all' ? 'Semua' : AUDIENCE_LABELS[a].text}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
              filterAudience === a ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
            }`}>
              {a === 'all' ? announcements.length : announcements.filter(x => x.audience === a).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search + category filter */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="Cari judul atau isi pengumuman..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select className="input sm:max-w-[180px]" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">Semua Kategori</option>
          {allCategories.map(c => (
            <option key={c!} value={c!}>{c}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            title="Belum ada pengumuman"
            desc="Klik tombol Buat Pengumuman untuk membuat pengumuman pertama"
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="card p-5 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setViewItem(a)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${AUDIENCE_LABELS[a.audience].class}`}>
                    {AUDIENCE_LABELS[a.audience].text}
                  </span>
                  {a.category && (
                    <span className="badge bg-neutral-100 text-neutral-600">{a.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(a)} className="btn-secondary py-1.5 px-3 text-xs">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="btn-danger py-1.5 px-3 text-xs">
                    Hapus
                  </button>
                </div>
              </div>

              <h3 className="font-display font-bold text-neutral-900 mb-2 leading-snug">{a.title}</h3>
              <p className="text-sm text-neutral-600 line-clamp-3 leading-relaxed">{a.content}</p>

              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-neutral-100">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(a.author as any)?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-medium text-neutral-700 truncate">
                    {(a.author as any)?.full_name || 'Admin'}
                  </span>
                  <span className="text-xs text-neutral-400 ml-2">{relativeTime(a.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setViewItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${AUDIENCE_LABELS[viewItem.audience].class}`}>
                  {AUDIENCE_LABELS[viewItem.audience].text}
                </span>
                {viewItem.category && (
                  <span className="badge bg-neutral-100 text-neutral-600">{viewItem.category}</span>
                )}
              </div>
              <button onClick={() => setViewItem(null)} className="btn-ghost p-2 rounded-xl">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-display font-bold text-2xl text-neutral-900 mb-4 leading-snug">{viewItem.title}</h2>
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">{viewItem.content}</p>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-neutral-100">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
                  {(viewItem.author as any)?.full_name?.charAt(0) || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-700">{(viewItem.author as any)?.full_name || 'Admin'}</p>
                  <p className="text-xs text-neutral-400">{relativeTime(viewItem.created_at)}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <button onClick={() => { setViewItem(null); openEdit(viewItem) }} className="btn-secondary">
                Edit Pengumuman
              </button>
              <button onClick={() => setViewItem(null)} className="btn-primary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">
                {editItem ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-2 rounded-xl">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Judul *</label>
                <input
                  className="input"
                  required
                  placeholder="Judul pengumuman..."
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Isi Pengumuman *</label>
                <textarea
                  className="input min-h-[160px] resize-y"
                  required
                  placeholder="Tulis isi pengumuman di sini..."
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kategori</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORY_SUGGESTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="custom">Lainnya (isi manual)</option>
                  </select>
                  {form.category === 'custom' && (
                    <input
                      className="input mt-2"
                      placeholder="Tulis kategori..."
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <label className="label">Ditujukan Untuk *</label>
                  <select
                    className="input"
                    required
                    value={form.audience}
                    onChange={e => setForm(f => ({ ...f, audience: e.target.value as AudienceType }))}
                  >
                    {(Object.keys(AUDIENCE_LABELS) as AudienceType[]).map(a => (
                      <option key={a} value={a}>{AUDIENCE_LABELS[a].text}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Audience preview */}
              <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={audienceIcons[form.audience]} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-700">
                      Ditujukan kepada: <span className={`badge ml-1 ${AUDIENCE_LABELS[form.audience].class}`}>{AUDIENCE_LABELS[form.audience].text}</span>
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {form.audience === 'all' && 'Pengumuman akan terlihat oleh semua pengguna'}
                      {form.audience === 'guru' && 'Pengumuman hanya untuk guru dan staff'}
                      {form.audience === 'santri' && 'Pengumuman hanya untuk santri'}
                      {form.audience === 'wali' && 'Pengumuman hanya untuk wali santri'}
                      {form.audience === 'musyrif' && 'Pengumuman hanya untuk musyrif asrama'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Publikasikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
