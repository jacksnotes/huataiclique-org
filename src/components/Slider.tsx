type SliderProps = {
  label?: any
  value?: number
  min?: number
  max?: number
  onChange: (value: number) => void
  onStart?: () => void
}

export default function Slider(props: SliderProps) {
  const { value, label, min, max, onChange, onStart } = props

  const step = ((max || 100) - (min || 0)) / 100

  return (
    <div className="flex w-full flex-wrap items-center gap-3 text-sm font-medium text-slate-200 sm:flex-nowrap">
      <span className="min-w-[88px] whitespace-nowrap">{label}</span>
      <input
        className={[
          'h-2 min-w-[140px] flex-1 cursor-pointer appearance-none rounded-full',
          'bg-slate-700 accent-lime-300',
        ].join(' ')}
        type="range"
        step={step}
        min={min}
        max={max}
        value={value}
        onPointerDown={onStart}
        onChange={ev => {
          ev.preventDefault()
          ev.stopPropagation()
          onChange(parseInt(ev.currentTarget.value, 10))
        }}
      />
    </div>
  )
}
