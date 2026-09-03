import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSignaturesQuery } from '@/queries/useBlog';
import type { BlogStatus } from '@/types';

import { RelatedBlogsMultiSelect } from './RelatedBlogsMultiSelect';
import { TagMultiSelect } from './TagMultiSelect';

export interface BlogMetaState {
  title: string;
  slug: string;
  excerpt: string;
  heroImageUrl: string;
  category: string;
  status: BlogStatus;
  signatureId: string;
  tagIds: string[];
  relatedBlogIds: string[];
  metaTitle: string;
  metaDescription: string;
}

export function BlogMetaForm({
  blogId,
  state,
  onChange,
  onUploadHeroImage,
  isUploadingHeroImage,
}: {
  blogId: string | undefined;
  state: BlogMetaState;
  onChange: (patch: Partial<BlogMetaState>) => void;
  onUploadHeroImage: (file: File) => void;
  isUploadingHeroImage: boolean;
}) {
  const signaturesQuery = useSignaturesQuery();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Basic information</h3>
        <div className="space-y-2">
          <Label htmlFor="meta-title">Title</Label>
          <Input
            id="meta-title"
            value={state.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-slug">Slug</Label>
          <Input
            id="meta-slug"
            value={state.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-excerpt">Excerpt</Label>
          <Textarea
            id="meta-excerpt"
            rows={3}
            value={state.excerpt}
            onChange={(e) => onChange({ excerpt: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Featured image</Label>
          {state.heroImageUrl && (
            <img
              src={state.heroImageUrl}
              alt=""
              className="h-32 w-full rounded-lg border object-cover"
            />
          )}
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isUploadingHeroImage}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadHeroImage(file);
              e.target.value = '';
            }}
          />
          {isUploadingHeroImage && (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3 animate-spin" /> Uploading…
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-category">Category</Label>
          <Input
            id="meta-category"
            value={state.category}
            onChange={(e) => onChange({ category: e.target.value })}
            placeholder="Integrations"
          />
        </div>
        <div className="space-y-2">
          <Label>Tags</Label>
          <TagMultiSelect
            value={state.tagIds}
            onChange={(tagIds) => onChange({ tagIds })}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={state.status}
            onValueChange={(v) => onChange({ status: v as BlogStatus })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">SEO</h3>
        <div className="space-y-2">
          <Label htmlFor="meta-seo-title">Meta title</Label>
          <Input
            id="meta-seo-title"
            value={state.metaTitle}
            onChange={(e) => onChange({ metaTitle: e.target.value })}
            placeholder={state.title || 'Falls back to the post title'}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meta-seo-desc">Meta description</Label>
          <Textarea
            id="meta-seo-desc"
            rows={2}
            value={state.metaDescription}
            onChange={(e) => onChange({ metaDescription: e.target.value })}
            placeholder={state.excerpt || 'Falls back to the excerpt'}
          />
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Blog settings</h3>
        <div className="space-y-2">
          <Label>Signature</Label>
          <Select
            value={state.signatureId || 'none'}
            onValueChange={(v) => onChange({ signatureId: v === 'none' ? '' : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No signature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No signature</SelectItem>
              {(signaturesQuery.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Related posts</Label>
          <RelatedBlogsMultiSelect
            currentBlogId={blogId}
            value={state.relatedBlogIds}
            onChange={(relatedBlogIds) => onChange({ relatedBlogIds })}
          />
          <p className="text-muted-foreground text-xs">
            Leave empty to fall back to automatic suggestions (shared tags, then
            category, then most recent).
          </p>
        </div>
      </div>
    </div>
  );
}
