import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Camera, FileUp, Images, LoaderCircle, ShieldCheck } from 'lucide-react'
import type { ReceiptRecord, ReceiptSource } from '../domain/receipt'
import { filesToDocuments, platform } from '../platform'
import { validateReceiptDocuments } from '../platform/browser/baselineDexieAdapter'

interface CapturePanelProps {
  onSaved: (receipt: ReceiptRecord) => void
}

export function CapturePanel({ onSaved }: CapturePanelProps) {
  const cameraInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  async function save(files: File[], source: ReceiptSource) {
    const documents = filesToDocuments(files)
    const issues = validateReceiptDocuments(documents)
    if (issues.length > 0) {
      setError(issues.join(' '))
      return
    }

    setSaving(true)
    setError(undefined)
    try {
      const result = await platform.receipts.capture({ documents, source })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      onSaved(result.value)
      void platform.ocr.start(result.value.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The receipt could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>, source: ReceiptSource) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    void save(files, source)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    void save(Array.from(event.dataTransfer.files), 'files')
  }

  return (
    <section className="capture-panel" aria-labelledby="capture-title">
      <div className="section-heading">
        <span className="eyebrow">Quick capture</span>
        <h2 id="capture-title">Put it somewhere safe.</h2>
        <p>Take the photo now. Add the details when you have a quieter minute.</p>
      </div>

      <div className="capture-actions">
        <button className="capture-action capture-primary" onClick={() => cameraInput.current?.click()} disabled={saving}>
          <span className="capture-icon"><Camera aria-hidden="true" /></span>
          <span><strong>Snap a receipt</strong><small>Use your rear camera</small></span>
        </button>
        <button className="capture-action" onClick={() => fileInput.current?.click()} disabled={saving}>
          <span className="capture-icon"><Images aria-hidden="true" /></span>
          <span><strong>Import a file</strong><small>Images or PDF · up to 15 MB</small></span>
        </button>
      </div>

      <input
        ref={cameraInput}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => onFiles(event, 'camera')}
      />
      <input
        ref={fileInput}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        multiple
        onChange={(event) => onFiles(event, 'files')}
      />

      <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <FileUp aria-hidden="true" />
        <span>Or drop receipt files here</span>
      </div>

      {saving && <div className="inline-message"><LoaderCircle className="spin" aria-hidden="true" /> Saving the original securely…</div>}
      {error && <div className="inline-message error" role="alert">{error}</div>}

      <div className="local-first-note">
        <ShieldCheck aria-hidden="true" />
        <span><strong>Offline-safe by design.</strong> The original is stored on this device before review begins.</span>
      </div>
    </section>
  )
}
