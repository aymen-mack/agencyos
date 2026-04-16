'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import { Mark } from '@tiptap/core'
import { useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon,
  Heading1, Heading2, Heading3,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  MessageSquare, Check, X, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Comment mark command types ───────────────────────────────────────────────
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentMark: {
      setComment: (commentId: string) => ReturnType
      unsetComment: (commentId: string) => ReturnType
    }
  }
}

// ─── Comment mark ─────────────────────────────────────────────────────────────
const CommentMark = Mark.create({
  name: 'commentMark',
  addAttributes() {
    return {
      commentId: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: 'mark[data-comment-id]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      {
        'data-comment-id': HTMLAttributes.commentId,
        style: 'background-color: #fef9c3; border-bottom: 2px solid #f59e0b; cursor: pointer;',
      },
      0,
    ]
  },
  addCommands() {
    return {
      setComment: (commentId: string) => ({ commands }) =>
        commands.setMark('commentMark', { commentId }),
      unsetComment: (_commentId: string) => ({ commands }) =>
        commands.unsetMark('commentMark'),
    }
  },
})

// ─── Types ────────────────────────────────────────────────────────────────────
interface Comment {
  id: string
  text: string
  resolved: boolean
  createdAt: string
  from: number
  to: number
}

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

// ─── Font sizes (Google Docs style) ──────────────────────────────────────────
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72']
const DEFAULT_SIZE = '12'

