import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { useModules } from '../context/ModuleContext'

interface ToolCard {
  title: string
  description: string
  icon: string
  color: string
  to?: string
  comingSoon?: boolean
}

const TOOLS: ToolCard[] = [
  {
    title: 'Module Builder',
    description: 'Buat modul tanpa coding. Definisikan field, label, dan tipe data — modul siap dipakai.',
    icon: 'M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM4 9h16M4 9v8a2 2 0 002 2h12a2 2 0 002-2V9M4 9l2-4h12l2 4',
    color: 'from-primary-400 to-primary-600',
    to: '/app/module-builder',
  },
  {
    title: 'Database Designer',
    description: 'Desain database visual dengan drag-and-drop. Buat tabel, relasi, dan index tanpa SQL.',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    color: 'from-blue-400 to-blue-600',
    comingSoon: true,
  },
  {
    title: 'Form Builder',
    description: 'Drag-and-drop form builder. Susun form dengan berbagai tipe input dan validasi.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    color: 'from-purple-400 to-purple-600',
    comingSoon: true,
  },
  {
    title: 'Report Builder',
    description: 'Buat laporan custom. Pilih data, filter, dan format — export ke PDF atau Excel.',
    icon: 'M9 17v-2m2 2v-4m2 2v-6m-6 8h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    color: 'from-amber-400 to-amber-600',
    comingSoon: true,
  },
  {
    title: 'Workflow Builder',
    description: 'Otomatisasi alur kerja. Trigger, kondisi, dan aksi — tanpa kode.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    color: 'from-orange-400 to-orange-600',
    comingSoon: true,
  },
  {
    title: 'Theme Builder',
    description: 'Kustomisasi tema. Pilih warna, font, dan layout untuk pondok Anda.',
    icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    color: 'from-pink-400 to-pink-600',
    to: '/app/theme-store',
  },
  {
    title: 'SQL Console',
    description: 'Query database langsung. Eksekusi SQL dan lihat hasil secara real-time.',
    icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    color: 'from-cyan-400 to-cyan-600',
    comingSoon: true,
  },
  {
    title: 'Marketplace',
    description: 'Pasang modul siap pakai. Jelajahi katalog modul dari komunitas dan pengembang.',
    icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    color: 'from-emerald-400 to-emerald-600',
    to: '/app/marketplace',
  },
]

export default function StudioPage() {
  const { customModules } = useModules()

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="SIM KBM Studio"
        subtitle="Pusat alat builder untuk memperluas dan menyesuaikan platform"
      />

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 sm:p-10 mb-8">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 right-12 w-32 h-32 bg-white/5 rounded-2xl rotate-12 -translate-y-1/2" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-4">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-white/90">Tahap 3 — No-Code Platform</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3 max-w-2xl">
            Bangun Modul Tanpa Coding
          </h2>
          <p className="text-primary-100 text-sm sm:text-base max-w-xl leading-relaxed mb-6">
            SIM KBM Studio memberi Anda kekuatan untuk memperluas platform sesuai kebutuhan pondok.
            Buat modul kustom, desain form, otomatiskan alur kerja — semua tanpa menyentuh kode.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/app/module-builder"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary-700 font-semibold text-sm hover:bg-primary-50 transition-colors shadow-lg"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Mulai Buat Modul
            </Link>
            <Link
              to="/app/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm text-white font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20"
            >
              Jelajahi Marketplace
            </Link>
          </div>
        </div>
      </div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {TOOLS.map((tool) => {
          const inner = (
            <div className="card p-6 h-full flex flex-col group hover:shadow-lg transition-all animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-md`}>
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
                  </svg>
                </div>
                {tool.comingSoon && (
                  <span className="badge bg-amber-50 text-amber-600 text-xs">Coming Soon</span>
                )}
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-900 mb-2">{tool.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed flex-1">{tool.description}</p>
              <div className="mt-4 pt-4 border-t border-neutral-100">
                {tool.comingSoon ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-neutral-400 font-medium">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Segera Hadir
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-primary-600 font-semibold group-hover:gap-2.5 transition-all">
                    Buka
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          )

          return tool.to ? (
            <Link key={tool.title} to={tool.to} className="block h-full">
              {inner}
            </Link>
          ) : (
            <div key={tool.title} className="h-full">
              {inner}
            </div>
          )
        })}
      </div>

      {/* Custom modules summary */}
      {customModules.length > 0 && (
        <div className="mt-8 card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM4 9h16M4 9v8a2 2 0 002 2h12a2 2 0 002-2V9" />
              </svg>
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-neutral-900">Modul Kustom Anda</h3>
              <p className="text-xs text-neutral-500">{customModules.length} modul telah dibuat</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {customModules.map((cm) => (
              <Link
                key={cm.slug}
                to={`/app/custom/${cm.slug}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 hover:bg-primary-50 transition-colors group"
              >
                <svg className="h-4 w-4 text-neutral-400 group-hover:text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={cm.icon || 'M12 4v16m8-8H4'} />
                </svg>
                <span className="text-sm font-medium text-neutral-700 group-hover:text-primary-700">{cm.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Info section */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="font-semibold text-sm text-neutral-900 mb-1">Tanpa Coding</h4>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Buat modul dan form dengan antarmuka visual. Tidak perlu pengetahuan teknis.
          </p>
        </div>
        <div className="card p-5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-semibold text-sm text-neutral-900 mb-1">Aman & Terpusat</h4>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Semua data tersimpan di database pondok Anda dengan keamanan tingkat enterprise.
          </p>
        </div>
        <div className="card p-5">
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m-7 4l-3 4 3 4m10-8l3 4-3 4" />
            </svg>
          </div>
          <h4 className="font-semibold text-sm text-neutral-900 mb-1">Fleksibel</h4>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Sesuaikan platform sesuai kebutuhan. Tambah, ubah, atau hapus modul kapan saja.
          </p>
        </div>
      </div>
    </div>
  )
}
