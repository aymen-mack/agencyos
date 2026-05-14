'use client'

import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import { PIPELINE_STAGES } from '@/lib/pipeline'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { Upload, FileText, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CsvImportSheetProps {
  open: boolean
  onClose: () => void
  projectId: string
  onImported: (count: number) => void
}

type Step = 'upload' | 'map' | 'importing' | 'done'

// Lead fields available for CSV column mapping.
// Fields prefixed with "survey:" are stored in the lead's survey_data JSON column.
const LEAD_FIELDS = [
  { value: '__skip__',                label: "Don't import",                  group: 'skip'   },
  { value: 'email',                   label: 'Email (required)',               group: 'lead'   },
  { value: 'full_name',               label: 'Full Name',                      group: 'lead'   },
  { value: 'phone',                   label: 'Phone',                          group: 'lead'   },
  { value: 'source',                  label: 'Source',                         group: 'lead'   },
  { value: 'campaign',                label: 'Campaign',                       group: 'lead'   },
  { value: 'tags',                    label: 'Tags (comma-separated)',          group: 'lead'   },
  { value: 'purchase_amount',         label: 'Purchase Amount',                group: 'lead'   },
  { value: 'survey:age',              label: 'Survey: Age',                    group: 'survey' },
  { value: 'survey:occupation',       label: 'Survey: Occupation',             group: 'survey' },
  { value: 'survey:income',           label: 'Survey: Monthly Income',         group: 'survey' },
  { value: 'survey:sophistication',   label: 'Survey: Level of Sophistication',group: 'survey' },
  { value: 'survey:challenges',       label: 'Survey: Current Challenges',     group: 'survey' },
  { value: 'survey:previous_investment', label: 'Survey: Previous Investment', group: 'survey' },
  { value: 'survey:speed_to_action',  label: 'Survey: Speed to Action',        group: 'survey' },
]

function guessMapping(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (['email', 'emailaddress', 'mail'].includes(h)) return 'email'
  if (['name', 'fullname', 'full_name', 'firstname', 'lastname'].includes(h)) return 'full_name'
  if (['phone', 'phonenumber', 'mobile', 'cell'].includes(h)) return 'phone'
  if (['source', 'leadsource', 'origin'].includes(h)) return 'source'
  if (['campaign', 'campaignname', 'utm_campaign'].includes(h)) return 'campaign'
  if (['tags', 'tag', 'labels'].includes(h)) return 'tags'
  if (['amount', 'purchaseamount', 'revenue', 'price', 'value'].includes(h)) return 'purchase_amount'
  // Survey fields
  if (['age', 'agerange', 'howold'].includes(h)) return 'survey:age'
  if (['occupation', 'job', 'jobtitle', 'profession', 'career'].includes(h)) return 'survey:occupation'
  if (['income', 'monthlyincome', 'salary', 'earnings'].includes(h)) return 'survey:income'
  if (['sophistication', 'experience', 'howlong', 'level'].includes(h)) return 'survey:sophistication'
  if (['challenges', 'struggle', 'painpoints', 'problems'].includes(h)) return 'survey:challenges'
  if (['previousinvestment', 'invested', 'selfeducation', 'coaching'].includes(h)) return 'survey:previous_investment'
  if (['speedtoaction', 'action', 'timeline', 'urgency', 'howsoon'].includes(h)) return 'survey:speed_to_action'
  return '__skip__'
}

export function CsvImportSheet({ open, onClose, projectId, onImported }: CsvImportSheetProps) {
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [allRows, setAllRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [defaultStatus, setDefaultStatus] = useState('survey_filled')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('upload')
    setHeaders([])
    setPreview([])
    setAllRows([])
    setMapping({})
    setDefaultStatus('survey_filled')
    setFileName('')
    setResult(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function parseFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data
        if (!rows.length) { toast.error('CSV is empty'); return }
        const hdrs = Object.keys(rows[0])
        const autoMap: Record<string, string> = {}
        for (const h of hdrs) autoMap[h] = guessMapping(h)
        setHeaders(hdrs)
        setMapping(autoMap)
        setPreview(rows.slice(0, 3))
        setAllRows(rows)
        setStep('map')
      },
      error: () => toast.error('Failed to parse CSV'),
    })
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const emailMapped = Object.values(mapping).includes('email')

  // Check for duplicate field mappings (except __skip__)
  function isDuplicate(header: string) {
    const v = mapping[header]
    if (v === '__skip__') return false
    return Object.entries(mapping).some(([h, val]) => h !== header && val === v)
  }

  async function handleImport() {
    if (!emailMapped) { toast.error('You must map a column to Email'); return }

    setStep('importing')

    // Build rows using the field mapping.
    // Fields mapped to "survey:xxx" are collected into a survey_data sub-object.
    const rows = allRows.map((row) => {
      const out: Record<string, string | boolean | Record<string, string>> = { status: defaultStatus }
      const survey_data: Record<string, string> = {}
      for (const [csvCol, leadField] of Object.entries(mapping)) {
        if (leadField === '__skip__') continue
        const val = row[csvCol]?.trim() ?? ''
        if (!val) continue
        if (leadField.startsWith('survey:')) {
          survey_data[leadField.slice(7)] = val  // e.g. "survey:age" → survey_data.age
        } else {
          out[leadField] = val
        }
      }
      if (Object.keys(survey_data).length > 0) out.survey_data = survey_data
      if (defaultStatus === 'registrant') out.is_registrant = true
      return out
    })

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, rows, defaultStatus }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Import failed'); setStep('map'); return }
      setResult(data)
      setStep('done')
      onImported(data.imported)
    } catch {
      toast.error('Import failed')
      setStep('map')
    }
  }

  const setMapField = useCallback((header: string, value: string) => {
    setMapping((prev) => ({ ...prev, [header]: value }))
  }, [])

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-[520px] sm:w-[560px] flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {step === 'upload' && 'Import CSV'}
            {step === 'map' && `Map Fields — ${fileName}`}
            {step === 'importing' && 'Importing…'}
            {step === 'done' && 'Import Complete'}
          </SheetTitle>
        </SheetHeader>

        {/* Step indicator */}
        {(step === 'upload' || step === 'map') && (
          <div className="flex items-center gap-1.5 mt-2 mb-4">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>1 Upload</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', step === 'map' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>2 Map Fields</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">3 Import</span>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="flex-1 flex flex-col gap-4">
            <div
              className={cn(
                'flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors min-h-[220px]',
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Drop your CSV here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileInput} />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Expected columns (any order):</p>
              <p>email, full_name, phone, source, campaign, tags, purchase_amount</p>
              <p>Only <span className="font-medium text-foreground">email</span> is required. Existing leads with the same email will be updated.</p>
            </div>
          </div>
        )}

        {/* STEP 2: Map fields */}
        {step === 'map' && (
          <div className="flex-1 flex flex-col min-h-0 gap-3">
            {/* PINNED TOP: Default status selector */}
            <div className="flex-shrink-0 flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <p className="text-sm font-medium">Pipeline Stage for all rows</p>
                <p className="text-xs text-muted-foreground">Every imported lead will be set to this stage</p>
              </div>
              <Select value={defaultStatus} onValueChange={(v) => v && setDefaultStatus(v)}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SCROLLABLE MIDDLE: Column mappings + preview */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
              {/* Column mappings */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Map CSV columns to lead fields</p>
                <div className="space-y-1.5">
                  {headers.map((header) => (
                    <div key={header} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-mono bg-muted rounded px-2 py-1">{header}</p>
                        {preview[0]?.[header] && (
                          <p className="text-xs text-muted-foreground truncate px-1 mt-0.5">{preview[0][header]}</p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <Select
                        value={mapping[header] ?? '__skip__'}
                        onValueChange={(v) => setMapField(header, v ?? '__skip__')}
                      >
                        <SelectTrigger className={cn('w-44 h-8 text-sm', isDuplicate(header) && 'border-destructive')}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_FIELDS.filter((f) => f.group !== 'survey').map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-t border-border mt-1">
                            Survey Fields
                          </div>
                          {LEAD_FIELDS.filter((f) => f.group === 'survey').map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <p className="text-xs font-medium px-3 py-2 border-b border-border bg-muted/30">Preview (first {preview.length} rows)</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="border-b border-border">
                          {headers.filter((h) => mapping[h] !== '__skip__').map((h) => (
                            <th key={h} className="px-3 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{mapping[h]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            {headers.filter((h) => mapping[h] !== '__skip__').map((h) => (
                              <td key={h} className="px-3 py-1.5 text-muted-foreground max-w-[160px] truncate">{row[h] || '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* PINNED BOTTOM: Error + buttons */}
            <div className="flex-shrink-0 flex flex-col gap-2 pt-1 pb-2">
              {!emailMapped && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Map a column to <span className="font-medium">Email</span> to continue
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={!emailMapped} className="flex-1">
                  Import {allRows.length.toLocaleString()} leads
                </Button>
                <Button variant="outline" onClick={reset}>Back</Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Importing */}
        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Importing {allRows.length.toLocaleString()} leads…</p>
            <p className="text-xs text-muted-foreground">This may take a moment for large files</p>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === 'done' && result && (
          <div className="flex-1 flex flex-col gap-4 pt-2">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{result.imported.toLocaleString()} leads imported</p>
                {result.skipped > 0 && (
                  <p className="text-xs text-muted-foreground">{result.skipped} rows skipped (missing or invalid email)</p>
                )}
              </div>
            </div>

            {result.errors.filter((e) => !e.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)).length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                  <p className="text-xs font-medium text-destructive">Errors</p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                  {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                  {result.errors.length > 10 && <li>…and {result.errors.length - 10} more</li>}
                </ul>
              </div>
            )}

            <div className="flex gap-2 mt-auto">
              <Button className="flex-1" onClick={handleClose}>Done</Button>
              <Button variant="outline" onClick={reset}>Import Another</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
