'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useModalParam } from '@/lib/useModalParam';
import { useWaitlist } from './WaitlistState';

const TITLE_ID = 'reserved-title';
const INVITE_URL = 'https://stepq.in/join';

/** W03 Username reserved (`9:330`), at `?modal=reserved&u=<name>`. */
export function UsernameReservedModal() {
  const { isOpen, close, params } = useModalParam('reserved');
  const { join } = useWaitlist();
  const username = params.get('u');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(INVITE_URL);
      setCopied(true);
    } catch {
      // Clipboard blocked: the link text stays visible to copy by hand.
    }
  }

  const done = () => close(['u']);

  return (
    <Modal open={isOpen && !!username} onClose={done} labelledBy={TITLE_ID}>
      <div className="flex flex-col items-center gap-[18px] text-center">
        <span className="flex rounded-pill bg-leaf-soft p-m">
          <Icon name="check-large-deep" />
        </span>
        <h2 id={TITLE_ID} className="type-web-h2 break-all text-ink">
          @{username} is yours
        </h2>
        <p className="type-web-body text-muted">
          {join?.email
            ? `It'll be waiting for you when you sign up with ${join.email}.`
            : "It'll be waiting for you when you sign up."}
        </p>
        <button
          type="button"
          onClick={copy}
          className="type-web-small-strong inline-flex min-h-[44px] items-center gap-[10px] rounded-[14px] bg-mint px-m py-[12px] text-ink"
        >
          <Icon name={copied ? 'check-deep' : 'share-deep'} />
          {copied ? 'Link copied' : 'Invite friends: stepq.in/join'}
          <span className="sr-only">{copied ? '' : '(copy link)'}</span>
        </button>
        <span role="status" className="sr-only">
          {copied ? 'Invite link copied' : ''}
        </span>
        <Button className="w-full" onClick={done}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
