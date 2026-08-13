interface SharedManifest {
  id: string
  files: Array<{ key: string; name: string; type: string }>
}

export async function consumeSharedFiles(shareId: string): Promise<File[]> {
  const cache = await caches.open('receipt-shares-v1')
  const manifestResponse = await cache.match(`/__shared/${shareId}/manifest`)
  if (!manifestResponse) return []

  const manifest = (await manifestResponse.json()) as SharedManifest
  const files: File[] = []
  for (const item of manifest.files) {
    const response = await cache.match(item.key)
    if (response) files.push(new File([await response.blob()], item.name, { type: item.type }))
  }

  await Promise.all([
    cache.delete(`/__shared/${shareId}/manifest`),
    ...manifest.files.map((item) => cache.delete(item.key)),
  ])
  return files
}

