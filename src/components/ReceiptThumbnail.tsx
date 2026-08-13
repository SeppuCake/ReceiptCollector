import { useEffect, useMemo } from 'react'
import { FileText } from 'lucide-react'
import type { ReceiptAsset } from '../domain/receipt'

interface ReceiptThumbnailProps {
  asset?: ReceiptAsset
  alt: string
  className?: string
}

export function ReceiptThumbnail({ asset, alt, className = '' }: ReceiptThumbnailProps) {
  const url = useMemo(
    () => (asset?.mimeType.startsWith('image/') ? URL.createObjectURL(asset.blob) : undefined),
    [asset],
  )

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  if (url) return <img className={className} src={url} alt={alt} />

  return (
    <div className={`${className} file-placeholder`} aria-label={alt}>
      <FileText aria-hidden="true" />
      <span>{asset?.mimeType === 'application/pdf' ? 'PDF' : 'Receipt'}</span>
    </div>
  )
}
