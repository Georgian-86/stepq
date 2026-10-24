'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useModalParam } from '@/lib/useModalParam';
import { FOUNDER_TITLE_ID, FounderForm, isTopic } from './FounderForm';
import { MessageSent, SENT_TITLE_ID } from './MessageSent';

/**
 * W16 → W17 at `?modal=founder` (optional `&topic=partnership|investment|feedback|press|other`
 * preselects a chip). Mounted once in the site layout, inside <Suspense> (useModalParam).
 * Esc, Cancel, the overlay and browser Back close it.
 */
export function FounderModal() {
  const { isOpen, close, params } = useModalParam('founder');
  const topic = params.get('topic');
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Each opening starts on the form (the Modal unmounts its children once closed).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setSentTo(null);
  }

  const done = () => close(['topic']);

  return (
    <Modal
      open={isOpen}
      onClose={done}
      labelledBy={sentTo === null ? FOUNDER_TITLE_ID : SENT_TITLE_ID}
    >
      {sentTo === null ? (
        <FounderForm topic={isTopic(topic) ? topic : null} onSent={setSentTo} onCancel={done} />
      ) : (
        <MessageSent firstName={sentTo} onDone={done} />
      )}
    </Modal>
  );
}
