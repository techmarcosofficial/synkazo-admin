import { ArrowRight, Building2, Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useMyOrgQuery, useSetupOrgMutation } from '@/queries/useOrganisations';

export default function SetupOrganisation() {
  const { currentUser } = useSynkazoAuth();
  const navigate = useNavigate();
  const orgQuery = useMyOrgQuery();
  const setupOrgMutation = useSetupOrgMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const existing = orgQuery.data ?? null;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Organisation name is required.');
      return;
    }
    setError('');
    try {
      await setupOrgMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
      });
      navigate('/org-admin');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to create organisation');
    }
  };

  if (!currentUser || orgQuery.isLoading) {
    return (
      <div className="mx-auto mt-8 max-w-lg space-y-4">
        <Skeleton className="mx-auto size-14 rounded-2xl" />
        <Skeleton className="mx-auto h-6 w-56" />
        <Skeleton className="mx-auto h-4 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (existing) {
    return (
      <div className="mx-auto mt-8 max-w-lg text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
          <Building2 className="text-primary size-6" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          {existing.name}
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          You already have an organisation set up.
        </p>
        <Button onClick={() => navigate('/org-admin')}>
          Go to Dashboard <ArrowRight />
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up mx-auto mt-8 max-w-lg space-y-8">
      <div className="text-center">
        <div className="bg-primary text-primary-foreground mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
          <Building2 className="size-6" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Set Up Your Organisation
        </h1>
        <p className="text-muted-foreground text-sm">
          Create your organisation to manage projects and invite your team.
        </p>
      </div>

      <Card>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="org-name" required>
                Organisation Name
              </FieldLabel>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="org-description">
                Description{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FieldLabel>
              <Textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your organisation do?"
                rows={3}
              />
            </Field>

            <Button
              onClick={handleCreate}
              loading={setupOrgMutation.isPending}
              className="w-full"
            >
              {!setupOrgMutation.isPending && <Check />}
              Create Organisation
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
