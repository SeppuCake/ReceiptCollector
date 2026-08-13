import { createClient } from '@supabase/supabase-js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const AZURE_API_VERSION = '2024-11-30'

interface ProcessRequest {
  receiptId?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

function currencyToMinor(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined
  const amount = (value as { amount?: unknown }).amount
  return typeof amount === 'number' && Number.isFinite(amount) ? Math.round(amount * 100) : undefined
}

function fieldValue(fields: Record<string, { valueString?: string; valueDate?: string }> | undefined, name: string) {
  const field = fields?.[name]
  return field?.valueString ?? field?.valueDate
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405)

  const authorization = request.headers.get('authorization')
  if (!authorization) return json({ error: { code: 'unauthorized', message: 'Authentication is required.' } }, 401)

  let input: ProcessRequest
  try {
    input = await request.json()
  } catch {
    return json({ error: { code: 'invalid_json', message: 'The request body must be JSON.' } }, 400)
  }
  if (!input.receiptId || !UUID_PATTERN.test(input.receiptId)) {
    return json({ error: { code: 'invalid_receipt_id', message: 'A valid receiptId is required.' } }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const azureEndpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT')?.replace(/\/$/, '')
  const azureKey = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY')
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !azureEndpoint || !azureKey) {
    return json({ error: { code: 'server_not_configured', message: 'OCR service configuration is incomplete.' } }, 503)
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
  if (userError || !userData.user) return json({ error: { code: 'unauthorized', message: 'The session is invalid.' } }, 401)

  const { data: receipt } = await supabase.from('receipts').select('id, status').eq('id', input.receiptId).single()
  if (!receipt) return json({ error: { code: 'receipt_not_found', message: 'Receipt was not found.' } }, 404)

  const { data: receiptFile } = await supabase
    .from('receipt_files')
    .select('id, storage_path, mime_type, sha256')
    .eq('receipt_id', receipt.id)
    .order('page_number')
    .limit(1)
    .single()
  if (!receiptFile) return json({ error: { code: 'file_not_found', message: 'Receipt file was not found.' } }, 409)

  const idempotencyKey = `azure:${AZURE_API_VERSION}:${receiptFile.sha256}`
  const { data: existing } = await supabase
    .from('ocr_runs')
    .select('id, status, normalized_result')
    .eq('receipt_id', receipt.id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existing?.status === 'succeeded') return json({ data: existing.normalized_result, reused: true })

  const { data: run, error: runError } = await supabaseAdmin
    .from('ocr_runs')
    .upsert({
      owner_id: userData.user.id,
      receipt_id: receipt.id,
      provider: 'azure-document-intelligence',
      provider_version: AZURE_API_VERSION,
      idempotency_key: idempotencyKey,
      status: 'started',
      started_at: new Date().toISOString(),
    }, { onConflict: 'receipt_id,idempotency_key' })
    .select('id')
    .single()
  if (runError || !run) return json({ error: { code: 'run_not_created', message: 'OCR job could not be recorded.' } }, 500)

  await supabaseAdmin.from('receipts').update({ status: 'processing', failure_reason: null }).eq('id', receipt.id).eq('owner_id', userData.user.id)

  try {
    const { data: file, error: downloadError } = await supabaseAdmin.storage.from('receipts').download(receiptFile.storage_path)
    if (downloadError || !file) throw new Error('The private receipt file could not be downloaded.')

    const analyzeResponse = await fetch(
      `${azureEndpoint}/documentintelligence/documentModels/prebuilt-receipt:analyze?api-version=${AZURE_API_VERSION}`,
      { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': azureKey, 'Content-Type': receiptFile.mime_type }, body: file },
    )
    if (!analyzeResponse.ok) throw new Error(`OCR provider rejected the document (${analyzeResponse.status}).`)
    const operationLocation = analyzeResponse.headers.get('operation-location')
    if (!operationLocation) throw new Error('OCR provider did not return an operation URL.')

    let raw: Record<string, unknown> | undefined
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 750 + attempt * 100))
      const pollResponse = await fetch(operationLocation, { headers: { 'Ocp-Apim-Subscription-Key': azureKey } })
      if (!pollResponse.ok) throw new Error(`OCR status request failed (${pollResponse.status}).`)
      raw = await pollResponse.json()
      if (raw.status === 'succeeded') break
      if (raw.status === 'failed') throw new Error('OCR provider could not read this receipt.')
    }
    if (!raw || raw.status !== 'succeeded') throw new Error('OCR processing timed out and can be retried.')

    const result = raw.analyzeResult as { documents?: Array<{ confidence?: number; fields?: Record<string, { valueString?: string; valueDate?: string; valueCurrency?: unknown; confidence?: number }> }> }
    const document = result.documents?.[0]
    const fields = document?.fields
    const normalized = {
      merchant: fieldValue(fields, 'MerchantName'),
      transactionDate: fieldValue(fields, 'TransactionDate'),
      totalMinor: currencyToMinor(fields?.Total?.valueCurrency),
      taxMinor: currencyToMinor(fields?.TotalTax?.valueCurrency),
      confidence: document?.confidence,
    }

    await supabaseAdmin.from('ocr_runs').update({ status: 'succeeded', normalized_result: normalized, raw_result: raw, completed_at: new Date().toISOString() }).eq('id', run.id)
    await supabaseAdmin.from('receipts').update({
      status: 'needs_review',
      merchant: normalized.merchant,
      transaction_date: normalized.transactionDate,
      total_minor: normalized.totalMinor,
      tax_minor: normalized.taxMinor,
      ocr_confidence: normalized.confidence,
    }).eq('id', receipt.id).eq('owner_id', userData.user.id)
    return json({ data: normalized, reused: false })
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Unknown OCR failure.'
    await supabaseAdmin.from('ocr_runs').update({ status: 'failed', error_code: 'processing_failed', error_message: message, completed_at: new Date().toISOString() }).eq('id', run.id)
    await supabaseAdmin.from('receipts').update({ status: 'failed', failure_reason: message }).eq('id', receipt.id).eq('owner_id', userData.user.id)
    return json({ error: { code: 'processing_failed', message } }, 502)
  }
})
