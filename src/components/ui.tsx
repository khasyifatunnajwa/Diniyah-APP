export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, desc }: { icon?: string; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <svg className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      )}
      <h3 className="font-semibold text-neutral-700">{title}</h3>
      {desc && <p className="text-sm text-neutral-500 mt-1 max-w-sm">{desc}</p>}
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600" />
    </div>
  )
}

export function StatusBadge({ status, labels }: { status: string; labels: Record<string, { text: string; class: string }> }) {
  const cfg = labels[status] || { text: status, class: 'bg-neutral-100 text-neutral-600' }
  return <span className={`badge ${cfg.class}`}>{cfg.text}</span>
}
