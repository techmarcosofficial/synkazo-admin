import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { MousePointerClick, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCtasQuery } from '@/queries/useBlog';

// Live preview of the placed CTA inside the editor canvas — resolves the
// referenced Cta by id from the CTA catalogue so the admin sees the actual
// title/button copy while writing, not just an opaque id.
export function CtaBlockView({ node, deleteNode, selected }: NodeViewProps) {
  const ctasQuery = useCtasQuery();
  const cta = ctasQuery.data?.find((c) => c.id === node.attrs.ctaId);

  return (
    <NodeViewWrapper
      className={`my-3 rounded-xl border-2 border-dashed p-4 ${
        selected ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
      }`}
      contentEditable={false}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <MousePointerClick className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {cta?.title ?? (ctasQuery.isLoading ? 'Loading…' : 'CTA not found')}
              </span>
              {cta && !cta.isActive && <Badge variant="secondary">Inactive</Badge>}
            </div>
            {cta && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                Button: "{cta.buttonText}" → {cta.buttonUrl}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => deleteNode()}>
          <Trash2 />
        </Button>
      </div>
    </NodeViewWrapper>
  );
}
