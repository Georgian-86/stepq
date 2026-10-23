'use client';

import { ReserveUsernameModal } from './ReserveUsernameModal';
import { UsernameReservedModal } from './UsernameReservedModal';

/** W02 and W03. They read `?modal=`, so mount them inside a <Suspense> boundary. */
export function WaitlistModals() {
  return (
    <>
      <ReserveUsernameModal />
      <UsernameReservedModal />
    </>
  );
}
