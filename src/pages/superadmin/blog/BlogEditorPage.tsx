import type { Editor } from '@tiptap/react';
import { ExternalLink, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import ErrorState from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { BlogEditor } from '@/features/blog/components/editor/BlogEditor';
import { SuggestedLinksPanel } from '@/features/blog/components/editor/SuggestedLinksPanel';
import { BlogMetaForm, type BlogMetaState } from '@/features/blog/components/BlogMetaForm';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import {
  useBlogQuery,
  useCreateBlogMutation,
  useIssuePreviewTokenMutation,
  useUpdateBlogMutation,
  useUploadBlogImageMutation,
} from '@/queries/useBlog';
import type { TipTapDoc } from '@/types';

const EMPTY_DOC: TipTapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-') || ''
  );
}

const emptyMeta: BlogMetaState = {
  title: '',
  slug: '',
  excerpt: '',
  heroImageUrl: '',
  category: '',
  status: 'draft',
  signatureId: '',
  tagIds: [],
  relatedBlogIds: [],
  metaTitle: '',
  metaDescription: '',
};

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';

export default function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();

  const blogQuery = useBlogQuery(id);
  const createMutation = useCreateBlogMutation();
  const updateMutation = useUpdateBlogMutation();
  const uploadMutation = useUploadBlogImageMutation();
  const previewTokenMutation = useIssuePreviewTokenMutation();

  const [meta, setMeta] = useState<BlogMetaState>(emptyMeta);
  const [content, setContent] = useState<TipTapDoc>(EMPTY_DOC);
  const [slugTouched, setSlugTouched] = useState(false);
  const [hydrated, setHydrated] = useState(isNew);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  useEffect(() => {
    if (!blogQuery.data || hydrated) return;
    const blog = blogQuery.data;
    setMeta({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt ?? '',
      heroImageUrl: blog.heroImageUrl ?? '',
      category: blog.category ?? '',
      status: blog.status,
      signatureId: blog.signatureId ?? '',
      tagIds: (blog.tags ?? []).map((t) => t.id),
      relatedBlogIds: [],
      metaTitle: blog.metaTitle ?? '',
      metaDescription: blog.metaDescription ?? '',
    });
    setContent(blog.content ?? EMPTY_DOC);
    setSlugTouched(true);
    setHydrated(true);
  }, [blogQuery.data, hydrated]);

  const patchMeta = (patch: Partial<BlogMetaState>) => {
    setMeta((prev) => {
      const next = { ...prev, ...patch };
      if (patch.title !== undefined && !slugTouched) {
        next.slug = slugify(patch.title);
      }
      return next;
    });
    if (patch.slug !== undefined) setSlugTouched(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isValid = meta.title.trim().length > 0 && meta.slug.trim().length > 0;

  const buildPayload = () => ({
    title: meta.title.trim(),
    slug: meta.slug.trim(),
    excerpt: meta.excerpt.trim() || undefined,
    content,
    heroImageUrl: meta.heroImageUrl || undefined,
    category: meta.category.trim() || undefined,
    status: meta.status,
    signatureId: meta.signatureId || undefined,
    metaTitle: meta.metaTitle.trim() || undefined,
    metaDescription: meta.metaDescription.trim() || undefined,
    tagIds: meta.tagIds,
    relatedBlogIds: meta.relatedBlogIds,
  });

  const handleSave = () => {
    if (!isValid) {
      showToast.error('Title and slug are required');
      return;
    }
    if (isNew) {
      createMutation.mutate(buildPayload(), {
        onSuccess: (blog) => {
          showToast.success('Blog created');
          navigate(`/super-admin/blog/${blog.id}`, { replace: true });
        },
        onError: (err) => showToast.error(getUserFriendlyError(err as never)),
      });
    } else {
      updateMutation.mutate(
        { id, data: buildPayload() },
        {
          onSuccess: () => showToast.success('Blog saved'),
          onError: (err) => showToast.error(getUserFriendlyError(err as never)),
        },
      );
    }
  };

  const handlePreview = () => {
    if (!id) return;
    previewTokenMutation.mutate(id, {
      onSuccess: ({ token }) => {
        window.open(`${FRONTEND_URL}/blog/preview/${token}`, '_blank', 'noopener');
      },
      onError: (err) => showToast.error(getUserFriendlyError(err as never)),
    });
  };

  if (!isNew && blogQuery.isLoading) {
    return <SkeletonList count={6} />;
  }
  if (!isNew && blogQuery.isError) {
    return <ErrorState onRetry={() => blogQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'New blog post' : meta.title || 'Edit blog post'}
        backTo={{ label: 'Blog', to: '/super-admin/blog' }}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={previewTokenMutation.isPending}
              >
                {previewTokenMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ExternalLink />
                )}
                Preview
              </Button>
            )}
            <Button onClick={handleSave} disabled={!isValid || isSaving}>
              {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
              Save
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <BlogEditor
            content={content}
            onChange={setContent}
            onEditorReady={setEditorInstance}
          />
          <SuggestedLinksPanel blogId={id} editor={editorInstance} />
        </div>
        <BlogMetaForm
          blogId={id}
          state={meta}
          onChange={patchMeta}
          isUploadingHeroImage={uploadMutation.isPending}
          onUploadHeroImage={(file) =>
            uploadMutation.mutate(file, {
              onSuccess: ({ url }) => patchMeta({ heroImageUrl: url }),
              onError: (err) => showToast.error(getUserFriendlyError(err as never)),
            })
          }
        />
      </div>
    </div>
  );
}