// ─── Sub-components ───────────────────────────────────────────────────────────
function ToolbarButton({
  onClick, active, title, children, disabled,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick() }}
      title={title}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded transition-colors',
        active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
        disabled && 'opacity-30 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-1 flex-shrink-0" />
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [pendingComment, setPendingComment] = useState<string>('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [fontSizeOpen, setFontSizeOpen] = useState(false)
  const [currentFontSize, setCurrentFontSize] = useState(DEFAULT_SIZE)
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const fontSizeRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontSize,
      CommentMark,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onSelectionUpdate: ({ editor }) => {
      const attrs = editor.getAttributes('textStyle')
      if (attrs.fontSize) {
        setCurrentFontSize(attrs.fontSize.replace('pt', ''))
      }
      // Position bubble menu above selection
      const { from, to } = editor.state.selection
      if (from === to) { setBubblePos(null); return }
      try {
        const start = editor.view.coordsAtPos(from)
        const end = editor.view.coordsAtPos(to)
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const midX = (start.left + end.left) / 2 - rect.left + canvas.scrollLeft
        const topY = start.top - rect.top + canvas.scrollTop - 44
        setBubblePos({ top: topY, left: midX })
      } catch { setBubblePos(null) }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-full px-16 py-14 text-gray-900',
      },
    },
  })

  // Sync content when tab changes
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== content) editor.commands.setContent(content || '')
  }, [content, editor])

  // Close font size dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setFontSizeOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus comment input when it appears
  useEffect(() => {
    if (showCommentInput) setTimeout(() => commentInputRef.current?.focus(), 50)
  }, [showCommentInput])

  if (!editor) return null

  // ── Comment actions ──
  function addComment() {
    const { from, to } = editor.state.selection
    if (from === to || !pendingComment.trim()) return

    const id = crypto.randomUUID()
    editor.chain().focus().setComment(id).run()

    setComments((prev) => [
      ...prev,
      {
        id,
        text: pendingComment.trim(),
        resolved: false,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        from,
        to,
      },
    ])
    setPendingComment('')
    setShowCommentInput(false)
    setActiveCommentId(id)
  }

  function resolveComment(id: string) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, resolved: true } : c))
    setActiveCommentId(null)
  }

  function deleteComment(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id))
    if (activeCommentId === id) setActiveCommentId(null)
  }

  function applyFontSize(size: string) {
    editor.chain().focus().setFontSize(`${size}pt`).run()
    setCurrentFontSize(size)
    setFontSizeOpen(false)
  }

  const hasSelection = !editor.state.selection.empty
  const activeComments = comments.filter((c) => !c.resolved)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border bg-card flex-shrink-0 flex-wrap">

        {/* Font size */}
        <div ref={fontSizeRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setFontSizeOpen((v) => !v) }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-foreground hover:bg-secondary transition-colors border border-border min-w-[52px] justify-between"
            title="Font size"
          >
            {currentFontSize}
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          {fontSizeOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-y-auto max-h-48 min-w-[80px]">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyFontSize(size) }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors',
                    currentFontSize === size && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Bold / Italic / Underline */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (⌘U)">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Comment button */}
        <ToolbarButton
          onClick={() => hasSelection && setShowCommentInput(true)}
          active={false}
          disabled={!hasSelection}
          title={hasSelection ? 'Add comment' : 'Select text to comment'}
        >
          <MessageSquare className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Comment input bar (appears below toolbar when active) */}
      {showCommentInput && (
        <div className="flex items-start gap-2 px-4 py-2.5 border-b border-border bg-amber-50 dark:bg-amber-950/20 flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
          <textarea
            ref={commentInputRef}
            value={pendingComment}
            onChange={(e) => setPendingComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() }
              if (e.key === 'Escape') { setShowCommentInput(false); setPendingComment('') }
            }}
            placeholder="Add a comment… (Enter to save, Shift+Enter for newline)"
            rows={2}
            className="flex-1 text-sm bg-transparent outline-none resize-none text-gray-900 dark:text-gray-100 placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addComment() }}
              disabled={!pendingComment.trim()}
              className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              title="Save comment"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setShowCommentInput(false); setPendingComment('') }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Editor area + comments sidebar */}
      <div className="flex flex-1 overflow-hidden">

        {/* Canvas */}
        <div ref={canvasRef} className="flex-1 overflow-y-auto bg-[#F4F4F4] px-8 py-8 relative">
          {/* Floating bubble menu on text selection */}
          {bubblePos && hasSelection && !showCommentInput && (
            <div
              style={{ top: bubblePos.top, left: bubblePos.left, transform: 'translateX(-50%)' }}
              className="absolute z-30 flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-xl px-1.5 py-1 pointer-events-auto"
            >
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
                className={cn('p-1.5 rounded text-xs font-bold transition-colors', editor.isActive('bold') ? 'bg-primary/20 text-primary' : 'text-foreground hover:bg-secondary')}
              >B</button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
                className={cn('p-1.5 rounded text-xs italic transition-colors', editor.isActive('italic') ? 'bg-primary/20 text-primary' : 'text-foreground hover:bg-secondary')}
              >I</button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run() }}
                className={cn('p-1 rounded transition-colors', editor.isActive({ textAlign: 'center' }) ? 'bg-primary/20 text-primary' : 'text-foreground hover:bg-secondary')}
              ><AlignCenter className="w-3.5 h-3.5" /></button>
              <div className="w-px h-4 bg-border mx-0.5" />
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setShowCommentInput(true) }}
                className="p-1 rounded text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center gap-1 text-xs"
                title="Add comment"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-[11px]">Comment</span>
              </button>
            </div>
          )}

          <div className="relative mx-auto w-[794px] min-h-[1123px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.15)] rounded-sm">
            {!editor.getText() && placeholder && (
              <p className="absolute px-16 py-14 text-muted-foreground/30 pointer-events-none text-sm select-none">
                {placeholder}
              </p>
            )}
            <EditorContent editor={editor} className="min-h-[1123px]" />
          </div>
        </div>

        {/* Comments sidebar */}
        {activeComments.length > 0 && (
          <div className="w-64 flex-shrink-0 border-l border-border bg-card overflow-y-auto">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Comments ({activeComments.length})
              </p>
            </div>
            <div className="p-2 space-y-2">
              {activeComments.map((comment) => (
                <div
                  key={comment.id}
                  onClick={() => setActiveCommentId(comment.id === activeCommentId ? null : comment.id)}
                  className={cn(
                    'rounded-lg border p-3 cursor-pointer transition-all',
                    activeCommentId === comment.id
                      ? 'border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 shadow-sm'
                      : 'border-border bg-secondary/30 hover:border-border/80'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-primary">Y</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-foreground">You</span>
                        <span className="text-[10px] text-muted-foreground">{comment.createdAt}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{comment.text}</p>
                    </div>
                  </div>

                  {activeCommentId === comment.id && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); resolveComment(comment.id) }}
                        className="flex items-center gap-1 text-[11px] text-emerald-500 hover:text-emerald-600 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Resolve
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteComment(comment.id) }}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-400 transition-colors ml-auto"
                      >
                        <X className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
