import type { Metadata } from 'next';

import { AccountGate } from '@/components/account/AccountGate';
import { UserProfilePage } from '@/components/account/UserProfilePage';

export const metadata: Metadata = { title: 'Profile' };

export default function ProfileRoute() {
  return (
    <AccountGate wide>
      {({ profile, company }) => (
        <UserProfilePage profile={profile} company={company} />
      )}
    </AccountGate>
  );
}
