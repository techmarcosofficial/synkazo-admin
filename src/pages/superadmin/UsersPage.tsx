import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/shared/PageHeader';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TenantUsersPanel = lazy(() => import('./people/TenantUsersPanel'));
const SuperAdminsPanel = lazy(() => import('./SuperAdminsPage'));

type PeopleTab = 'users' | 'super-admins';

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: PeopleTab =
    searchParams.get('tab') === 'super-admins' ? 'super-admins' : 'users';

  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'super-admins') params.set('tab', 'super-admins');
    else params.delete('tab');
    setSearchParams(params);
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        title="Users"
        description="Find tenant users and manage platform administrators."
      />
      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList aria-label="People directory">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="super-admins">Super Admins</TabsTrigger>
        </TabsList>
        <Suspense fallback={<SkeletonList count={5} />}>
          {tab === 'users' ? <TenantUsersPanel /> : <SuperAdminsPanel />}
        </Suspense>
      </Tabs>
    </div>
  );
}
