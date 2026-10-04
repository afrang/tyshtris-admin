import { useEffect, useState, type ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'
import Swal from 'sweetalert2'
import './HtmlRichEditor.css'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

type ToolbarBtnProps = {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolbarBtn({ title, active, disabled, onClick, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      className={`et-html-btn${active ? ' is-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function HtmlRichEditor({ value, onChange, placeholder = 'Write content…' }: Props) {
  const [direction, setDirectionState] = useState<'ltr' | 'rtl' | 'auto'>('auto')

  const editor = useEditor({
    
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    textDirection: 'auto',
    editorProps: {
      attributes: {
        class: 'et-html-prose notranslate',
        translate: 'no',
        spellcheck: 'false',
        'data-no-ui-translate': 'true',
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const next = value || ''
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    editor.view.dom.setAttribute('dir', direction === 'auto' ? 'auto' : direction)
  }, [editor, direction])

  if (!editor) {
    return <div className="et-html-editor et-html-editor--loading">Loading editor…</div>
  }

  const currentEditor = editor

  async function setLink() {
    const previous = currentEditor.getAttributes('link').href as string | undefined
    const result = await Swal.fire({
      title: 'Link URL',
      input: 'url',
      inputValue: previous ?? 'https://',
      inputPlaceholder: 'https://example.com',
      showCancelButton: true,
      confirmButtonText: 'Apply',
      cancelButtonText: 'Cancel',
      buttonsStyling: false,
      customClass: {
        popup: 'cc-swal-popup',
        title: 'cc-swal-title',
        htmlContainer: 'cc-swal-html',
        confirmButton: 'cc-swal-confirm',
        cancelButton: 'cc-swal-cancel',
        actions: 'cc-swal-actions',
      },
      reverseButtons: true,
    })
    if (!result.isConfirmed) return
    const url = String(result.value ?? '').trim()
    if (!url) {
      currentEditor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    currentEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  function setDirection(next: 'ltr' | 'rtl') {
    setDirectionState(next)
    currentEditor.chain().focus().setTextDirection(next).run()
    currentEditor.view.dom.setAttribute('dir', next)
  }

  return (
    <div className="et-html-editor notranslate" translate="no" data-no-ui-translate>
      <div className="et-html-toolbar" role="toolbar" aria-label="HTML editor tools">
        <ToolbarBtn
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={14} />
        </ToolbarBtn>

        <span className="et-html-sep" />

        <ToolbarBtn
          title="Heading 1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={14} />
        </ToolbarBtn>

        <span className="et-html-sep" />

        <ToolbarBtn
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Quote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Link"
          active={editor.isActive('link')}
          onClick={() => void setLink()}
        >
          <LinkIcon size={14} />
        </ToolbarBtn>

        <span className="et-html-sep" />

        <ToolbarBtn
          title="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight size={14} />
        </ToolbarBtn>

        <span className="et-html-sep" />

        <ToolbarBtn
          title="Left to right"
          active={direction === 'ltr'}
          onClick={() => setDirection('ltr')}
        >
          <span className="et-html-dir">LTR</span>
        </ToolbarBtn>
        <ToolbarBtn
          title="Right to left"
          active={direction === 'rtl'}
          onClick={() => setDirection('rtl')}
        >
          <span className="et-html-dir">RTL</span>
        </ToolbarBtn>

        <span className="et-html-sep" />

        <ToolbarBtn
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={14} />
        </ToolbarBtn>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
