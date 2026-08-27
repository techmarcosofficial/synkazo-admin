import { AlertCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

import type { ProjectAccessGrant } from '@/api/invitations';
import FormDialog from '@/components/form/FormDialog';
import ProjectMultiSelect from '@/components/shared/ProjectMultiSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { roleLabel } from '@/lib/permissions';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useCreateInvitationMutation } from '@/queries/useInvitations';
import { useProjectsQuery } from '@/queries/useProjects';
import type { UserRole } from '@/types';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProjectPerms = Record<string, { read: boolean; write: boolean }>;

export default function InviteMemberDialog({
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const { currentUser } = useSynkazoAuth();
  const createMutation = useCreateInvitationMutation();
  const projectsQuery = useProjectsQuery();
  const projects = projectsQuery.data ?? [];

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ email: '', role: 'editor', message: '' });
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [projectPerms, setProjectPerms] = useState<ProjectPerms>({});
  const [formError, setFormError] = useState('');

  const roleOptions =
    currentUser?.role === 'super_admin' ? ['org_admin', 'editor'] : ['editor'];
  const isEditorInvite = form.role === 'editor';

  const reset = () => {
    setStep(1);
    setForm({ email: '', role: 'editor', message: '' });
    setSelectedProjectIds([]);
    setProjectPerms({});
    setFormError('');
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const handleSelectProjects = (ids: string[]) => {
    setSelectedProjectIds(ids);
    setProjectPerms((prev) => {
      const next: ProjectPerms = {};
      for (const id of ids) next[id] = prev[id] ?? { read: true, write: false };
      return next;
    });
  };

  const togglePerm = (projectId: string, perm: 'read' | 'write') =>
    setProjectPerms((prev) => ({
      ...prev,
      [projectId]: { ...prev[projectId], [perm]: !prev[projectId]?.[perm] },
    }));

  const validateStep1 = () => {
    if (!form.email || !form.role) return 'Email and role are required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return 'Enter a valid email address.';
    return '';
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError('');
    setStep(2);
  };

  const buildProjectAccess = (): ProjectAccessGrant[] =>
    selectedProjectIds.map((projectId) => {
      const perms = projectPerms[projectId];
      const permissions: string[] = [];
      if (perms?.read) permissions.push('read');
      if (perms?.write) permissions.push('write');
      return {
        projectId,
        permissions: permissions.length ? permissions : ['read'],
      };
    });

  const handleSend = async () => {
    setFormError('');
    const err = validateStep1();
    if (err) {
      setFormError(err);
      return;
    }
    try {
      await createMutation.mutateAsync({
        email: form.email.trim().toLowerCase(),
        role: form.role,
        message: form.message || undefined,
        projectAccess: isEditorInvite ? buildProjectAccess() : undefined,
      });
      toast.success(`Invitation sent to ${form.email}`);
      handleOpenChange(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setFormError(e.response?.data?.message ?? 'Failed to send invitation');
    }
  };

  const showStep2 = isEditorInvite && step === 2;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={showStep2 ? 'Project Permissions' : 'Send Invitation'}
      size="sm"
      currentStep={isEditorInvite ? step : undefined}
      totalSteps={isEditorInvite ? 2 : undefined}
      stepLabels={isEditorInvite ? ['Invite', 'Permissions'] : undefined}
      footer={(requestClose) => (
        <>
          {showStep2 ? (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={requestClose}>
              Cancel
            </Button>
          )}
          {isEditorInvite && step === 1 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleSend} loading={createMutation.isPending}>
              {!createMutation.isPending && <Mail />}
              Send Invitation
            </Button>
          )}
        </>
      )}
    >
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {!showStep2 ? (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="invite-email" required>
              Email Address
            </FieldLabel>
            <Input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="colleague@company.com"
            />
          </Field>

          <Field>
            <FieldLabel required>Role</FieldLabel>

            <RadioGroup
              value={form.role}
              onValueChange={(role) =>
                setForm((f) => ({ ...f, role: role as UserRole }))
              }
              className="flex gap-3"
            >
              {roleOptions.map((r) => (
                <FieldLabel key={r} htmlFor={`role-${r}`} className="flex-1">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <p className="text-sm">{roleLabel(r as UserRole)}</p>

                      <FieldDescription>
                        {r === 'org_admin'
                          ? 'Full org access'
                          : 'Limited project access'}
                      </FieldDescription>
                    </FieldContent>

                    <RadioGroupItem value={r} id={`role-${r}`} />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </Field>

          {isEditorInvite && (
            <Field>
              <FieldLabel>Projects</FieldLabel>
              <ProjectMultiSelect
                value={selectedProjectIds}
                onChange={handleSelectProjects}
              />
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="invite-message">
              Personal Message (optional)
            </FieldLabel>
            <Textarea
              id="invite-message"
              value={form.message}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value }))
              }
              rows={3}
              placeholder="Looking forward to working with you…"
            />
          </Field>
        </FieldGroup>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Choose what {form.email} can do in each project.
          </p>
          {selectedProjectIds.map((projectId) => {
            const project = projects.find((p) => p.id === projectId);
            const perms = projectPerms[projectId];
            return (
              <div key={projectId} className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-medium">
                  {project?.name ?? projectId}
                </p>
                <div className="flex gap-4">
                  <Label className="flex cursor-pointer items-center gap-2 font-normal">
                    <Checkbox
                      checked={!!perms?.read}
                      onCheckedChange={() => togglePerm(projectId, 'read')}
                    />
                    <span className="text-sm">Read</span>
                  </Label>
                  <Label className="flex cursor-pointer items-center gap-2 font-normal">
                    <Checkbox
                      checked={!!perms?.write}
                      onCheckedChange={() => togglePerm(projectId, 'write')}
                    />
                    <span className="text-sm">Write</span>
                  </Label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </FormDialog>
  );
}
