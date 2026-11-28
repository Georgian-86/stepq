import type { ReactElement } from 'react';
import * as account from './account';
import * as auth from './auth';
import * as engagement from './engagement';
import * as onboarding from './onboarding';
import * as pro from './pro';

/** Props for every member-facing lifecycle and account email. */
export type LifecycleTemplateProps = {
  authConfirmSignup: auth.AuthConfirmSignupProps;
  authResetPassword: auth.AuthResetPasswordProps;
  authEmailChange: auth.AuthEmailChangeProps;
  passwordChanged: account.PasswordChangedProps;
  accountDeleted: account.AccountDeletedProps;
  parentConsentReminder: account.ParentConsentReminderProps;
  parentConsentGranted: account.ParentConsentGrantedProps;
  welcome: onboarding.WelcomeProps;
  connectSteps: onboarding.ConnectStepsProps;
  findFriends: onboarding.FindFriendsProps;
  weeklySummary: engagement.WeeklySummaryProps;
  milestone: engagement.MilestoneProps;
  friendRequest: engagement.FriendRequestProps;
  challengeResult: engagement.ChallengeResultProps;
  winBack: engagement.WinBackProps;
  welcomePro: pro.WelcomeProProps;
  proRenewalReminder: pro.ProRenewalReminderProps;
  proBillingIssue: pro.ProBillingIssueProps;
  proEnded: pro.ProEndedProps;
  qrunHostApproved: pro.QrunHostApprovedProps;
};
export type LifecycleTemplateName = keyof LifecycleTemplateProps;

type Def<P> = { subject: (p: P) => string; element: (p: P, siteUrl: string) => ReactElement };
const def = <P,>(
  subject: (p: P) => string,
  C: (p: P & { siteUrl: string }) => ReactElement,
): Def<P> => ({ subject, element: (p, siteUrl) => <C {...p} siteUrl={siteUrl} /> });

export const lifecycleDefs: { [K in LifecycleTemplateName]: Def<LifecycleTemplateProps[K]> } = {
  authConfirmSignup: def(auth.authConfirmSignupSubject, auth.AuthConfirmSignup),
  authResetPassword: def(auth.authResetPasswordSubject, auth.AuthResetPassword),
  authEmailChange: def(auth.authEmailChangeSubject, auth.AuthEmailChange),
  passwordChanged: def(account.passwordChangedSubject, account.PasswordChanged),
  accountDeleted: def(account.accountDeletedSubject, account.AccountDeleted),
  parentConsentReminder: def(account.parentConsentReminderSubject, account.ParentConsentReminder),
  parentConsentGranted: def(account.parentConsentGrantedSubject, account.ParentConsentGranted),
  welcome: def(onboarding.welcomeSubject, onboarding.Welcome),
  connectSteps: def(onboarding.connectStepsSubject, onboarding.ConnectSteps),
  findFriends: def(onboarding.findFriendsSubject, onboarding.FindFriends),
  weeklySummary: def(engagement.weeklySummarySubject, engagement.WeeklySummary),
  milestone: def(engagement.milestoneSubject, engagement.Milestone),
  friendRequest: def(engagement.friendRequestSubject, engagement.FriendRequest),
  challengeResult: def(engagement.challengeResultSubject, engagement.ChallengeResult),
  winBack: def(engagement.winBackSubject, engagement.WinBack),
  welcomePro: def(pro.welcomeProSubject, pro.WelcomePro),
  proRenewalReminder: def(pro.proRenewalReminderSubject, pro.ProRenewalReminder),
  proBillingIssue: def(pro.proBillingIssueSubject, pro.ProBillingIssue),
  proEnded: def(pro.proEndedSubject, pro.ProEnded),
  qrunHostApproved: def(pro.qrunHostApprovedSubject, pro.QrunHostApproved),
};

export { SUPABASE } from './auth';
export { PRO_PERKS } from './pro';
export { catalog, type CatalogEntry, type MailCategory } from './catalog';
