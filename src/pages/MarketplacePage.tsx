import { useState, useMemo } from 'react'
import { useModules } from '../context/ModuleContext'
import { PageHeader, LoadingSpinner, EmptyState } from '../components/ui'

const CATEGORIES = [
  { value: 'all', label: 'Semua' },
  { value: 'akademik', label: 'Akademik' },
  { value: 'administrasi', label: 'Administrasi' },
  { value: 'pondok', label: 'Pondok' },
  { value: 'umum', label: 'Umum' },
]

const CATEGORY_BADGE: Record<string, string> = {
  akademik: 'bg-blue-50 text-blue-600',
  administrasi: 'bg-amber-50 text-amber-600',
  pondok: 'bg-emerald-50 text-emerald-600',
  umum: 'bg-purple-50 text-purple-600',
}

const CATEGORY_LABEL: Record<string, string> = {
  akademik: 'Akademik',
  administrasi: 'Administrasi',
  pondok: 'Pondok',
  umum: 'Umum',
}

// Featured modules for the "App Store" section
const FEATURED_SLUGS = ['santri', 'finance', 'tahfidz', 'asrama', 'nilai', 'perizinan']

export default function MarketplacePage() {
  const { builtinModules, modules, installModule, uninstallModule, toggleModule, loading } = useModules()
  const [filter, setFilter] = useState('all')
  const [busySlug, setBusySlug] = useState<string | null>(null)

  const installedMap = useMemo(() => {
    const map = new Map<string, { installed: boolean; enabled: boolean }>()
    for (const m of modules) {
      map.set(m.slug, { installed: true, enabled: m.is_enabled })
    }
    return map
  }, [modules])

  const featured = useMemo(
    () => builtinModules.filter((m) => FEATURED_SLUGS.includes(m.slug)),
    [builtinModules]
  )

  const filtered = useMemo(
    () => (filter === 'all' ? builtinModules : builtinModules.filter((m) => m.category === filter)),
    [builtinModules, filter]
  )

  const handleInstall = async (slug: string) => {
    setBusySlug(slug)
    try {
      await installModule(slug)
    } finally {
      setBusySlug(null)
    }
  }

  const handleUninstall = async (slug: string) => {
    if (!confirm('Copot modul ini? Data terkait modul tidak akan dihapus.')) return
    setBusySlug(slug)
    try {
      await uninstallModule(slug)
    } finally {
      setBusySlug(null)
    }
  }

  const handleToggle = async (slug: string, enabled: boolean) => {
    setBusySlug(slug)
    try {
      await toggleModule(slug, enabled)
    } finally {
      setBusySlug(null)
    }
  }

  if (loading) return <LoadingSpinner />

  const ModuleCard = ({ meta, featured = false }: { meta: typeof builtinModules[0]; featured?: boolean }) => {
    const state = installedMap.get(meta.slug)
    const isInstalled = !!state?.installed
    const isEnabled = state?.enabled ?? false
    const isBusy = busySlug === meta.slug

    return (
      <div
        className={`card p-5 flex flex-col hover:shadow-md transition-all animate-fade-in ${
          featured ? 'ring-1 ring-primary-100' : ''
        }`}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--theme-primary, #1d7556)' + '15' }}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              style={{ color: 'var(--theme-primary, #1d7556)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-neutral-900 leading-tight">{meta.name}</h3>
            <span className={`badge mt-1 ${CATEGORY_BADGE[meta.category] || 'bg-neutral-100 text-neutral-600'}`}>
              {CATEGORY_LABEL[meta.category] || meta.category}
            </span>
          </div>
          {isInstalled && (
            <span className="badge bg-green-50 text-green-600 shrink-0">✓ Terpasang</span>
          )}
        </div>

        <p className="text-sm text-neutral-500 leading-relaxed flex-1">{meta.description}</p>

        <div className="mt-4 pt-4 border-t border-neutral-100">
          {!isInstalled ? (
            <button
              onClick={() => handleInstall(meta.slug)}
              disabled={isBusy}
              className="btn-primary w-full"
            >
              {isBusy ? 'Memasang...' : 'Pasang Modul'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer flex-1 select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleToggle(meta.slug, e.target.checked)}
                    disabled={isBusy}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-neutral-200 rounded-full peer-checked:bg-primary-500 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm font-medium text-neutral-700">
                  {isEnabled ? 'Aktif' : 'Nonaktif'}
                </span>
              </label>
              <button
                onClick={() => handleUninstall(meta.slug)}
                disabled={isBusy}
                className="btn-danger py-1.5 px-3 text-xs"
              >
                Lepas
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Marketplace Modul"
        subtitle="Pasang dan kelola modul untuk memperluas fungsionalitas platform"
      />

      {/* Featured / App Store section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-neutral-900">Pilihan Editor</h2>
            <p className="text-xs text-neutral-500">Modul populer untuk pondok pesantren</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((meta) => (
            <ModuleCard key={meta.slug} meta={meta} featured />
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`btn py-2 px-4 text-sm transition-all ${
              filter === c.value ? 'bg-primary-600 text-white' : 'btn-secondary'
            }`}
          >
            {c.label}
            <span
              className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                filter === c.value ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {c.value === 'all'
                ? builtinModules.length
                : builtinModules.filter((m) => m.category === c.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* All modules grid */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
            title="Tidak ada modul"
            desc="Belum ada modul dalam kategori ini."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((meta) => (
            <ModuleCard key={meta.slug} meta={meta} />
          ))}
        </div>
      )}

      {/* Stats footer */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Total Modul</p>
          <p className="font-display text-2xl font-bold mt-1">{builtinModules.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Terpasang</p>
          <p className="font-display text-2xl font-bold mt-1 text-green-600">{modules.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Aktif</p>
          <p className="font-display text-2xl font-bold mt-1 text-primary-600">
            {modules.filter((m) => m.is_enabled).length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500">Belum Terpasang</p>
          <p className="font-display text-2xl font-bold mt-1 text-neutral-400">
            {builtinModules.length - modules.length}
          </p>
        </div>
      </div>
    </div>
  )
}
