import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { uploadEditorImage } from '@/storage'

interface Props {
  content: string
  onChange: (html: string) => void
  tempPostId: string
}

function createImageUploadExtension(tempPostId: string) {
  return Extension.create({
    name: 'imageUpload',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('imageUpload'),
          props: {
            handleDrop(view, event) {
              const files = event.dataTransfer?.files
              if (!files?.length) return false
              const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
              if (!images.length) return false
              event.preventDefault()
              images.forEach(async (file) => {
                const url = await uploadEditorImage(file, tempPostId)
                const node = view.state.schema.nodes.image.create({ src: url, alt: file.name })
                const tr = view.state.tr.replaceSelectionWith(node)
                view.dispatch(tr)
              })
              return true
            },
            handlePaste(view, event) {
              const items = event.clipboardData?.items
              if (!items) return false
              const images = Array.from(items).filter((i) => i.type.startsWith('image/'))
              if (!images.length) return false
              images.forEach(async (item) => {
                const file = item.getAsFile()
                if (!file) return
                const url = await uploadEditorImage(file, tempPostId)
                const node = view.state.schema.nodes.image.create({ src: url, alt: '' })
                const tr = view.state.tr.replaceSelectionWith(node)
                view.dispatch(tr)
              })
              return true
            },
          },
        }),
      ]
    },
  })
}

export default function Editor({ content, onChange, tempPostId }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: '本文を入力してください...' }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
      createImageUploadExtension(tempPostId),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor || editor.isFocused) return
    const current = editor.getHTML()
    if (content && content !== current) {
      editor.commands.setContent(content, false)
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <Toolbar editor={editor} tempPostId={tempPostId} />
      <style>{editorStyles}</style>
      <EditorContent
        editor={editor}
        className="editor-content px-4 py-3 min-h-64 focus-within:outline-none"
      />
    </div>
  )
}

function Toolbar({ editor, tempPostId }: { editor: ReturnType<typeof useEditor>; tempPostId: string }) {
  if (!editor) return null

  async function handleImageInsert() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const url = await uploadEditorImage(file, tempPostId)
      editor!.chain().focus().setImage({ src: url, alt: file.name }).run()
    }
    input.click()
  }

  async function handleLinkInsert() {
    const url = window.prompt('URLを入力してください')
    if (!url) return
    editor!.chain().focus().setLink({ href: url }).run()
  }

  const btn = (active: boolean) =>
    `px-2 py-1 rounded text-sm font-medium transition ${
      active ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`

  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 px-3 py-2 sticky top-0 z-10 bg-white rounded-t-lg">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}><strong>B</strong></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}><em>I</em></button>
      <div className="mx-1 w-px bg-gray-200" />
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}>H2</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))}>H3</button>
      <div className="mx-1 w-px bg-gray-200" />
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>リスト</button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>番号付き</button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}>引用</button>
      <div className="mx-1 w-px bg-gray-200" />
      <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btn(editor.isActive({ textAlign: 'left' }))} title="左揃え">&#8676;</button>
      <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btn(editor.isActive({ textAlign: 'center' }))} title="中央揃え">&#8633;</button>
      <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btn(editor.isActive({ textAlign: 'right' }))} title="右揃え">&#8677;</button>
      <div className="mx-1 w-px bg-gray-200" />
      <button onClick={handleLinkInsert} className={btn(editor.isActive('link'))}>リンク</button>
      <button onClick={handleImageInsert} className={btn(false)}>画像</button>
    </div>
  )
}

const editorStyles = `
  .editor-content .ProseMirror {
    outline: none;
    min-height: 16rem;
  }
  .editor-content .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
    float: left;
    height: 0;
  }
  .editor-content .ProseMirror h2 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 1.5rem 0 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 2px solid #e5e7eb;
  }
  .editor-content .ProseMirror h3 {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 1.25rem 0 0.5rem;
  }
  .editor-content .ProseMirror p {
    margin-bottom: 0.75rem;
    line-height: 1.8;
  }
  .editor-content .ProseMirror strong { font-weight: 700; }
  .editor-content .ProseMirror em { font-style: italic; }
  .editor-content .ProseMirror ul {
    list-style-type: disc;
    margin: 0.75rem 0 0.75rem 1.5rem;
  }
  .editor-content .ProseMirror ol {
    list-style-type: decimal;
    margin: 0.75rem 0 0.75rem 1.5rem;
  }
  .editor-content .ProseMirror li { margin-bottom: 0.25rem; }
  .editor-content .ProseMirror blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    color: #6b7280;
    margin: 1rem 0;
  }
  .editor-content .ProseMirror a {
    color: #2563eb;
    text-decoration: underline;
  }
  .editor-content .ProseMirror img {
    max-width: 100%;
    border-radius: 6px;
    margin: 0.5rem 0;
  }
  .editor-content .ProseMirror [style*="text-align: center"] { text-align: center; }
  .editor-content .ProseMirror [style*="text-align: right"] { text-align: right; }
  .editor-content .ProseMirror [style*="text-align: left"] { text-align: left; }
`
