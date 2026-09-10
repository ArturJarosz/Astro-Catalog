export type ViewMode = 'card' | 'list' | 'thumbnail-list'

interface ViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex shrink-0 rounded-lg border border-white/10 bg-white/5 p-0.5 text-sm">
      <ViewToggleButton label="Cards" active={value === 'card'} onClick={() => onChange('card')} />
      <ViewToggleButton label="List" active={value === 'list'} onClick={() => onChange('list')} />
      <ViewToggleButton
        label="Thumbnails"
        active={value === 'thumbnail-list'}
        onClick={() => onChange('thumbnail-list')}
      />
    </div>
  )
}

interface ViewToggleButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function ViewToggleButton({ label, active, onClick }: ViewToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 font-medium transition ${
        active ? 'bg-white/10 text-slate-100' : 'text-slate-300 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  )
}
