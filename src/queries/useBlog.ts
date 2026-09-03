import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

import { blogApi } from '@/api/blog';
import type {
  BlogQueryParams,
  CreateBlogPayload,
  Cta,
  Signature,
  UpdateBlogPayload,
} from '@/types';

// ---- Blog posts -------------------------------------------------------------

export function useBlogsQuery(params?: BlogQueryParams) {
  return useQuery({
    queryKey: queryKeys.blog.list(params),
    queryFn: () => blogApi.list(params),
  });
}

export function useBlogQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.blog.detail(id ?? ''),
    queryFn: () => blogApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useBlogSearchQuery(q: string) {
  return useQuery({
    queryKey: queryKeys.blog.search(q),
    queryFn: () => blogApi.search(q),
    enabled: q.trim().length >= 2,
  });
}

export function useLinkSuggestionsQuery(blogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.blog.linkSuggestions(blogId ?? ''),
    queryFn: () => blogApi.linkSuggestions(blogId as string),
    enabled: Boolean(blogId),
  });
}

export function useCreateBlogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBlogPayload) => blogApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog', 'list'] });
    },
  });
}

export function useUpdateBlogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlogPayload }) =>
      blogApi.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['blog', 'list'] });
    },
  });
}

export function useDeleteBlogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog', 'list'] });
    },
  });
}

export function usePublishBlogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.publish(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['blog', 'list'] });
    },
  });
}

export function useUnpublishBlogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.unpublish(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['blog', 'list'] });
    },
  });
}

export function useIssuePreviewTokenMutation() {
  return useMutation({
    mutationFn: (id: string) => blogApi.issuePreviewToken(id),
  });
}

export function useSetRelatedBlogsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, relatedBlogIds }: { id: string; relatedBlogIds: string[] }) =>
      blogApi.setRelated(id, relatedBlogIds),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.detail(id) });
    },
  });
}

export function useUploadBlogImageMutation() {
  return useMutation({
    mutationFn: (file: File) => blogApi.upload(file),
  });
}

// ---- Tags -----------------------------------------------------------------

export function useTagsQuery() {
  return useQuery({ queryKey: queryKeys.blog.tags, queryFn: blogApi.listTags });
}

export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => blogApi.createTag(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.tags });
    },
  });
}

export function useUpdateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      blogApi.updateTag(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.tags });
    },
  });
}

export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.tags });
    },
  });
}

// ---- Signatures ---------------------------------------------------------

export function useSignaturesQuery() {
  return useQuery({
    queryKey: queryKeys.blog.signatures,
    queryFn: blogApi.listSignatures,
  });
}

export function useCreateSignatureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Signature>) => blogApi.createSignature(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.signatures });
    },
  });
}

export function useUpdateSignatureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Signature> }) =>
      blogApi.updateSignature(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.signatures });
    },
  });
}

export function useDeleteSignatureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.deleteSignature(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.signatures });
    },
  });
}

// ---- CTAs -------------------------------------------------------------------

export function useCtasQuery() {
  return useQuery({ queryKey: queryKeys.blog.ctas, queryFn: blogApi.listCtas });
}

export function useCreateCtaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Cta>) => blogApi.createCta(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.ctas });
    },
  });
}

export function useUpdateCtaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Cta> }) =>
      blogApi.updateCta(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.ctas });
    },
  });
}

export function useDeleteCtaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.deleteCta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.ctas });
    },
  });
}
