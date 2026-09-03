import { format } from 'date-fns';
import { FileText, Plus, Settings2, Tag as TagIcon, Trash2, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import {
  useBlogsQuery,
  useDeleteBlogMutation,
  usePublishBlogMutation,
  useUnpublishBlogMutation,
} from '@/queries/useBlog';
import type { BlogStatus } from '@/types';

export default function BlogListPage() {
  const [status, setStatus] = useState<BlogStatus | 'all'>('all');
  const blogsQuery = useBlogsQuery({
    status: status === 'all' ? undefined : status,
    limit: 50,
  });
  const deleteMutation = useDeleteBlogMutation();
  const publishMutation = usePublishBlogMutation();
  const unpublishMutation = useUnpublishBlogMutation();
  const { confirm } = useConfirmDialog();

  const blogs = blogsQuery.data?.items ?? [];

  const handleDelete = (id: string, title: string) => {
    confirm({
      variant: 'danger',
      title: `Delete "${title}"?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          showToast.success('Blog deleted');
        } catch (err) {
          showToast.error(getUserFriendlyError(err as never));
          throw err;
        }
      },
    });
  };

  const togglePublish = (id: string, currentStatus: BlogStatus) => {
    const mutation = currentStatus === 'published' ? unpublishMutation : publishMutation;
    mutation.mutate(id, {
      onSuccess: () =>
        showToast.success(currentStatus === 'published' ? 'Unpublished' : 'Published'),
      onError: (err) => showToast.error(getUserFriendlyError(err as never)),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        description="Manage blog posts, tags, signatures, and CTAs."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/super-admin/blog/tags">
                <TagIcon /> Tags
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/super-admin/blog/signatures">
                <UserCircle /> Signatures
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/super-admin/blog/ctas">
                <Settings2 /> CTAs
              </Link>
            </Button>
            <Button asChild>
              <Link to="/super-admin/blog/new">
                <Plus /> New Post
              </Link>
            </Button>
          </div>
        }
      />

      <Select value={status} onValueChange={(v) => setStatus(v as BlogStatus | 'all')}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="published">Published</SelectItem>
        </SelectContent>
      </Select>

      {blogsQuery.isLoading ? (
        <SkeletonList count={6} />
      ) : blogsQuery.isError ? (
        <ErrorState onRetry={() => blogsQuery.refetch()} />
      ) : blogs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No blog posts yet"
          description="Create your first post to get started."
          action={
            <Button asChild>
              <Link to="/super-admin/blog/new">
                <Plus /> New Post
              </Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reading time</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-56 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogs.map((blog) => (
              <TableRow key={blog.id}>
                <TableCell className="font-medium">
                  <Link to={`/super-admin/blog/${blog.id}`} className="hover:underline">
                    {blog.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={blog.status === 'published' ? 'default' : 'secondary'}>
                    {blog.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {blog.readingTimeMinutes} min
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(blog.updatedAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePublish(blog.id, blog.status)}
                  >
                    {blog.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(blog.id, blog.title)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
