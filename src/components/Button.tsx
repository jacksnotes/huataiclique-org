import { ReactNode, useState } from 'react'

interface ButtonProps {
  children: ReactNode
  className?: string
  icon?: ReactNode
  primary?: boolean
  style?: {
    [key: string]: string
  }
  onClick?: () => void
  onDown?: () => void
  onUp?: () => void
  onEnter?: () => void
  onLeave?: () => void
}

export default function Button(props: ButtonProps) {
  const {
    children,
    className,
    icon,
    primary,
    style,
    onClick,
    onDown,
    onUp,
    onEnter,
    onLeave,
  } = props
  const [active, setActive] = useState(false)
  let background = ''
  if (primary) {
    background =
      'border border-lime-300/80 bg-lime-300 text-slate-950 hover:bg-lime-200'
  }
  if (active) {
    background = 'border border-teal-300/80 bg-teal-300 text-slate-950'
  }
  if (!primary && !active) {
    background =
      'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
  }
  return (
    <div
      role="button"
      onKeyDown={() => {
        onDown?.()
      }}
      onClick={onClick}
      onPointerDown={() => {
        setActive(true)
        onDown?.()
      }}
      onPointerUp={() => {
        setActive(false)
        onUp?.()
      }}
      onPointerEnter={() => {
        onEnter?.()
      }}
      onPointerLeave={() => {
        onLeave?.()
      }}
      tabIndex={-1}
      className={[
        'inline-flex items-center justify-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold transition-colors duration-150',
        background,
        className,
      ].join(' ')}
      style={style}
    >
      {icon}
      <span className="whitespace-nowrap select-none">{children}</span>
    </div>
  )
}
