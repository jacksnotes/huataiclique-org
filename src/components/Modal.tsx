import { ReactNode } from 'react'

interface ModalProps {
  children?: ReactNode
}

export default function Modal(props: ModalProps) {
  const { children } = props
  return (
    <div
      className={[
        'absolute inset-0 z-20 flex items-center justify-center p-4',
        'bg-slate-950/70 backdrop-blur-md',
      ].join(' ')}
    >
      <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-900/95 p-8 text-slate-100 shadow-2xl shadow-black/50">
        {children}
      </div>
    </div>
  )
}
