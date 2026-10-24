import { GUTTER } from '@/components/site/links';
import { site, type SiteContent } from '@/content/site';
import { renderPolicy } from './markdown';

const body =
  'type-web-body text-muted [&_h2]:type-web-h3 [&_h2]:mt-[28px] [&_h2]:mb-[28px] [&_h2]:text-ink [&_h2:first-child]:mt-0 ' +
  '[&_h3]:type-web-body-strong [&_h3]:mt-[28px] [&_h3]:mb-[12px] [&_h3]:text-ink ' +
  '[&_p]:mb-[28px] [&_ul]:mb-[28px] [&_ul]:list-disc [&_ul]:pl-[24px] [&_ol]:mb-[28px] [&_ol]:list-decimal [&_ol]:pl-[24px] ' +
  '[&_a]:text-deep [&_a]:underline [&_strong]:text-ink';

/** W15 Privacy policy (`11:1108`): mint title band, "On this page" card, policy sections. */
export function PrivacyPolicy({ content = site }: { content?: SiteContent }) {
  const policy = content.privacyPolicy ? renderPolicy(content.privacyPolicy) : null;
  return (
    <>
      <section aria-labelledby="privacy-title" className="bg-mint">
        <div
          className={`mx-auto flex max-w-[1440px] flex-col gap-[12px] py-[48px] md:py-[64px] ${GUTTER}`}
        >
          <h1
            id="privacy-title"
            className="type-web-hero text-ink max-md:text-[44px] max-md:leading-[48px]"
          >
            Privacy policy
          </h1>
        </div>
      </section>
      <div
        className={`mx-auto flex max-w-[1440px] flex-col gap-[40px] py-[56px] lg:flex-row lg:gap-[64px] lg:py-[88px] ${GUTTER}`}
      >
        {policy ? (
          <>
            {policy.headings.length > 0 && (
              <nav
                aria-label="On this page"
                className="flex h-fit flex-col gap-[4px] self-stretch rounded-[20px] bg-page p-l lg:w-[300px] lg:shrink-0 lg:self-start"
              >
                <p className="type-label text-muted">On this page</p>
                {policy.headings.map((h) => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    className="type-web-small-strong py-[2px] text-deep hover:underline"
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            )}
            <div
              className={`min-w-0 flex-1 ${body}`}
              dangerouslySetInnerHTML={{ __html: policy.html }}
            />
          </>
        ) : (
          <div role="status" className="type-web-body flex-1 rounded-[20px] bg-page p-l text-muted">
            <p className="type-web-h3 mb-[12px] text-ink">Policy coming soon</p>
            <p>
              Our privacy policy is being finalised. Questions in the meantime?{' '}
              <a href={`mailto:${content.contactEmail}`} className="text-deep underline">
                {content.contactEmail}
              </a>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
