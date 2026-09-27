import type { ObjectGroup } from '../lib/groupObjects'

interface SidebarProps {
  groups: ObjectGroup[]
  totalCount: number
  selectedCatalog: string | null
  onSelect: (catalog: string | null) => void
}

export function Sidebar({ groups, totalCount, selectedCatalog, onSelect }: SidebarProps) {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      <SidebarItem label="All Objects" count={totalCount} active={selectedCatalog === null} onClick={() => onSelect(null)} />
      {groups.map((group) => (
        <SidebarItem
          key={group.catalog}
          label={group.catalog}
          count={group.objects.length}
          active={selectedCatalog === group.catalog}
          onClick={() => onSelect(group.catalog)}
        />
      ))}
    </nav>
  )
}

interface SidebarItemProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function SidebarItem({ label, count, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
        active ? 'bg-white/10 text-slate-100' : 'text-slate-300 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-slate-400">({count})</span>
    </button>
  )
}
