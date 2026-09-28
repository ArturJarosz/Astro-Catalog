import type { ReactNode } from 'react'

interface InfoTipProps {
  children: ReactNode
  /** Wider popover for reference content such as tables. */
  wide?: boolean
}

/**
 * A small "i" icon that reveals help text on hover or keyboard focus. Used on the Configuration
 * page so descriptions don't take up room until they're wanted. Safe inside a <label>: clicking
 * the icon doesn't toggle or focus the labelled control.
 */
export function InfoTip({ children, wide = false }: InfoTipProps) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label="More information"
        onClick={(e) => e.preventDefault()}
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-500 text-[10px] font-semibold leading-none text-slate-400 transition hover:border-slate-300 hover:text-slate-200 focus:border-sky-400 focus:text-sky-300 focus:outline-none"
      >
        i
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full left-0 z-30 mt-2 rounded-lg border border-white/15 bg-slate-900 p-3 text-xs font-normal text-slate-300 opacity-0 shadow-xl shadow-black/40 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 ${
          wide ? 'w-[32rem]' : 'w-80'
        }`}
      >
        {children}
      </span>
    </span>
  )
}
