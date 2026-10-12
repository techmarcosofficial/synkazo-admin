import { formatDistanceToNow } from 'date-fns';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import SortableTableHead from '@/components/shared/SortableTableHead';
import StatusBadge from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SortDirection } from '@/hooks/useSort';

export type PeopleSortKey =
  'name' | 'email' | 'organisation' | 'role' | 'status' | 'created';

export interface PersonView {
  id: string;
  name: string;
  email: string;
  role: string;
  organisation: string;
  organisationTo?: string;
  isActive: boolean;
  createdAt: string | null;
  actions: ReactNode;
}

export function comparePeople(
  a: PersonView,
  b: PersonView,
  key: PeopleSortKey,
) {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'email':
      return a.email.localeCompare(b.email);
    case 'organisation':
      return a.organisation.localeCompare(b.organisation);
    case 'role':
      return a.role.localeCompare(b.role);
    case 'status':
      return Number(a.isActive) - Number(b.isActive);
    case 'created':
      return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  }
}

function joinedLabel(value: string | null) {
  return value
    ? formatDistanceToNow(new Date(value), { addSuffix: true })
    : '—';
}

function OrganisationCell({ person }: { person: PersonView }) {
  return person.organisationTo ? (
    <Link className="text-primary hover:underline" to={person.organisationTo}>
      {person.organisation}
    </Link>
  ) : (
    <span>{person.organisation}</span>
  );
}

/** One list renderer for tenant users and platform administrators. */
export default function PeopleDirectory({
  people,
  sortKey,
  direction,
  onSort,
}: {
  people: PersonView[];
  sortKey: PeopleSortKey | null;
  direction: SortDirection;
  onSort: (key: PeopleSortKey) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-3xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted/50">
            {(
              [
                'name',
                'email',
                'organisation',
                'role',
                'status',
                'created',
              ] as const
            ).map((key) => (
              <SortableTableHead
                key={key}
                active={sortKey === key}
                direction={direction}
                onClick={() => onSort(key)}
              >
                {
                  {
                    name: 'Name',
                    email: 'Email',
                    organisation: 'Organisation',
                    role: 'Role',
                    status: 'Status',
                    created: 'Joined',
                  }[key]
                }
              </SortableTableHead>
            ))}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => (
            <TableRow key={person.id}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {(person.name || person.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{person.name || '—'}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {person.email}
              </TableCell>
              <TableCell className="text-sm">
                <OrganisationCell person={person} />
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{person.role}</Badge>
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={person.isActive ? 'active' : 'inactive'}
                  size="sm"
                />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {joinedLabel(person.createdAt)}
              </TableCell>
              <TableCell className="text-right">{person.actions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
