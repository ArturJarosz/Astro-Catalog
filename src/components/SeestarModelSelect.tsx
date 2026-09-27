import { SEESTAR_MODELS, type SeestarModel } from '../lib/seestarModel'

interface SeestarModelSelectProps {
  value: SeestarModel
  onChange: (model: SeestarModel) => void
}

export function SeestarModelSelect({ value, onChange }: SeestarModelSelectProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <label htmlFor="seestar-model-select" className="text-sm text-slate-300">
        Seestar
      </label>
      <select
        id="seestar-model-select"
        value={value}
        onChange={(e) => onChange(e.target.value as SeestarModel)}
        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
      >
        {SEESTAR_MODELS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-800">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
