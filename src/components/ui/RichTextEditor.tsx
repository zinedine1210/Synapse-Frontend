'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Heading1, Heading2, List, ListOrdered,
  Quote, CodeSquare, Undo2, Redo2, Link as LinkIcon, Minus,
  ImageIcon,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  autoFocus?: boolean;
  /** Callback for image upload. Return the URL of the uploaded image. */
  onImageUpload?: (file: File) => Promise<string>;
}

const ToolbarButton = ({ onClick, active, disabled, children, title }: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '4px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: active ? 'rgba(var(--color-primary) / 0.12)' : 'transparent',
      color: active ? 'rgb(var(--color-primary))' : disabled ? 'rgb(var(--text-muted))' : 'rgb(var(--text-secondary))',
      transition: 'all 0.15s', fontFamily: 'inherit', padding: 0, flexShrink: 0,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = active ? 'rgba(var(--color-primary) / 0.15)' : 'rgba(var(--color-primary) / 0.06)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(var(--color-primary) / 0.12)' : 'transparent'; }}
  >
    {children}
  </button>
);

const Divider = () => <div style={{ width: 1, height: 18, background: 'var(--border-default)', margin: '0 2px', flexShrink: 0 }} />;

export function RichTextEditor({ content, onChange, placeholder, readOnly, minHeight = 200, autoFocus, onImageUpload }: RichTextEditorProps) {
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'rte-code-block' } },
      }),
      Underline,
      Placeholder.configure({ placeholder: placeholder || 'Tulis sesuatu...' }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'rte-link' } }),
      ...(onImageUpload ? [Image.configure({ inline: false, allowBase64: false })] : []),
    ],
    content,
    editable: !readOnly,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'rte-content',
        style: `min-height: ${minHeight}px; outline: none; padding: 0.75rem; font-size: var(--font-sm); line-height: 1.7; color: rgb(var(--text-primary)); font-family: inherit;`,
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;
    if (file.size > 10 * 1024 * 1024) return;
    setIsUploadingImage(true);
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch { /* handled by caller */ }
    finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  return (
    <div style={{
      border: readOnly ? 'none' : '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      background: readOnly ? 'transparent' : 'rgb(var(--bg-primary))',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Toolbar */}
      {!readOnly && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '1px', padding: '0.3rem 0.4rem',
          borderBottom: '1px solid var(--border-default)',
          background: 'rgba(var(--color-primary) / 0.01)',
          alignItems: 'center',
        }}>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
            <UnderlineIcon size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">
            <Code size={14} />
          </ToolbarButton>

          <Divider />

          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 size={14} />
          </ToolbarButton>

          <Divider />

          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
            <ListOrdered size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <Quote size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
            <CodeSquare size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <Minus size={14} />
          </ToolbarButton>

          <Divider />

          <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Add Link">
            <LinkIcon size={14} />
          </ToolbarButton>
          {onImageUpload && (
            <>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              <ToolbarButton onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage} title="Sisipkan Gambar">
                <ImageIcon size={14} />
              </ToolbarButton>
            </>
          )}

          <div style={{ flex: 1 }} />

          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
            <Undo2 size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Shift+Z)">
            <Redo2 size={14} />
          </ToolbarButton>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Styles for editor */}
      <style>{`
        .rte-content h1 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0 0.3em; }
        .rte-content h2 { font-size: 1.25em; font-weight: 700; margin: 0.5em 0 0.3em; }
        .rte-content h3 { font-size: 1.1em; font-weight: 700; margin: 0.4em 0 0.2em; }
        .rte-content p { margin: 0.3em 0; }
        .rte-content ul, .rte-content ol { padding-left: 1.5em; margin: 0.3em 0; }
        .rte-content li { margin: 0.1em 0; }
        .rte-content blockquote {
          border-left: 3px solid rgb(var(--color-primary));
          padding-left: 0.75em; margin: 0.5em 0;
          color: rgb(var(--text-secondary)); font-style: italic;
        }
        .rte-content code {
          background: rgba(var(--color-primary) / 0.08);
          padding: 0.1em 0.3em; border-radius: 3px;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 0.9em; color: rgb(var(--color-primary));
        }
        .rte-code-block {
          background: rgba(0,0,0,0.05); border-radius: 6px;
          padding: 0.75em 1em; margin: 0.5em 0;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 0.85em; line-height: 1.5;
          overflow-x: auto; white-space: pre;
          color: rgb(var(--text-primary));
        }
        .rte-code-block code { background: none; padding: 0; border-radius: 0; font-size: inherit; color: inherit; }
        .rte-link {
          color: rgb(var(--color-primary)); text-decoration: underline;
          cursor: pointer;
        }
        .rte-content hr {
          border: none; border-top: 1px solid var(--border-default);
          margin: 0.75em 0;
        }
        .rte-content a { color: rgb(var(--color-primary)); text-decoration: underline; }
        .rte-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 0.5em 0; }
        .rte-content strong { font-weight: 700; }
        .rte-content em { font-style: italic; }
        .rte-content u { text-decoration: underline; }
        .rte-content s { text-decoration: line-through; }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left; color: rgb(var(--text-muted)); pointer-events: none;
          height: 0; opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
