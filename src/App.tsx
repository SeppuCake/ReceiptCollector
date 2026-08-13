import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Archive,
  Camera,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Download,
  Home,
  Inbox,
  Menu,
  MoreHorizontal,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  WalletCards,
  WifiOff,
  X,
} from 'lucide-react'
import { CapturePanel } from './components/CapturePanel'
import { ReceiptThumbnail } from './components/ReceiptThumbnail'
import { ReviewPanel } from './components/ReviewPanel'
import { StatusPill } from './components/StatusPill'
import { formatMoney } from './domain/money'
import type { ReceiptAsset, ReceiptRecord } from './domain/receipt'
import { createReceipt, db } from './infrastructure/db'
import { downloadCsv } from './services/exportReceipts'
import { consumeSharedFiles } from './services/sharedReceipts'

type View = 'home' | 'inbox' | 'capture' | 'settings'
type InboxFilter = 'all' | 'needs_review' | 'confirmed'

const viewTitles: Record<View, string> = {
  home: 'Overview',
  inbox: 'Receipt inbox',
  capture: 'Add receipt',
  settings: 'Settings & export',
}

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function ReceiptRow({ receipt, asset, onOpen }: { receipt: ReceiptRecord; asset?: ReceiptAsset; onOpen: () => void }) {
  return (
    <button className="receipt-row" onClick={onOpen}>
      <ReceiptThumbnail asset={asset} alt="" className="receipt-thumb" />
      <span className="receipt-row-main">
        <span className="receipt-row-top">
          <strong>{receipt.merchant || 'Unreviewed receipt'}</strong>
          <strong className="receipt-amount">{formatMoney(receipt.totalMinor)}</strong>
        </span>
        <span className="receipt-row-meta">
          <span>{receipt.transactionDate ? new Date(`${receipt.transactionDate}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : 'Date not checked'}</span>
          <span aria-hidden="true">·</span>
          <span>{receipt.fileCount} {receipt.fileCount === 1 ? 'file' : 'files'}</span>
        </span>
        <StatusPill status={receipt.status} />
      </span>
      <ChevronRight className="row-chevron" aria-hidden="true" />
    </button>
  )
}

function EmptyInbox({ onCapture }: { onCapture: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration"><ReceiptText aria-hidden="true" /></div>
      <h3>Your receipt inbox is empty</h3>
      <p>Capture a paper receipt or import a screenshot. We’ll keep it here until you review it.</p>
      <button className="primary-button" onClick={onCapture}><Camera aria-hidden="true" /> Add your first receipt</button>
    </div>
  )
}

export default function App() {
  const receipts = useLiveQuery(() => db.receipts.orderBy('capturedAt').reverse().toArray(), [], [])
  const assets = useLiveQuery(() => db.assets.toArray(), [], [])
  const [view, setView] = useState<View>('home')
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareError, setShareError] = useState<string>()
  const online = useOnlineStatus()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shareId = params.get('shared')
    if (!shareId) return

    window.history.replaceState({}, '', window.location.pathname)
    void consumeSharedFiles(shareId)
      .then(async (files) => {
        if (files.length === 0) throw new Error('The shared receipt could not be recovered.')
        const receipt = await createReceipt(files, 'share')
        setView('inbox')
        setSelectedId(receipt.id)
      })
      .catch((reason: unknown) => setShareError(reason instanceof Error ? reason.message : 'Shared receipt import failed.'))
  }, [])

  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets])
  const selectedReceipt = receipts.find((receipt) => receipt.id === selectedId)
  const reviewCount = receipts.filter((receipt) => receipt.status !== 'confirmed').length
  const currentMonth = monthKey(new Date())
  const monthlyReceipts = receipts.filter((receipt) => receipt.status === 'confirmed' && receipt.transactionDate?.startsWith(currentMonth))
  const monthlyTotal = monthlyReceipts.reduce((total, receipt) => total + (receipt.totalMinor ?? 0), 0)
  const confirmedReceipts = receipts.filter((receipt) => receipt.status === 'confirmed')

  const filteredReceipts = receipts.filter((receipt) => {
    if (filter !== 'all' && receipt.status !== filter) return false
    const needle = search.trim().toLocaleLowerCase()
    return !needle || receipt.merchant?.toLocaleLowerCase().includes(needle) || receipt.category?.toLocaleLowerCase().includes(needle)
  })

  function navigate(nextView: View) {
    setView(nextView)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSaved(receipt: ReceiptRecord) {
    setView('inbox')
    setSelectedId(receipt.id)
  }

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'side-nav open' : 'side-nav'}>
        <div className="brand">
          <span className="brand-mark"><ReceiptText aria-hidden="true" /></span>
          <span><strong>Receipt</strong><small>COLLECTOR</small></span>
        </div>
        <button className="mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
        <nav aria-label="Main navigation">
          <button className={view === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('home')}><Home /> Overview</button>
          <button className={view === 'inbox' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('inbox')}>
            <Inbox /> Receipt inbox {reviewCount > 0 && <span className="nav-count">{reviewCount}</span>}
          </button>
          <button className={view === 'capture' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('capture')}><Camera /> Add receipt</button>
          <button className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('settings')}><Settings /> Settings & export</button>
        </nav>
        <div className="nav-storage-card">
          <Archive aria-hidden="true" />
          <div><strong>Local-first vault</strong><span>{receipts.length} receipts on this device</span></div>
        </div>
      </aside>
      {menuOpen && <button className="menu-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
          <div><span className="topbar-kicker">Receipt Collector</span><h1>{viewTitles[view]}</h1></div>
          <div className="topbar-status">
            {!online && <span className="offline-pill"><WifiOff aria-hidden="true" /> Offline</span>}
            <span className="avatar" aria-label="Personal account">H</span>
          </div>
        </header>

        {shareError && <div className="page-alert" role="alert">{shareError}<button onClick={() => setShareError(undefined)} aria-label="Dismiss"><X /></button></div>}

        {view === 'home' && (
          <div className="page-stack">
            <section className="hero-card">
              <div className="hero-copy">
                <span className="eyebrow light">Your month at a glance</span>
                <h2>{new Date().toLocaleDateString('en-MY', { month: 'long' })} is under control.</h2>
                <p>{reviewCount === 0 ? 'Every receipt in your inbox has been reviewed. Nicely done.' : `${reviewCount} ${reviewCount === 1 ? 'receipt is' : 'receipts are'} waiting for a quick check.`}</p>
                <button className="hero-button" onClick={() => navigate(reviewCount > 0 ? 'inbox' : 'capture')}>
                  {reviewCount > 0 ? 'Review inbox' : 'Add a receipt'} <ChevronRight aria-hidden="true" />
                </button>
              </div>
              <div className="hero-total"><span>Confirmed spending</span><strong>{formatMoney(monthlyTotal)}</strong><small>{monthlyReceipts.length} expenses this month</small></div>
            </section>

            <section className="metrics-grid" aria-label="Receipt summary">
              <article className="metric-card"><span className="metric-icon amber"><Inbox /></span><div><span>Needs review</span><strong>{reviewCount}</strong></div></article>
              <article className="metric-card"><span className="metric-icon green"><CheckCircle2 /></span><div><span>Confirmed</span><strong>{confirmedReceipts.length}</strong></div></article>
              <article className="metric-card"><span className="metric-icon coral"><WalletCards /></span><div><span>This month</span><strong>{formatMoney(monthlyTotal)}</strong></div></article>
            </section>

            <div className="dashboard-grid">
              <section className="content-card recent-card">
                <div className="card-heading"><div><span className="eyebrow">Latest activity</span><h2>Recent receipts</h2></div><button className="text-button" onClick={() => navigate('inbox')}>View all <ChevronRight /></button></div>
                {receipts.length === 0 ? <EmptyInbox onCapture={() => navigate('capture')} /> : (
                  <div className="receipt-list">{receipts.slice(0, 5).map((receipt) => <ReceiptRow key={receipt.id} receipt={receipt} asset={assetById.get(receipt.primaryFileId)} onOpen={() => setSelectedId(receipt.id)} />)}</div>
                )}
              </section>
              <aside className="content-card routine-card">
                <span className="routine-icon"><Sparkles aria-hidden="true" /></span>
                <span className="eyebrow">Tiny habit, tidy month</span>
                <h2>Your two-minute receipt ritual</h2>
                <ol><li><span>1</span>Snap it before it reaches your pocket.</li><li><span>2</span>Review the red badge over coffee.</li><li><span>3</span>Export once the inbox reaches zero.</li></ol>
              </aside>
            </div>
          </div>
        )}

        {view === 'capture' && <div className="narrow-page"><CapturePanel onSaved={handleSaved} /></div>}

        {view === 'inbox' && (
          <section className="content-card inbox-card">
            <div className="inbox-toolbar">
              <div className="filter-tabs" role="group" aria-label="Filter receipts">
                {(['all', 'needs_review', 'confirmed'] as InboxFilter[]).map((item) => (
                  <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : item === 'needs_review' ? 'Needs review' : 'Confirmed'}</button>
                ))}
              </div>
              <label className="search-box"><Search aria-hidden="true" /><span className="visually-hidden">Search receipts</span><input placeholder="Search merchant or category" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <button className="primary-button compact" onClick={() => navigate('capture')}><Camera /> Add receipt</button>
            </div>
            {filteredReceipts.length === 0 ? <EmptyInbox onCapture={() => navigate('capture')} /> : (
              <div className="receipt-list inbox-list">{filteredReceipts.map((receipt) => <ReceiptRow key={receipt.id} receipt={receipt} asset={assetById.get(receipt.primaryFileId)} onOpen={() => setSelectedId(receipt.id)} />)}</div>
            )}
          </section>
        )}

        {view === 'settings' && (
          <div className="settings-grid">
            <section className="content-card settings-card">
              <span className="eyebrow">Monthly handoff</span><h2>Export confirmed expenses</h2>
              <p>Download a spreadsheet-friendly CSV containing only receipts you have confirmed. Images remain on this device.</p>
              <button className="primary-button" disabled={confirmedReceipts.length === 0} onClick={() => downloadCsv(confirmedReceipts)}><Download /> Export {confirmedReceipts.length} confirmed receipts</button>
            </section>
            <section className="content-card settings-card">
              <span className="eyebrow">Cloud connection</span><h2>Local-only mode</h2>
              <p><CloudOff className="inline-icon" /> Supabase is not configured yet. Your receipts currently live only in this browser profile and are not available on another device.</p>
              <div className="configuration-note">Add deployment credentials only after the hosting and privacy choices are confirmed.</div>
            </section>
            <section className="content-card settings-card full-width">
              <span className="eyebrow">Defaults</span><h2>Current product assumptions</h2>
              <dl className="assumption-list"><div><dt>Currency</dt><dd>Malaysian Ringgit (MYR)</dd></div><div><dt>Timezone</dt><dd>Asia/Kuala_Lumpur</dd></div><div><dt>Owner</dt><dd>Single-user personal ledger</dd></div><div><dt>Review policy</dt><dd>Human confirmation required</dd></div></dl>
            </section>
          </div>
        )}
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}><Home /><span>Home</span></button>
        <button className={view === 'inbox' ? 'active' : ''} onClick={() => navigate('inbox')}><Inbox />{reviewCount > 0 && <i>{reviewCount}</i>}<span>Inbox</span></button>
        <button className="mobile-capture" onClick={() => navigate('capture')}><Camera /><span>Add</span></button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}><Settings /><span>Settings</span></button>
        <button onClick={() => setMenuOpen(true)}><MoreHorizontal /><span>More</span></button>
      </nav>

      {selectedReceipt && <ReviewPanel key={selectedReceipt.id} receipt={selectedReceipt} onClose={() => setSelectedId(undefined)} onDeleted={() => setSelectedId(undefined)} />}
    </div>
  )
}
