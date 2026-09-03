import apiClient from './apiClient';

import type {
  Blog,
  BlogListResult,
  BlogQueryParams,
  BlogSearchResult,
  Cta,
  CreateBlogPayload,
  LinkSuggestion,
  Signature,
  Tag,
  UpdateBlogPayload,
} from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d = (r: any): any => r.data.data;

export const blogApi = {
  list: (params?: BlogQueryParams): Promise<BlogListResult> =>
    apiClient.get('/admin/blog', { params }).then(d),
  get: (id: string): Promise<Blog> =>
    apiClient.get(`/admin/blog/${id}`).then(d),
  create: (data: CreateBlogPayload): Promise<Blog> =>
    apiClient.post('/admin/blog', data).then(d),
  update: (id: string, data: UpdateBlogPayload): Promise<Blog> =>
    apiClient.patch(`/admin/blog/${id}`, data).then(d),
  remove: (id: string): Promise<void> =>
    apiClient.delete(`/admin/blog/${id}`).then(d),
  publish: (id: string): Promise<Blog> =>
    apiClient.post(`/admin/blog/${id}/publish`).then(d),
  unpublish: (id: string): Promise<Blog> =>
    apiClient.post(`/admin/blog/${id}/unpublish`).then(d),
  issuePreviewToken: (id: string): Promise<{ token: string }> =>
    apiClient.post(`/admin/blog/${id}/preview-token`).then(d),
  setRelated: (id: string, relatedBlogIds: string[]): Promise<void> =>
    apiClient.put(`/admin/blog/${id}/related`, { relatedBlogIds }).then(d),
  linkSuggestions: (id: string): Promise<LinkSuggestion[]> =>
    apiClient.get(`/admin/blog/${id}/link-suggestions`).then(d),
  search: (q: string): Promise<BlogSearchResult[]> =>
    apiClient.get('/admin/blog/search', { params: { q } }).then(d),
  upload: (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post('/admin/blog/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(d);
  },

  listTags: (): Promise<Tag[]> => apiClient.get('/admin/blog/tags').then(d),
  createTag: (name: string): Promise<Tag> =>
    apiClient.post('/admin/blog/tags', { name }).then(d),
  updateTag: (id: string, name: string): Promise<Tag> =>
    apiClient.patch(`/admin/blog/tags/${id}`, { name }).then(d),
  deleteTag: (id: string): Promise<void> =>
    apiClient.delete(`/admin/blog/tags/${id}`).then(d),

  listSignatures: (): Promise<Signature[]> =>
    apiClient.get('/admin/blog/signatures').then(d),
  createSignature: (data: Partial<Signature>): Promise<Signature> =>
    apiClient.post('/admin/blog/signatures', data).then(d),
  updateSignature: (id: string, data: Partial<Signature>): Promise<Signature> =>
    apiClient.patch(`/admin/blog/signatures/${id}`, data).then(d),
  deleteSignature: (id: string): Promise<void> =>
    apiClient.delete(`/admin/blog/signatures/${id}`).then(d),

  listCtas: (): Promise<Cta[]> => apiClient.get('/admin/blog/ctas').then(d),
  createCta: (data: Partial<Cta>): Promise<Cta> =>
    apiClient.post('/admin/blog/ctas', data).then(d),
  updateCta: (id: string, data: Partial<Cta>): Promise<Cta> =>
    apiClient.patch(`/admin/blog/ctas/${id}`, data).then(d),
  deleteCta: (id: string): Promise<void> =>
    apiClient.delete(`/admin/blog/ctas/${id}`).then(d),
};
