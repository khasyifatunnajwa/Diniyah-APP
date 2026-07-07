import { useState } from 'react'
import { useTheme, PRESET_THEMES } from '../context/ThemeContext'
import { PageHeader, LoadingSpinner } from '../components/ui'

const THEME_META: Record<string, { label: string; desc: string }> = {
  green: { label: 'Hijau', desc: 'Tema segar dengan nuansa hijau khas pesantren' },
  blue: { label: 'Biru', desc: 'Tema profesional dengan warna biru yang menenangkan' },
  dark: { label: 'Gelap', desc: 'Tema gelap modern untuk kenyamanan mata' },
  pesantren: { label: 'Pesantren', desc: 'Tema klasik dengan warna hijau tua dan emas' },
  modern: { label: 'Modern', desc: 'Tema kontemporer dengan aksen ungu dan pink' },
  classic: { label: 'Klasik', desc: 'Tema tradisional dengan warna coklat hangat' },
}

export default function ThemeStorePage() {
  const { theme, applyTheme, loading } = useTheme()
  const [applying, setApplying] = useState<string | null>(null)

  if (loading) return <LoadingSpinner />

  const activeThemeName = theme?.theme_name || 'green'

  const handleApply = async (themeName: string, primary: string, accent: string, bg: string) => {
    setApplying(themeName)
    try {
      await applyTheme(themeName, primary, accent, bg)
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Toko Tema"
        subtitle="Pilih tema visual untuk menyesuaikan tampilan platform"
      />

      {/* Active theme banner */}
      <div className="card p-5 mb-6 flex items-center gap-4">
        <div
          className="h-14 w-14 rounded-2xl shrink-0 flex items-center justify-center"
          style={{ background: theme?.primary_color || PRESET_THEMES.green.primary }}
        >
          <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-neutral-500">Tema Aktif Saat Ini</p>
          <h3 className="font-display font-bold text-lg text-neutral-900">
            {THEME_META[activeThemeName]?.label || activeThemeName}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-lg border border-neutral-200" style={{ background: theme?.primary_color || PRESET_THEMES.green.primary }} title="Primary" />
            <span className="text-xs text-neutral-400 font-mono">{theme?.primary_color || PRESET_THEMES.green.primary}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-lg border border-neutral-200" style={{ background: theme?.accent_color || PRESET_THEMES.green.accent }} title="Accent" />
            <span className="text-xs text-neutral-400 font-mono">{theme?.accent_color || PRESET_THEMES.green.accent}</span>
          </div>
        </div>
      </div>

      {/* Theme cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(PRESET_THEMES).map(([key, colors]) => {
          const isActive = key === activeThemeName
          const isApplying = applying === key
          const meta = THEME_META[key]

          return (
            <div
              key={key}
              className={`card overflow-hidden hover:shadow-lg transition-all animate-fade-in ${
                isActive ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              {/* Mini mockup preview */}
              <div
                className="relative h-44 overflow-hidden"
                style={{ background: colors.bg }}
              >
                {/* Sidebar mockup */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1/4 flex flex-col items-center pt-3 gap-1.5"
                  style={{ background: colors.primary }}
                >
                  <div className="h-6 w-6 rounded-lg bg-white/25 mb-1" />
                  <div className="h-1 w-10 rounded-full bg-white/20" />
                  <div className="h-1 w-8 rounded-full bg-white/15" />
                  <div className="h-1 w-10 rounded-full bg-white/20" />
                  <div className="h-1 w-7 rounded-full bg-white/15" />
                </div>

                {/* Content area mockup */}
                <div className="absolute left-1/4 top-0 right-0 bottom-0 p-3">
                  {/* Top bar */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="h-2 w-16 rounded-full" style={{ background: colors.primary, opacity: 0.3 }} />
                    <div
                      className="h-5 w-5 rounded-full"
                      style={{ background: colors.accent }}
                    />
                  </div>
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                    <div className="rounded-md bg-white/60 p-1.5 shadow-sm">
                      <div className="h-1 w-6 rounded-full mb-1" style={{ background: colors.primary, opacity: 0.4 }} />
                      <div className="h-2.5 w-8 rounded-full" style={{ background: colors.primary }} />
                    </div>
                    <div className="rounded-md bg-white/60 p-1.5 shadow-sm">
                      <div className="h-1 w-6 rounded-full mb-1" style={{ background: colors.accent, opacity: 0.5 }} />
                      <div className="h-2.5 w-8 rounded-full" style={{ background: colors.accent }} />
                    </div>
                  </div>
                  {/* Content rows */}
                  <div className="rounded-md bg-white/50 p-2 shadow-sm space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded shrink-0" style={{ background: colors.primary, opacity: 0.6 }} />
                      <div className="h-1.5 flex-1 rounded-full" style={{ background: colors.primary, opacity: 0.2 }} />
                      <div className="h-2 w-5 rounded-full" style={{ background: colors.accent }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded shrink-0" style={{ background: colors.accent, opacity: 0.6 }} />
                      <div className="h-1.5 flex-1 rounded-full" style={{ background: colors.primary, opacity: 0.15 }} />
                      <div className="h-2 w-5 rounded-full" style={{ background: colors.primary, opacity: 0.5 }} />
                    </div>
                  </div>
                </div>

                {/* Active badge */}
                {isActive && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="badge bg-white/90 text-primary-600 shadow-sm font-semibold">
                      ✓ Aktif
                    </span>
                  </div>
                )}
              </div>

              {/* Theme info */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-display font-bold text-lg text-neutral-900">{meta?.label || key}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-6 w-6 rounded-lg border border-neutral-200"
                      style={{ background: colors.primary }}
                      title="Primary"
                    />
                    <div
                      className="h-6 w-6 rounded-lg border border-neutral-200"
                      style={{ background: colors.accent }}
                      title="Accent"
                    />
                    <div
                      className="h-6 w-6 rounded-lg border border-neutral-200"
                      style={{ background: colors.bg }}
                      title="Background"
                    />
                  </div>
                </div>
                <p className="text-sm text-neutral-500 leading-relaxed mb-4">{meta?.desc}</p>

                <button
                  onClick={() => handleApply(key, colors.primary, colors.accent, colors.bg)}
                  disabled={isActive || isApplying}
                  className={isActive ? 'btn-secondary w-full' : 'btn-primary w-full'}
                >
                  {isApplying ? 'Menerapkan...' : isActive ? 'Tema Aktif' : 'Terapkan Tema'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info card */}
      <div className="card p-5 mt-6 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-neutral-900 mb-1">Tentang Tema</h4>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Tema diterapkan secara langsung untuk seluruh pengguna di pondok Anda. Perubahan akan
            disimpan dan digunakan setiap kali Anda masuk kembali. Anda dapat mengganti tema kapan saja.
          </p>
        </div>
      </div>
    </div>
  )
}
