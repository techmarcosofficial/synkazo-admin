import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  MousePointerClick,
  Quote,
  Redo,
  Search,
  Undo,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUploadBlogImageMutation } from '@/queries/useBlog';
import type { TipTapDoc } from '@/types';

import { CtaBlock } from './extensions/cta-block-node';
import { InternalLink } from './extensions/internal-link-mark';
import { CtaPickerDialog } from './CtaPickerDialog';
import { InternalLinkPickerDialog } from './InternalLinkPickerDialog';
import { LinkDialog } from './LinkDialog';

import './editor.css';

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [ctaPickerOpen, setCtaPickerOpen] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [internalLinkPickerOpen, setInternalLinkPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadBlogImageMutation();

  const handleImageFile = (file: File | undefined) => {
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess: ({ url }) => editor.chain().focus().setImage({ src: url }).run(),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2">
      <ToolbarButton
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 />
      </ToolbarButton>
      <ToolbarButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton label="Link" active={editor.isActive('link')} onClick={() => setLinkPickerOpen(true)}>
        <LinkIcon />
      </ToolbarButton>
      <ToolbarButton label="Link to another post" onClick={() => setInternalLinkPickerOpen(true)}>
        <Search />
      </ToolbarButton>
      <ToolbarButton
        label="Insert image"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending ? <Loader2 className="animate-spin" /> : <ImageIcon />}
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          handleImageFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <ToolbarButton label="Insert CTA" onClick={() => setCtaPickerOpen(true)}>
        <MousePointerClick />
      </ToolbarButton>

      <LinkDialog
        open={linkPickerOpen}
        onOpenChange={setLinkPickerOpen}
        onSubmit={(url) => editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()}
      />
      <InternalLinkPickerDialog
        open={internalLinkPickerOpen}
        onOpenChange={setInternalLinkPickerOpen}
        onSelect={(blogId) => editor.chain().focus().setInternalLink(blogId).run()}
      />
      <CtaPickerDialog
        open={ctaPickerOpen}
        onOpenChange={setCtaPickerOpen}
        onSelect={(ctaId) => editor.chain().focus().insertCtaBlock(ctaId).run()}
      />
    </div>
  );
}

export function BlogEditor({
  content,
  onChange,
  onEditorReady,
}: {
  content: TipTapDoc | null;
  onChange: (doc: TipTapDoc) => void;
  onEditorReady?: (editor: Editor | null) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension,
      LinkExtension.configure({ openOnClick: false, autolink: false }),
      CtaBlock,
      InternalLink,
    ],
    content: (content as JSONContent) ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as unknown as TipTapDoc),
    editorProps: {
      attributes: {
        class: 'blog-editor-prose min-h-[400px] px-4 py-4 focus:outline-none',
      },
    },
  });

  // Keep the editor in sync when a different post's content is loaded
  // (id-driven, so we don't fight the user's cursor on every parent re-render).
  const loadedContentRef = useRef<TipTapDoc | null>(null);
  useEffect(() => {
    if (!editor || !content || content === loadedContentRef.current) return;
    loadedContentRef.current = content;
    editor.commands.setContent(content as JSONContent);
  }, [editor, content]);

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

export type { Editor };
