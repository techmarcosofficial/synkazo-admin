// Mirrors synkazo-api's Blog/Tag/Signature/Cta entities (src/blog/entities/*).
// `content` is TipTap/ProseMirror JSON — kept loose here since the admin only
// ever round-trips it through the TipTap editor, never inspects its shape
// directly outside of `features/blog`.

export type TipTapDoc = { type: 'doc'; content: unknown[] };

export type TocEntry = { id: string; text: string; level: number };

export type BlogStatus = 'draft' | 'published';

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Signature {
  id: string;
  name: string;
  designation: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Cta {
  id: string;
  title: string;
  description: string | null;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: TipTapDoc;
  toc: TocEntry[] | null;
  readingTimeMinutes: number;
  heroImageUrl: string | null;
  category: string | null;
  status: BlogStatus;
  publishedAt: string | null;
  signatureId: string | null;
  signature?: Signature | null;
  metaTitle: string | null;
  metaDescription: string | null;
  previewToken: string | null;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogListResult {
  items: Blog[];
  total: number;
  page: number;
  limit: number;
}

export interface BlogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: BlogStatus;
  tag?: string;
}

export interface CreateBlogPayload {
  title: string;
  slug: string;
  excerpt?: string;
  content: TipTapDoc;
  heroImageUrl?: string;
  category?: string;
  status?: BlogStatus;
  signatureId?: string;
  metaTitle?: string;
  metaDescription?: string;
  tagIds?: string[];
  relatedBlogIds?: string[];
}

export type UpdateBlogPayload = Partial<CreateBlogPayload>;

export interface LinkSuggestion {
  id: string;
  title: string;
  slug: string;
}

export interface BlogSearchResult {
  id: string;
  title: string;
  slug: string;
}
