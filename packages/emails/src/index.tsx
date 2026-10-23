import { render as reactRender } from '@react-email/render';
import type { ReactElement } from 'react';
import {
  AmbassadorAlert,
  ambassadorAlertSubject,
  type AmbassadorAlertProps,
} from './AmbassadorAlert';
import {
  AmbassadorApproved,
  ambassadorApprovedSubject,
  type AmbassadorApprovedProps,
} from './AmbassadorApproved';
import { BackingAlert, backingAlertSubject, type BackingAlertProps } from './BackingAlert';
import { FounderMessage, founderMessageSubject, type FounderMessageProps } from './FounderMessage';
import { ReserveLink, reserveLinkSubject, type ReserveLinkProps } from './ReserveLink';
import {
  TeamApplicationAlert,
  teamApplicationAlertSubject,
  type TeamApplicationAlertProps,
} from './TeamApplicationAlert';

export type TemplateProps = {
  ambassadorApproved: AmbassadorApprovedProps;
  founderMessage: FounderMessageProps;
  teamApplicationAlert: TeamApplicationAlertProps;
  ambassadorAlert: AmbassadorAlertProps;
  backingAlert: BackingAlertProps;
  reserveLink: ReserveLinkProps;
};
export type TemplateName = keyof TemplateProps;
export type Rendered = { subject: string; html: string; text: string };
export type RenderOptions = { siteUrl: string };

type Def<P> = { subject: (p: P) => string; element: (p: P, siteUrl: string) => ReactElement };
const defs: { [K in TemplateName]: Def<TemplateProps[K]> } = {
  ambassadorApproved: {
    subject: ambassadorApprovedSubject,
    element: (p, siteUrl) => <AmbassadorApproved {...p} siteUrl={siteUrl} />,
  },
  founderMessage: {
    subject: founderMessageSubject,
    element: (p, siteUrl) => <FounderMessage {...p} siteUrl={siteUrl} />,
  },
  teamApplicationAlert: {
    subject: teamApplicationAlertSubject,
    element: (p, siteUrl) => <TeamApplicationAlert {...p} siteUrl={siteUrl} />,
  },
  ambassadorAlert: {
    subject: ambassadorAlertSubject,
    element: (p, siteUrl) => <AmbassadorAlert {...p} siteUrl={siteUrl} />,
  },
  backingAlert: {
    subject: backingAlertSubject,
    element: (p, siteUrl) => <BackingAlert {...p} siteUrl={siteUrl} />,
  },
  reserveLink: {
    subject: reserveLinkSubject,
    element: (p, siteUrl) => <ReserveLink {...p} siteUrl={siteUrl} />,
  },
};

export async function render<K extends TemplateName>(
  name: K,
  props: TemplateProps[K],
  { siteUrl }: RenderOptions,
): Promise<Rendered> {
  const def = defs[name] as Def<TemplateProps[K]> | undefined;
  if (!def) throw new Error(`Unknown email template: ${String(name)}`);
  const base = siteUrl.replace(/\/+$/, '');
  const el = def.element(props, base);
  const [html, text] = await Promise.all([reactRender(el), reactRender(el, { plainText: true })]);
  return { subject: def.subject(props), html, text };
}
