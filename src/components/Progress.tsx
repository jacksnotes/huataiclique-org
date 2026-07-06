interface ProgressProps {
  percent: number
}

export default function Progress({ percent }: ProgressProps) {
  return (
    <div className="flex w-full items-center gap-4 text-sm font-medium text-slate-200">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-lime-300 duration-100"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-20 text-right text-slate-300">
        {percent.toFixed(2)}%
      </span>
    </div>
  )
}
