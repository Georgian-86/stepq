'use client';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { site, type SiteContent } from '@/content/site';
import { useModalParam } from '@/lib/useModalParam';
import { PLACEHOLDER_TERMS } from './terms';

const TITLE_ID = 'terms-title';

/**
 * W10 Ambassador T&C (`10:912`) at `?modal=terms`. "I agree" ticks the form's checkbox; the
 * form lives outside this modal, so whatever was typed stays. Uses useModalParam: mount
 * inside <Suspense>.
 */
export function TermsModal({
  onAgree,
  content = site,
}: {
  onAgree: () => void;
  content?: SiteContent;
}) {
  const { isOpen, close } = useModalParam('terms');
  const sections = content.ambassadorTerms ?? PLACEHOLDER_TERMS;

  return (
    <Modal open={isOpen} onClose={() => close()} labelledBy={TITLE_ID} wide>
      <div className="flex flex-col gap-[18px]">
        <div className="flex items-start justify-between gap-s">
          <h2
            id={TITLE_ID}
            className="type-web-h2 text-ink max-sm:text-[28px] max-sm:leading-[34px]"
          >
            Ambassador Terms &amp; Conditions
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => close()}
            className="relative mt-[3px] flex shrink-0 rounded-pill bg-mint p-s after:absolute after:-inset-[4px] after:content-['']"
          >
            <Icon name="x-ink" />
          </button>
        </div>
        {sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-[18px]">
            <h3 className="type-web-body-strong text-ink">{s.title}</h3>
            <p className="type-web-small whitespace-pre-line text-muted">{s.body}</p>
          </section>
        ))}
        <Button
          className="w-full"
          onClick={() => {
            onAgree();
            close();
          }}
        >
          I agree
        </Button>
      </div>
    </Modal>
  );
}
