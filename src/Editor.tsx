/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import { DownloadIcon, EyeIcon, ViewBoardsIcon } from '@heroicons/react/outline'
import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import inpaint from './adapters/inpainting'
import superResolution from './adapters/superResolution'
import Button from './components/Button'
import Slider from './components/Slider'
import { downloadImage, loadImage, useImage } from './utils'
import Progress from './components/Progress'
import { modelExists, downloadModel } from './adapters/cache'
import Modal from './components/Modal'
import * as m from './paraglide/messages'

interface EditorProps {
  file: File
}

interface Line {
  size?: number
  pts: { x: number; y: number }[]
  src: string
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: Line[],
  color = 'rgba(255, 0, 0, 0.5)'
) {
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  lines.forEach(line => {
    if (!line?.pts.length || !line.size) {
      return
    }
    ctx.lineWidth = line.size
    ctx.beginPath()
    ctx.moveTo(line.pts[0].x, line.pts[0].y)
    line.pts.forEach(pt => ctx.lineTo(pt.x, pt.y))
    ctx.stroke()
  })
}

const BRUSH_HIDE_ON_SLIDER_CHANGE_TIMEOUT = 2000
export default function Editor(props: EditorProps) {
  const { file } = props
  const [brushSize, setBrushSize] = useState(40)
  const [original, isOriginalLoaded] = useImage(file)
  const [renders, setRenders] = useState<HTMLImageElement[]>([])
  const [context, setContext] = useState<CanvasRenderingContext2D>()
  const [maskCanvas] = useState<HTMLCanvasElement>(() => {
    return document.createElement('canvas')
  })
  const [lines, setLines] = useState<Line[]>([])
  const brushRef = useRef<HTMLDivElement>(null)
  const [showBrush, setShowBrush] = useState(false)
  const [hideBrushTimeout, setHideBrushTimeout] = useState(0)
  const [showOriginal, setShowOriginal] = useState(false)
  const [isInpaintingLoading, setIsProcessingLoading] = useState(false)
  const [generateProgress, setGenerateProgress] = useState(0)
  const modalRef = useRef(null)
  const [separator, setSeparator] = useState<HTMLDivElement>()
  const [useSeparator, setUseSeparator] = useState(false)
  const [originalImg, setOriginalImg] = useState<HTMLDivElement>()
  const [separatorLeft, setSeparatorLeft] = useState(0)
  const historyListRef = useRef<HTMLDivElement>(null)
  const isBrushSizeChange = useRef<boolean>(false)
  const scaledBrushSize = useMemo(() => brushSize, [brushSize])
  const canvasDiv = useRef<HTMLDivElement>(null)
  const [downloaded, setDownloaded] = useState(true)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const hasMask = lines.some(line => line.pts.length > 0)

  const canvasSizeRef = useRef({ w: 0, h: 0 })
  const hasSetSize = useRef(false)

  // 图片加载后固定 canvas 像素尺寸，不再随容器变化
  useEffect(() => {
    if (
      !context?.canvas ||
      !isOriginalLoaded ||
      !canvasDiv.current ||
      hasSetSize.current
    ) {
      return
    }
    const dw = canvasDiv.current.offsetWidth
    const dh = canvasDiv.current.offsetHeight
    if (!dw || !dh) return
    const imgAspect = original.width / original.height
    const divAspect = dw / dh
    let cw: number
    let ch: number
    if (divAspect > imgAspect) {
      ch = dh
      cw = original.width * (dh / original.height)
    } else {
      cw = dw
      ch = original.height * (dw / original.width)
    }
    canvasSizeRef.current = { w: Math.round(cw), h: Math.round(ch) }
    context.canvas.width = Math.round(cw)
    context.canvas.height = Math.round(ch)
    hasSetSize.current = true
    draw()
  }, [context?.canvas, isOriginalLoaded, original])

  const draw = useCallback(
    (index = -1) => {
      if (!context || !canvasSizeRef.current.w || !canvasSizeRef.current.h) {
        return
      }
      const { w, h } = canvasSizeRef.current
      context.clearRect(0, 0, w, h)
      const currRender =
        renders[index === -1 ? renders.length - 1 : index] ?? original
      context.drawImage(currRender, 0, 0, w, h)
      drawLines(context, lines)
    },
    [context, lines, original, renders]
  )

  useEffect(() => {
    if (!context?.canvas || !isOriginalLoaded || !hasSetSize.current) {
      return
    }
    draw()
  }, [draw, context?.canvas, isOriginalLoaded, lines])

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = context?.canvas
      if (!canvas) {
        return null
      }
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return null
      }
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = Math.max(
        0,
        Math.min(canvas.width, (clientX - rect.left) * scaleX)
      )
      const y = Math.max(
        0,
        Math.min(canvas.height, (clientY - rect.top) * scaleY)
      )
      return { x, y }
    },
    [context?.canvas]
  )

  const refreshCanvasMask = useCallback(() => {
    if (!context?.canvas.width || !context?.canvas.height) {
      throw new Error('canvas has invalid size')
    }
    maskCanvas.width = context?.canvas.width
    maskCanvas.height = context?.canvas.height
    const ctx = maskCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('could not retrieve mask canvas')
    }
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    drawLines(ctx, lines, 'white')
  }, [context?.canvas.height, context?.canvas.width, lines, maskCanvas])

  // Handle mouse interactions
  useEffect(() => {
    const canvas = context?.canvas
    if (!canvas) {
      return
    }
    let isDrawing = false

    const onMouseMove = (ev: MouseEvent) => {
      if (brushRef.current) {
        const x = ev.pageX - scaledBrushSize / 2
        const y = ev.pageY - scaledBrushSize / 2

        brushRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
    }
    const onPaint = (clientX: number, clientY: number) => {
      const point = getCanvasPoint(clientX, clientY)
      if (!point) {
        return
      }
      setLines(prev => {
        if (!prev.length) {
          return [{ pts: [point], src: '', size: brushSize }]
        }
        const next = [...prev]
        const currentLine = next[next.length - 1]
        if (!currentLine) {
          return [{ pts: [point], src: '', size: brushSize }]
        }
        next[next.length - 1] = {
          ...currentLine,
          pts: [...currentLine.pts, point],
          size: currentLine.size ?? brushSize,
        }
        return next
      })
    }
    const onMouseDrag = (ev: MouseEvent) => {
      if (!isDrawing) {
        return
      }
      onPaint(ev.clientX, ev.clientY)
    }

    const stopDrawing = () => {
      isDrawing = false
      canvas.removeEventListener('mousemove', onMouseDrag)
      window.removeEventListener('mouseup', stopDrawing)
      window.removeEventListener('touchend', stopDrawing)
    }
    canvas.addEventListener('mousemove', onMouseMove)

    const onTouchMove = (ev: TouchEvent) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (!isDrawing || !ev.touches[0]) {
        return
      }
      onPaint(ev.touches[0].clientX, ev.touches[0].clientY)
    }
    const onPointerStart = (clientX: number, clientY: number) => {
      if (!original.src || showOriginal) {
        return
      }
      const point = getCanvasPoint(clientX, clientY)
      if (!point) {
        return
      }
      isDrawing = true
      setLines(prev => [...prev, { pts: [point], src: '', size: brushSize }])
      canvas.addEventListener('mousemove', onMouseDrag)
      window.addEventListener('mouseup', stopDrawing)
      window.addEventListener('touchend', stopDrawing)
    }

    const onTouchStart = (ev: TouchEvent) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (!ev.touches[0]) {
        return
      }
      onPointerStart(ev.touches[0].clientX, ev.touches[0].clientY)
    }

    const onMouseDown = (ev: MouseEvent) => {
      onPointerStart(ev.clientX, ev.clientY)
    }

    canvas.addEventListener('touchstart', onTouchStart)
    canvas.addEventListener('touchmove', onTouchMove)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.onmouseenter = () => {
      window.clearTimeout(hideBrushTimeout)
      setShowBrush(true && !showOriginal)
    }
    canvas.onmouseleave = () => setShowBrush(false)

    return () => {
      stopDrawing()
      canvas.removeEventListener('mousemove', onMouseDrag)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.onmouseenter = null
      canvas.onmouseleave = null
    }
  }, [
    brushSize,
    context,
    getCanvasPoint,
    original.src,
    showOriginal,
    hideBrushTimeout,
    scaledBrushSize,
  ])

  useEffect(() => {
    if (!separator || !originalImg) return

    const separatorMove = (ev: MouseEvent) => {
      ev.preventDefault()
      ev.stopPropagation()
      if (context?.canvas) {
        const { width } = context?.canvas
        const canvasRect = context?.canvas.getBoundingClientRect()
        const separatorOffsetLeft = ev.pageX - canvasRect.left
        if (separatorOffsetLeft <= width && separatorOffsetLeft >= 0) {
          setSeparatorLeft(separatorOffsetLeft)
        } else if (separatorOffsetLeft < 0) {
          setSeparatorLeft(0)
        } else if (separatorOffsetLeft > width) {
          setSeparatorLeft(width)
        }
      }
    }

    const separatorDown = () => {
      window.addEventListener('mousemove', separatorMove)
      setUseSeparator(true)
    }

    const separatorUp = () => {
      window.removeEventListener('mousemove', separatorMove)
      setUseSeparator(false)
    }

    separator.addEventListener('mousedown', separatorDown)
    window.addEventListener('mouseup', separatorUp)

    return () => {
      separator.removeEventListener('mousedown', separatorDown)
      window.removeEventListener('mouseup', separatorUp)
    }
  }, [separator, context])

  function download() {
    const currRender = renders[renders.length - 1] ?? original
    downloadImage(currRender.currentSrc, 'IMG')
  }

  async function runInpaint() {
    if (!hasMask || !original.src || showOriginal) {
      return
    }

    const loading = onloading()

    try {
      const start = Date.now()
      console.log('inpaint_start')
      refreshCanvasMask()
      const newFile = renders[renders.length - 1] ?? file
      const res = await inpaint(newFile, maskCanvas.toDataURL())
      if (!res) {
        throw new Error('empty response')
      }

      const newRender = new Image()
      newRender.dataset.id = Date.now().toString()
      await loadImage(newRender, res)
      setRenders(prev => [...prev, newRender])
      setLines([])
      console.log('inpaint_processed', {
        duration: Date.now() - start,
      })
    } catch (e: any) {
      console.log('inpaint_failed', {
        error: e,
      })
      // eslint-disable-next-line
      alert(e.message ? e.message : e.toString())
    } finally {
      if (historyListRef.current) {
        const { scrollWidth, clientWidth } = historyListRef.current
        if (scrollWidth > clientWidth) {
          historyListRef.current.scrollTo(scrollWidth, 0)
        }
      }
      loading.close()
    }
  }

  const undo = useCallback(async () => {
    setLines([])
    setRenders(prev => prev.slice(0, -1))
  }, [lines, renders])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!renders.length) {
        return
      }
      const isCmdZ = (event.metaKey || event.ctrlKey) && event.key === 'z'
      if (isCmdZ) {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [renders, undo])

  const backTo = useCallback(
    (index: number) => {
      setLines([])
      setRenders(prev => prev.slice(0, index + 1))
    },
    [renders, lines]
  )

  const History = useMemo(
    () =>
      renders.map((render, index) => {
        return (
          <div
            key={render.dataset.id}
            style={{
              position: 'relative',
              display: 'inline-block',
              flexShrink: 0,
            }}
          >
            <img
              src={render.src}
              alt="render"
              className="rounded-sm"
              style={{
                height: '90px',
              }}
            />
            <Button
              className="hover:opacity-100 opacity-0 cursor-pointer rounded-sm"
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => backTo(index)}
              onEnter={() => draw(index)}
              onLeave={draw}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '12px',
                  textAlign: 'center',
                }}
              >
                {m.restore_version()}
              </div>
            </Button>
          </div>
        )
      }),
    [renders, backTo]
  )

  const handleSliderStart = () => {
    setShowBrush(true)
  }
  const handleSliderChange = (sliderValue: number) => {
    if (!isBrushSizeChange.current) {
      isBrushSizeChange.current = true
    }
    if (brushRef.current) {
      const x = document.documentElement.clientWidth / 2 - scaledBrushSize / 2
      const y = document.documentElement.clientHeight / 2 - scaledBrushSize / 2

      brushRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
    setBrushSize(sliderValue)
    window.clearTimeout(hideBrushTimeout)
    setHideBrushTimeout(
      window.setTimeout(() => {
        setShowBrush(false)
      }, BRUSH_HIDE_ON_SLIDER_CHANGE_TIMEOUT)
    )
  }

  const onloading = useCallback(() => {
    setIsProcessingLoading(true)
    setGenerateProgress(0)
    const progressTimer = window.setInterval(() => {
      setGenerateProgress(p => {
        if (p < 90) return p + 10 * Math.random()
        if (p >= 90 && p < 99) return p + 1 * Math.random()
        // Do not hide the progress bar after 99%,cause sometimes long time progress
        // window.setTimeout(() => setIsInpaintingLoading(false), 500)
        return p
      })
    }, 1000)
    return {
      close: () => {
        clearInterval(progressTimer)
        setGenerateProgress(100)
        setIsProcessingLoading(false)
      },
    }
  }, [])

  const onSuperResolution = useCallback(async () => {
    if (!(await modelExists('superResolution'))) {
      setDownloaded(false)
      await downloadModel('superResolution', setDownloadProgress)
      setDownloaded(true)
    }
    setIsProcessingLoading(true)
    try {
      // 运行
      const start = Date.now()
      console.log('superResolution_start')
      // each time based on the last result, the first is the original
      const newFile = renders[renders.length - 1] ?? file
      const res = await superResolution(newFile, setGenerateProgress)
      if (!res) {
        throw new Error('empty response')
      }
      // TODO: fix the render if it failed loading
      const newRender = new Image()
      newRender.dataset.id = Date.now().toString()
      await loadImage(newRender, res)
      setRenders(prev => [...prev, newRender])
      setLines([])
      console.log('superResolution_processed', {
        duration: Date.now() - start,
      })

      // 替换当前图片
    } catch (error) {
      console.error('superResolution', error)
    } finally {
      setIsProcessingLoading(false)
    }
  }, [file, lines, original.naturalHeight, original.naturalWidth, renders])

  return (
    <div
      className={[
        'flex h-full w-full flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-slate-100 shadow-2xl shadow-black/20 sm:p-6',
        isInpaintingLoading ? 'pointer-events-none' : '',
      ].join(' ')}
    >
      {renders.length > 1 && (
        <div
          ref={historyListRef}
          style={{
            height: '116px',
          }}
          className={[
            'mt-2 flex w-full max-w-5xl flex-shrink-0 flex-row items-start space-x-5 overflow-x-scroll rounded-2xl border border-white/10 bg-black/20 p-3',
            'scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800',
          ].join(' ')}
        >
          {History}
        </div>
      )}
      {/* 画图 */}
      <div
        className={[
          'relative my-2 flex w-full max-w-5xl items-center justify-center overflow-hidden',
        ].join(' ')}
        style={{
          minHeight: 'min(62vh, 720px)',
          maxHeight: '90vh',
        }}
        ref={canvasDiv}
      >
        <div className="relative rounded-3xl border border-white/10 bg-black/20 p-3 shadow-xl shadow-black/20">
          <div className="relative inline-block">
            <canvas
              className="rounded-sm"
              style={showBrush ? { cursor: 'none' } : {}}
              ref={r => {
                if (r && !context) {
                  const ctx = r.getContext('2d')
                  if (ctx) {
                    setContext(ctx)
                  }
                }
              }}
            />
            <div
              className={[
                'absolute top-0 right-0 pointer-events-none',
                showOriginal ? '' : 'overflow-hidden',
              ].join(' ')}
              style={{
                width: showOriginal ? `${context?.canvas.width}px` : '0px',
                height: context?.canvas.height,
                transitionProperty: 'width, height',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDuration: '300ms',
              }}
              ref={r => {
                if (r && !originalImg) {
                  setOriginalImg(r)
                }
              }}
            >
              <div
                className={[
                  'absolute top-0 right-0 pointer-events-none z-10',
                  useSeparator ? 'bg-black text-white' : 'bg-primary ',
                  'w-1',
                  'flex items-center justify-center',
                  'separator',
                ].join(' ')}
                style={{
                  left: `${separatorLeft}px`,
                  height: context?.canvas.height,
                  transitionProperty: 'width, height',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  transitionDuration: '300ms',
                }}
              >
                <span className="absolute left-1 bottom-0 rounded bg-black bg-opacity-25 p-1 text-white select-none">
                  original
                </span>
                <div
                  className={[
                    'absolute rounded-md px-1 py-2 pointer-events-auto',
                    useSeparator ? 'bg-black' : 'bg-primary ',
                  ].join(' ')}
                  style={{ cursor: 'ew-resize' }}
                  ref={r => {
                    if (r && !separator) {
                      setSeparator(r)
                    }
                  }}
                >
                  <ViewBoardsIcon
                    className="w-5 h-5"
                    style={{ cursor: 'ew-resize' }}
                  />
                </div>
              </div>
              <img
                className="absolute right-0"
                src={original.src}
                alt="original"
                width={`${context?.canvas.width}px`}
                height={`${context?.canvas.height}px`}
                style={{
                  width: `${context?.canvas.width}px`,
                  height: `${context?.canvas.height}px`,
                  maxWidth: 'none',
                  clipPath: `inset(0 0 0 ${separatorLeft}px)`,
                }}
              />
            </div>
          </div>
          {isInpaintingLoading && (
            <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center rounded-2xl bg-slate-950/70 backdrop-blur-sm">
              <div
                ref={modalRef}
                className="w-4/5 space-y-5 rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-base text-slate-100 shadow-2xl shadow-black/50 sm:w-1/2"
              >
                <p className="text-lg font-semibold text-white">
                  正在处理中，请耐心等待
                </p>
                <p className="text-sm leading-6 text-slate-300">
                  It is being processed, please be patient.
                </p>
                <Progress percent={generateProgress} />
              </div>
            </div>
          )}
        </div>
      </div>

      {!downloaded && (
        <Modal>
          <div className="text-xl space-y-5">
            <p>{m.upscaleing_model_download_message()}</p>
            <Progress percent={downloadProgress} />
          </div>
        </Modal>
      )}
      {showBrush && (
        <div
          className="fixed rounded-full bg-red-500 bg-opacity-50 pointer-events-none left-0 top-0"
          style={{
            width: `${scaledBrushSize}px`,
            height: `${scaledBrushSize}px`,
            transform: `translate3d(-100px, -100px, 0)`,
          }}
          ref={brushRef}
        />
      )}
      {/* 工具栏 */}
      <div
        className={[
          'flex-shrink-0',
          'mb-4 flex w-full max-w-5xl flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/85 p-4 shadow-lg shadow-black/30 transition duration-200 ease-in-out',
        ].join(' ')}
      >
        {renders.length > 0 && (
          <Button
            primary
            className="min-w-[132px] justify-center"
            onClick={undo}
            icon={
              <svg
                className="w-6 h-6"
                width="19"
                height="9"
                viewBox="0 0 19 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 1C2 0.447715 1.55228 0 1 0C0.447715 0 0 0.447715 0 1H2ZM1 8H0V9H1V8ZM8 9C8.55228 9 9 8.55229 9 8C9 7.44771 8.55228 7 8 7V9ZM16.5963 7.42809C16.8327 7.92721 17.429 8.14016 17.9281 7.90374C18.4272 7.66731 18.6402 7.07103 18.4037 6.57191L16.5963 7.42809ZM16.9468 5.83205L17.8505 5.40396L16.9468 5.83205ZM0 1V8H2V1H0ZM1 9H8V7H1V9ZM1.66896 8.74329L6.66896 4.24329L5.33104 2.75671L0.331035 7.25671L1.66896 8.74329ZM16.043 6.26014L16.5963 7.42809L18.4037 6.57191L17.8505 5.40396L16.043 6.26014ZM6.65079 4.25926C9.67554 1.66661 14.3376 2.65979 16.043 6.26014L17.8505 5.40396C15.5805 0.61182 9.37523 -0.710131 5.34921 2.74074L6.65079 4.25926Z"
                  fill="currentColor"
                />
              </svg>
            }
          >
            {m.undo()}
          </Button>
        )}
        <Button
          className="min-w-[132px] justify-center"
          onClick={() => setLines([])}
        >
          {m.clear_mask()}
        </Button>
        <Button
          primary
          className="min-w-[132px] justify-center"
          onClick={runInpaint}
        >
          {m.start_erase()}
        </Button>
        <div className="min-w-[220px] flex-1">
          <Slider
            label={m.bruch_size()}
            min={10}
            max={200}
            value={brushSize}
            onChange={handleSliderChange}
            onStart={handleSliderStart}
          />
        </div>
        <Button
          className="min-w-[132px] justify-center"
          primary={showOriginal}
          icon={<EyeIcon className="w-6 h-6" />}
          onUp={() => {
            setShowOriginal(!showOriginal)
            setTimeout(() => setSeparatorLeft(0), 300)
          }}
        >
          {m.original()}
        </Button>
        {!showOriginal && (
          <Button
            className="min-w-[132px] justify-center"
            onUp={onSuperResolution}
          >
            {m.upscale()}
          </Button>
        )}
        {renders.length > 0 && (
          <Button
            primary
            className="min-w-[132px] justify-center"
            icon={<DownloadIcon className="w-6 h-6" />}
            onClick={download}
          >
            {m.download()}
          </Button>
        )}
      </div>
    </div>
  )
}
