import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, Clock3, Trash2, X } from 'lucide-react'
import { categories, paymentMethods, receiptReviewSchema, type ReceiptRecord, type ReceiptReviewInput } from '../domain/receipt'
import { minorToInput, parseMoneyToMinor } from '../domain/money'
import { db, deleteReceipt } from '../infrastructure/db'
import { ReceiptThumbnail } from './ReceiptThumbnail'

interface ReviewPanelProps {
  receipt: ReceiptRecord
  onClose: () => void
  onDeleted: () => void
}

type FieldErrors = Partial<Record<keyof ReceiptReviewInput, string>>

function initialValues(receipt: ReceiptRecord): ReceiptReviewInput {
  return {
    merchant: receipt.merchant ?? '',
    transactionDate: receipt.transactionDate ?? new Date().toISOString().slice(0, 10),
    total: minorToInput(receipt.totalMinor),
    tax: minorToInput(receipt.taxMinor),
    category: receipt.category ?? '',
    paymentMethod: receipt.paymentMethod ?? '',
    notes: receipt.notes ?? '',
  }
}

export function ReviewPanel({ receipt, onClose, onDeleted }: ReviewPanelProps) {
  const assets = useLiveQuery(() => db.assets.where('receiptId').equals(receipt.id).toArray(), [receipt.id], [])
  const [selectedAssetId, setSelectedAssetId] = useState(receipt.primaryFileId)
  const [values, setValues] = useState<ReceiptReviewInput>(() => initialValues(receipt))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  function setField<K extends keyof ReceiptReviewInput>(field: K, value: ReceiptReviewInput[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = receiptReviewSchema.safeParse(values)
    if (!result.success) {
      const nextErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ReceiptReviewInput
        nextErrors[field] ??= issue.message
      }
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      await db.receipts.update(receipt.id, {
        merchant: result.data.merchant,
        transactionDate: result.data.transactionDate,
        totalMinor: parseMoneyToMinor(result.data.total),
        taxMinor: result.data.tax ? parseMoneyToMinor(result.data.tax) : undefined,
        category: result.data.category,
        paymentMethod: result.data.paymentMethod,
        notes: result.data.notes || undefined,
        status: 'confirmed',
        syncState: 'local',
        updatedAt: new Date().toISOString(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this receipt and every locally stored copy of its files? This cannot be undone.')) return
    await deleteReceipt(receipt.id)
    onDeleted()
  }

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0]

  return (
    <div className="review-layer" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <button className="review-scrim" aria-label="Close receipt review" onClick={onClose} />
      <section className="review-panel">
        <header className="review-header">
          <button className="icon-button mobile-back" onClick={onClose} aria-label="Back to inbox"><ChevronLeft /></button>
          <div>
            <span className="eyebrow">Receipt review</span>
            <h2 id="review-title">Check the important bits</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X /></button>
        </header>

        <div className="review-body">
          <div className="receipt-preview-column">
            <div className="receipt-preview">
              <ReceiptThumbnail asset={selectedAsset} alt={`Preview of ${selectedAsset?.name ?? 'receipt'}`} className="preview-image" />
            </div>
            {assets.length > 1 && (
              <div className="asset-strip" aria-label="Receipt pages">
                {assets.map((asset, index) => (
                  <button
                    key={asset.id}
                    className={asset.id === selectedAsset?.id ? 'asset-button active' : 'asset-button'}
                    onClick={() => setSelectedAssetId(asset.id)}
                    aria-label={`View receipt page ${index + 1}`}
                  >
                    <ReceiptThumbnail asset={asset} alt="" />
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="capture-time"><Clock3 aria-hidden="true" /> Captured {new Date(receipt.capturedAt).toLocaleString('en-MY')}</p>
          </div>

          <form className="review-form" onSubmit={submit} noValidate>
            <div className="field full-field">
              <label htmlFor="merchant">Merchant</label>
              <input id="merchant" value={values.merchant} onChange={(event) => setField('merchant', event.target.value)} aria-invalid={Boolean(errors.merchant)} />
              {errors.merchant && <small className="field-error">{errors.merchant}</small>}
            </div>

            <div className="form-row">
              <div className="field">
                <label htmlFor="date">Purchase date</label>
                <input id="date" type="date" value={values.transactionDate} onChange={(event) => setField('transactionDate', event.target.value)} aria-invalid={Boolean(errors.transactionDate)} />
                {errors.transactionDate && <small className="field-error">{errors.transactionDate}</small>}
              </div>
              <div className="field money-field">
                <label htmlFor="total">Total</label>
                <span className="input-prefix">RM</span>
                <input id="total" inputMode="decimal" placeholder="0.00" value={values.total} onChange={(event) => setField('total', event.target.value)} aria-invalid={Boolean(errors.total)} />
                {errors.total && <small className="field-error">{errors.total}</small>}
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label htmlFor="category">Category</label>
                <select id="category" value={values.category} onChange={(event) => setField('category', event.target.value)} aria-invalid={Boolean(errors.category)}>
                  <option value="">Choose category</option>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
                {errors.category && <small className="field-error">{errors.category}</small>}
              </div>
              <div className="field">
                <label htmlFor="payment">Paid with</label>
                <select id="payment" value={values.paymentMethod} onChange={(event) => setField('paymentMethod', event.target.value)} aria-invalid={Boolean(errors.paymentMethod)}>
                  <option value="">Choose payment method</option>
                  {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                </select>
                {errors.paymentMethod && <small className="field-error">{errors.paymentMethod}</small>}
              </div>
            </div>

            <div className="field full-field">
              <label htmlFor="tax">Tax <span className="optional">Optional</span></label>
              <input id="tax" inputMode="decimal" placeholder="0.00" value={values.tax} onChange={(event) => setField('tax', event.target.value)} aria-invalid={Boolean(errors.tax)} />
              {errors.tax && <small className="field-error">{errors.tax}</small>}
            </div>

            <div className="field full-field">
              <label htmlFor="notes">Notes <span className="optional">Optional</span></label>
              <textarea id="notes" rows={3} value={values.notes} onChange={(event) => setField('notes', event.target.value)} />
              <small className="character-count">{values.notes.length}/1000</small>
            </div>

            <div className="review-actions">
              <button type="button" className="danger-button" onClick={() => void remove()}><Trash2 aria-hidden="true" /> Delete</button>
              <button type="submit" className="primary-button" disabled={saving}><Check aria-hidden="true" /> {saving ? 'Saving…' : 'Confirm expense'}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
