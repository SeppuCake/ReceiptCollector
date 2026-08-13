/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return

  event.respondWith(
    (async () => {
      const formData = await event.request.formData()
      const sharedFiles = formData.getAll('receipts').filter((entry): entry is File => entry instanceof File)
      const shareId = crypto.randomUUID()
      const cache = await caches.open('receipt-shares-v1')
      const manifest = {
        id: shareId,
        files: sharedFiles.map((file, index) => ({
          key: `/__shared/${shareId}/${index}`,
          name: file.name,
          type: file.type,
        })),
      }

      await Promise.all([
        cache.put(`/__shared/${shareId}/manifest`, new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } })),
        ...sharedFiles.map((file, index) => cache.put(`/__shared/${shareId}/${index}`, new Response(file))),
      ])
      return Response.redirect(`/?shared=${encodeURIComponent(shareId)}`, 303)
    })(),
  )
})

