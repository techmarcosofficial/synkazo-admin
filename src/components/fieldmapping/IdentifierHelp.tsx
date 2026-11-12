import InfoTip from '@/components/shared/InfoTip';

/**
 * The (i) beside "Identifier": why the field matters and how to pick one,
 * framed around what it decides, update or create.
 */
export default function IdentifierHelp({
  side = 'bottom',
}: {
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <InfoTip label="How the identifier works" side={side}>
      <span className="block space-y-1.5 py-0.5">
        <span className="block font-semibold">
          How records are matched
        </span>
        <span className="block">
          For each source record, Synkazo looks for a HubSpot record with the
          same identifier value. Found: that record is updated. Not found: a new
          one is created.
        </span>
        <span className="block">
          Pick a field that is unique per record and filled in on both sides:
        </span>
        <span className="block">
          <strong className="font-semibold">Record ID</strong>: the most reliable
          choice.
          <br />
          <strong className="font-semibold">Email</strong>: best for contacts.
          <br />
          <strong className="font-semibold">Name</strong>: only if no two
          records share one, e.g. company names.
        </span>
      </span>
    </InfoTip>
  );
}
