import OrganisationNotesCard from '@/pages/superadmin/organisations/OrganisationNotesCard';

export default function BillingNotesCard({
  organisationId,
}: {
  organisationId: string;
}) {
  return (
    <OrganisationNotesCard organisationId={organisationId} category="billing" />
  );
}
