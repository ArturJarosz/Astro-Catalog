export type AppSection = 'catalogue' | 'planning' | 'seestar' | 'configuration'

interface AppNavProps {
  active: AppSection
  onSelect: (section: AppSection) => void
}

const SECTIONS: { id: AppSection; label: string }[] = [
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'planning', label: 'Planning' },
  { id: 'seestar', label: 'Seestar' },
  { id: 'configuration', label: 'Configuration' },
]

export function AppNav({ active, onSelect }: AppNavProps) {
  return (
    <nav className="w-40 shrink-0 space-y-1">
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelect(section.id)}
          className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
            active === section.id
              ? 'bg-white/10 text-slate-100'
              : 'text-slate-300 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          {section.label}
        </button>
      ))}
    </nav>
  )
}
