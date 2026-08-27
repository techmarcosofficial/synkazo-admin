import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CRED_SCHEMAS } from './platformMeta';

import { connectionsApi } from '@/api/connections';
import FormDialog from '@/components/form/FormDialog';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { Connection } from '@/types';

interface ConnectionPayload {
  platformId?: string;
  connectionType?: string;
  environment?: string;
  credentials?: Record<string, string | undefined>;
  status?: string;
}

interface CredentialsModalProps {
  projectId: string;
  conn: Partial<Connection> & {
    platformId?: string;
    connectionType?: string;
    environment?: string;
    providerMetadata?: { installSource?: 'marketplace' | 'manual' };
  };
  onSaved: () => void;
  onClose: () => void;
}

export default function CredentialsModal({
  projectId,
  conn,
  onSaved,
  onClose,
}: CredentialsModalProps) {
  const platformId = conn.platformId ?? 'servicetitan';
  const schema = CRED_SCHEMAS[platformId] ?? CRED_SCHEMAS.servicetitan;
  const isEdit = !!conn?.id;

  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(schema.fields.map((f) => [f.key, ''])),
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    connectionsApi
      .getCredentialsPreview(projectId, conn.id!)
      .then((preview) => setForm((f) => ({ ...f, ...preview })))
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, []);

  const setField = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    schema.fields.forEach((f) => {
      const required = !f.optional && (f.requiredAlways || !isEdit);
      if (required && !form[f.key]?.trim()) next[f.key] = 'Required';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleVerify = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const credentials: Record<string, string> = {};
      schema.fields.forEach((f) => {
        const val = form[f.key]?.trim();
        // Fields with an edit-mode-only placeholder are optional on edit — omit
        // when blank so the backend keeps the existing stored value.
        if (val || f.requiredAlways) credentials[f.key] = val;
      });

      const payload: ConnectionPayload = {
        credentials,
        status: 'disconnected',
      };

      let saved: Connection;
      if (conn?.id) {
        saved = await connectionsApi.updateConnection(
          projectId,
          conn.id,
          payload as Partial<Connection>,
        );
      } else {
        saved = await connectionsApi.createConnection(projectId, {
          ...payload,
          platformId,
          connectionType: conn?.connectionType ?? schema.connectionType,
          environment: conn?.environment ?? schema.environment,
        } as Partial<Connection>);
      }

      const connId = saved?.id ?? conn?.id;
      const result = await connectionsApi.testConnection(projectId, connId!);

      onClose();
      onSaved?.();

      if (result?.success) {
        toast.success(`${schema.title} credentials verified`);
      } else {
        toast.error(`${schema.title} credentials Failed`, {
          description:
            result?.message ??
            'Invalid credentials — please check the values and try again.',
        });
      }
    } catch (err) {
      onClose();
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(`${schema.title} credentials Failed`, {
        description:
          e?.response?.data?.message ??
          'Failed to save credentials. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldsDisabled = loading || previewLoading;

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={
        isEdit ? `Edit ${schema.title} Connection` : `Connect ${schema.title}`
      }
      description={
        isEdit ? 'Update your API credentials' : 'Enter your API credentials'
      }
      size="sm"
      footer={(requestClose) => (
        <>
          <Button
            variant="outline"
            onClick={requestClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={fieldsDisabled}
            className="flex-1"
          >
            {loading ? <Spinner /> : null}
            {loading ? 'Verifying…' : 'Verify Credentials'}
          </Button>
        </>
      )}
    >
      {previewLoading && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Spinner className="size-3" /> Loading saved details…
        </div>
      )}

      <FieldGroup>
        {schema.fields.map((f) => {
          const isMarketplacePrivateAppToken =
            conn?.providerMetadata?.installSource === 'marketplace' &&
            f.key === 'privateAppToken';
          if (isMarketplacePrivateAppToken) return null;
          return (
            <Field key={f.key} data-invalid={!!errors[f.key]}>
              <FieldLabel htmlFor={f.key}>{f.label}</FieldLabel>
              <Input
                id={f.key}
                type={f.type}
                value={form[f.key] || ''}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={
                  isEdit && f.editPlaceholder
                    ? f.editPlaceholder
                    : f.placeholder
                }
                disabled={fieldsDisabled}
                aria-invalid={!!errors[f.key]}
              />
              {errors[f.key] && (
                <p className="text-destructive text-xs">{errors[f.key]}</p>
              )}
            </Field>
          );
        })}
      </FieldGroup>

      {schema.note && (
        <p className="text-muted-foreground text-xs">{schema.note}</p>
      )}
    </FormDialog>
  );
}
