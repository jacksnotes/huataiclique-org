/// <reference types="vite/client" />

declare const ort: any

interface Navigator {
  gpu?: {
    requestAdapter: () => Promise<unknown | null>
  }
}
