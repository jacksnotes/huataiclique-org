/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/control-has-associated-label */
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  InformationCircleIcon,
} from '@heroicons/react/outline'
import { useEffect, useRef, useState } from 'react'
import { useClickAway } from 'react-use'
import { downloadModel } from './adapters/cache'
import Button from './components/Button'
import FileSelect from './components/FileSelect'
import Modal from './components/Modal'
import NativeAd from './components/NativeAd'
import Progress from './components/Progress'
import Editor from './Editor'
import * as m from './paraglide/messages'
import {
  languageTag,
  onSetLanguageTag,
  setLanguageTag,
} from './paraglide/runtime'
import { resizeImageFile } from './utils'

const SOURCE_REPO_URL = 'https://github.com/lxfater/inpaint-web'
const PUBLIC_REPO_URL =
  'https://github.com/jacksnotes/Remove-Images-Watermarks.git'
const isEmbedMode =
  typeof window !== 'undefined' &&
  /\/embed\.html$/i.test(window.location.pathname)

function App() {
  const [file, setFile] = useState<File>()
  const [, setStateLanguageTag] = useState<'en' | 'zh'>('zh')

  onSetLanguageTag(() => setStateLanguageTag(languageTag()))

  const [showAbout, setShowAbout] = useState(false)
  const modalRef = useRef(null)
  const [downloadProgress, setDownloadProgress] = useState(100)

  useEffect(() => {
    downloadModel('inpaint', setDownloadProgress)
  }, [])

  useClickAway(modalRef, () => {
    setShowAbout(false)
  })

  async function startWithDemoImage(img: string) {
    const imgBlob = await fetch(`/examples/${img}.jpeg`).then(r => r.blob())
    setFile(new File([imgBlob], `${img}.jpeg`, { type: 'image/jpeg' }))
  }

  function toggleLanguage() {
    if (languageTag() === 'zh') {
      setLanguageTag('en')
    } else {
      setLanguageTag('zh')
    }
  }

  const isZh = languageTag() === 'zh'
  const pageCopy = isZh
    ? {
        brandSubtitle: '图片修复工具 / Erase',
        infoButton: '说明',
        eyebrow: 'Browser-only image cleanup',
        title: '图片水印消除工具',
        description:
          '上传图片后，用画笔标记需要移除的区域，浏览器会在本地完成修复处理。适合去水印、移除小物体和清理杂点。',
        features: [
          {
            title: '本地处理',
            detail: '图片和标记区域都在浏览器中处理，不需要上传到服务端。',
          },
          {
            title: '直接可用',
            detail: '打开网页即可使用，适合快速处理单张图片和常见素材图。',
          },
          {
            title: '结果可下载',
            detail: '修复完成后可直接预览、继续编辑并下载结果图片。',
          },
        ],
        noticeEyebrow: 'Notice',
        noticeTitle: '工具说明',
        noticeBody:
          '本工具基于开源项目改造并继续公开发布，用于浏览器端图片修复与水印消除。',
        publicRepo: '查看源码仓库',
        sourceRepo: '查看项目出处',
        copyrightTitle: '版权与出处',
        copyrightBody:
          'Modified from inpaint-web (GPL-3.0). 使用时请同时保留原项目署名、许可证和源码公开地址。',
        aboutTitle: '关于本工具',
        aboutBody:
          '这是一个面向公开访问的在线图片修复工具，支持在浏览器中标记并移除图片中的水印、文字或不需要的物体。',
        aboutRepoLabel: '源码仓库',
        aboutSourceLabel: '项目出处',
        aboutFooter:
          '本项目公开仓库和上游出处都已在此页展示，便于用户查看源码、许可证和版权说明。',
        promoButton: '今日优惠',
      }
    : {
        brandSubtitle: 'Image Cleanup Tool / Erase',
        infoButton: 'About',
        eyebrow: 'Browser-only image cleanup',
        title: 'Remove Image Watermarks',
        description:
          'Upload an image, paint over the area you want to remove, and let the browser repair it locally. Useful for watermark removal, small object cleanup, and spot fixing.',
        features: [
          {
            title: 'Local Processing',
            detail:
              'Images and mask regions are processed in the browser without sending them to a server.',
          },
          {
            title: 'Ready to Use',
            detail:
              'Open the page and start editing right away for common image cleanup tasks.',
          },
          {
            title: 'Download Results',
            detail:
              'Preview the repaired result, continue editing, and download the final image.',
          },
        ],
        noticeEyebrow: 'Notice',
        noticeTitle: 'Tool Info',
        noticeBody:
          'This tool is adapted from an open-source project and republished for browser-based image cleanup.',
        publicRepo: 'View Source Repo',
        sourceRepo: 'View Upstream Project',
        copyrightTitle: 'Copyright & Source',
        copyrightBody:
          'Modified from inpaint-web (GPL-3.0). Please keep the original attribution, license, and source code reference when redistributing it.',
        aboutTitle: 'About This Tool',
        aboutBody:
          'This is a public-facing online image cleanup tool for removing watermarks, text, and unwanted objects directly in the browser.',
        aboutRepoLabel: 'Source Repository',
        aboutSourceLabel: 'Upstream Project',
        aboutFooter:
          'Both the public repository and the upstream source are listed here so users can review the code, license, and attribution.',
        promoButton: 'Special Offer',
      }

  const uploadArea = (
    <>
      <div className="h-[22rem] max-w-5xl sm:h-80">
        <FileSelect
          onSelection={async f => {
            const { file: resizedFile } = await resizeImageFile(f, 1024 * 4)
            setFile(resizedFile)
          }}
        />
      </div>

      <div className="mt-8 flex flex-col items-start gap-4 lg:flex-row lg:items-center">
        <span className="text-sm text-slate-400">{m.try_it_images()}</span>
        <div className="flex flex-wrap gap-3">
          {['bag', 'dog', 'car', 'bird', 'jacket', 'shoe'].map(image => (
            <div
              key={image}
              onClick={() => startWithDemoImage(image)}
              role="button"
              onKeyDown={() => startWithDemoImage(image)}
              tabIndex={-1}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >
              <img
                className="h-24 w-auto transition duration-200 hover:opacity-80"
                src={`examples/${image}.jpeg`}
                alt={image}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )

  const headerControls = (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        className={[
          file ? '' : 'opacity-50 pointer-events-none',
          'border border-white/10 bg-white/5 text-white hover:bg-white/10',
        ].join(' ')}
        icon={<ArrowLeftIcon className="w-5 h-5" />}
        onClick={() => {
          setFile(undefined)
        }}
      >
        <span>{m.start_new()}</span>
      </Button>
      <Button
        className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
        onClick={toggleLanguage}
      >
        <p>{languageTag() === 'en' ? '切换到中文' : 'EN'}</p>
      </Button>
      {!isEmbedMode && (
        <Button
          className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
          icon={<InformationCircleIcon className="w-5 h-5" />}
          onClick={() => {
            setShowAbout(true)
          }}
        >
          <p>{pageCopy.infoButton}</p>
        </Button>
      )}
    </div>
  )

  let mainContent: JSX.Element

  if (isEmbedMode) {
    mainContent = file ? (
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-3 sm:px-4">
        <div className="mb-3 flex justify-end">{headerControls}</div>
        <div className="flex-1">
          <Editor file={file} />
        </div>
      </div>
    ) : (
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-3 py-6 sm:px-4">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 sm:p-6">
          {uploadArea}
        </section>
      </div>
    )
  } else if (file) {
    mainContent = (
      <div className="mx-auto h-full max-w-7xl px-3 py-4 sm:px-6">
        <Editor file={file} />
      </div>
    )
  } else {
    mainContent = (
      <div className="mx-auto flex min-h-full max-w-[90rem] items-start justify-center gap-6 px-3 py-8 sm:px-6 lg:py-10">
        <div className="hidden xl:block w-[160px] flex-shrink-0 sticky top-20">
          <NativeAd />
        </div>
        <div className="flex-1 max-w-7xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-300">
                {pageCopy.eyebrow}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                {pageCopy.title}
              </h1>
              <p className="text-base leading-7 text-slate-300 sm:text-lg">
                {pageCopy.description}
              </p>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              {pageCopy.features.map(feature => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-semibold text-white">{feature.title}</p>
                  <p className="mt-2 leading-6">{feature.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">{uploadArea}</div>
          </section>

          <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300 shadow-2xl shadow-black/20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">
                {pageCopy.noticeEyebrow}
              </p>
              <h2 className="mt-2 text-xl font-bold text-white">
                {pageCopy.noticeTitle}
              </h2>
            </div>
            <p className="leading-6">{pageCopy.noticeBody}</p>
            <a
              href={PUBLIC_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-teal-400/30 bg-teal-400/10 px-4 py-3 font-semibold text-teal-200 transition hover:bg-teal-400/20"
            >
              <ExternalLinkIcon className="h-5 w-5" />
              {pageCopy.publicRepo}
            </a>
            <a
              href={SOURCE_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <ExternalLinkIcon className="h-5 w-5" />
              {pageCopy.sourceRepo}
            </a>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
              <p className="font-semibold">{pageCopy.copyrightTitle}</p>
              <p className="mt-2 leading-6">{pageCopy.copyrightBody}</p>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      {!isEmbedMode && (
        <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/15 text-lg font-black text-teal-300">
                V
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-300">
                  RemoverWatermark
                </p>
                <p className="text-sm font-semibold text-white">
                  {pageCopy.brandSubtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://performanceingredientgoblet.com/yhhz9hkvvb?key=ab98f6f10df9871f4b655bba90468e15"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md hover:from-amber-400 hover:to-orange-400 transition"
              >
                {pageCopy.promoButton}
              </a>
              <div className="hidden md:flex">{headerControls}</div>
            </div>
          </div>
        </header>
      )}

      <main
        style={{
          minHeight: isEmbedMode ? '100vh' : 'calc(100vh - 64px)',
        }}
        className="relative"
      >
        {mainContent}
      </main>

      {!isEmbedMode && showAbout && (
        <Modal>
          <div
            ref={modalRef}
            className="w-[min(90vw,42rem)] space-y-4 rounded-3xl border border-white/10 bg-slate-900 p-6 text-base text-slate-200 shadow-2xl shadow-black/40"
          >
            <p className="text-xl font-bold text-white">
              {pageCopy.aboutTitle}
            </p>
            <p className="leading-7">{pageCopy.aboutBody}</p>
            <p className="leading-7">
              {pageCopy.aboutRepoLabel}:
              <a
                href={PUBLIC_REPO_URL}
                className="ml-2 font-semibold text-teal-300 underline underline-offset-4"
                rel="noreferrer"
                target="_blank"
              >
                Remove-Images-Watermarks
              </a>
            </p>
            <p className="leading-7">
              {pageCopy.aboutSourceLabel}:
              <a
                href={SOURCE_REPO_URL}
                className="ml-2 font-semibold text-teal-300 underline underline-offset-4"
                rel="noreferrer"
                target="_blank"
              >
                Inpaint-web
              </a>
            </p>
            <p>{pageCopy.aboutFooter}</p>
          </div>
        </Modal>
      )}

      {downloadProgress !== 100 && (
        <Modal>
          <div className="text-xl space-y-5">
            <p>{m.inpaint_model_download_message()}</p>
            <Progress percent={downloadProgress} />
          </div>
        </Modal>
      )}
    </div>
  )
}

export default App
