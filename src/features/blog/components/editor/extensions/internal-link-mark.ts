import { Mark, mergeAttributes } from '@tiptap/core';

export interface InternalLinkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    internalLink: {
      setInternalLink: (blogId: string) => ReturnType;
      unsetInternalLink: () => ReturnType;
    };
  }
}

// Links to another blog post by id (`attrs.blogId`), never by a hardcoded
// `/blog/{slug}` string — the frontend resolves the current slug for this id
// at render time, so renaming the target post's slug never breaks the link.
// Must match the `internalLink` mark BlogService's tiptap-content.util.ts
// whitelists on the backend.
export const InternalLink = Mark.create<InternalLinkOptions>({
  name: 'internalLink',

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      blogId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-internal-link]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes({ 'data-internal-link': '', class: 'internal-link' }, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setInternalLink:
        (blogId: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { blogId }),
      unsetInternalLink:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
