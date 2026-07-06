import { useEffect, useRef } from 'react'

export default function NativeAd() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear container to avoid duplicate scripts/content on re-render
    containerRef.current.innerHTML = ''

    // Create the script element
    const script = document.createElement('script')
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    script.src =
      'https://performanceingredientgoblet.com/f6e22a424e0b62926446e1ed741cb299/invoke.js'

    // Create the container element that the script expects to find
    const adContainer = document.createElement('div')
    adContainer.id = 'container-f6e22a424e0b62926446e1ed741cb299'

    containerRef.current.appendChild(adContainer)
    containerRef.current.appendChild(script)
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-[160px] min-h-[600px] bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center overflow-hidden"
    />
  )
}
