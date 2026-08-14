import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function preventOcrCdnFallback() {
  return {
    name: 'prevent-ocr-cdn-fallback',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.includes('tesseract.js')) return undefined
      return code
        .replaceAll('https://cdn.jsdelivr.net', '/ocr/runtime/blocked-cdn')
        .replaceAll('https://tessdata.projectnaptha.com', '/ocr/runtime/blocked-model-host')
    },
  }
}

export default defineConfig({
  plugins: [
    preventOcrCdnFallback(),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Receipt Collector',
        short_name: 'Receipts',
        description: 'Capture receipts now, review expenses when you are ready.',
        theme_color: '#f7f4ed',
        background_color: '#f7f4ed',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [{ name: 'receipts', accept: ['image/*', 'application/pdf', '.pdf'] }],
          },
        },
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,traineddata,wasm}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        rollupFormat: 'iife',
      },
      devOptions: { enabled: false },
    }),
  ],
})
