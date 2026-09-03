import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { CtaBlockView } from './CtaBlockView';

export interface CtaBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaBlock: {
      insertCtaBlock: (ctaId: string) => ReturnType;
    };
  }
}

// Placed anywhere in the document (see the brief's "CTA anywhere in content"
// requirement) — an atomic, non-editable node that references a reusable CTA
// by id (`attrs.ctaId`), never duplicating its title/button/etc into the
// post. Must exactly match the `ctaBlock` node shape BlogService's
// tiptap-content.util.ts whitelists on the backend.
export const CtaBlock = Node.create<CtaBlockOptions>({
  name: 'ctaBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      ctaId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-cta-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-cta-block': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaBlockView);
  },

  addCommands() {
    return {
      insertCtaBlock:
        (ctaId: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { ctaId } }),
    };
  },
});
