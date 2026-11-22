/**
 * StepQ's legal pages: privacy policy (/privacy), terms of use (/terms) and the grievance
 * officer (/grievance), as Markdown. Written for India's DPDP Act 2023 and DPDP Rules 2025, the
 * IT Act 2000 and IT (Intermediary Guidelines) Rules 2021, Google Play's policies and, for anyone
 * in the EU or UK, the GDPR. Not legal advice: have a lawyer review before launch.
 *
 * When any of these change in a way people must agree to again, bump POLICY_VERSION here, in the
 * app (Legal.POLICY_VERSION) and the `notice_version` column default in server/schema.ts.
 */

export const CONTACT_EMAIL = 'connect@stepq.in';

/** The date of the current Terms and Privacy policy. */
export const POLICY_VERSION = '2026-11-24';
export const POLICY_DATE = '24 November 2026';

/**
 * Who is responsible for your data (the "Data Fiduciary"). Set `legalName` and `address` to the
 * registered company (or proprietor) before launch: the DPDP Rules and IT Rules both ask for
 * them. Until then the pages say "StepQ" and give the email only.
 */
export const COMPANY = {
  legalName: 'StepQ',
  address: null as string | null,
};

/**
 * The Grievance Officer the IT Rules 2021 (rule 3(2)) and DPDP Rules (rule 14) require. Put a
 * real person's name here before launch, and a dedicated mailbox once it exists.
 */
export const GRIEVANCE_OFFICER = {
  name: null as string | null,
  email: CONTACT_EMAIL,
};

const officerLine = `${GRIEVANCE_OFFICER.name ? `${GRIEVANCE_OFFICER.name}, ` : ''}Grievance Officer, ${COMPANY.legalName}`;
const addressLine = COMPANY.address ? `\n- **Post:** ${COMPANY.address}` : '';
const mail = (e: string) => `[${e}](mailto:${e})`;

export const PRIVACY_POLICY = `
# Who we are

${COMPANY.legalName} ("StepQ", "we") makes StepQ, a walking app for India on Android and iPhone, and runs this website, stepq.in. Under India's Digital Personal Data Protection Act, 2023 (the DPDP Act) we are the **Data Fiduciary** for the personal data described here: we decide why and how it is used. This policy is our notice to you under section 5 of the Act and the DPDP Rules, 2025. Last updated ${POLICY_DATE}.

Questions, or anything about your data: ${mail(CONTACT_EMAIL)}.${addressLine}

# Summary

- StepQ is for people **13 and older**. If you are 13 to 17, a parent or legal guardian must agree before we keep your data.
- The app keeps your account, profile, daily step totals, what you do with friends and groups, and what you post in the community. The website only keeps what you type into its forms.
- We never sell your data, never use it for advertising, and never share health or step data except with the hosting providers that run StepQ for us.
- You can see, download, correct and delete your data, and withdraw your consent, from the app (Profile → Privacy and data) or by email. Deleting your account is in Profile → Account.
- Complaints go to our Grievance Officer (see [/grievance](/grievance)), and you can also complain to the Data Protection Board of India.

# What the app collects

We collect only what the app needs to work, and we ask for each permission only when you use the feature that needs it.

### Your account

Your email address and a password (stored by Supabase only as a secure one-way hash). If you sign in with Google or Apple, they share your name, email address and, for Google, your profile picture; we never see your Google or Apple password.

### Your profile

The name and username you choose, your gender and date of birth, your avatar choices and your daily step goal. We ask for your date of birth to check you are 13 or older, to know when a parent's consent is needed, and to set fair leaderboards; it cannot be changed after sign-up.

### Health and step data

Daily totals of your steps, and the distance, calories and active minutes worked out from them. With your permission ("Physical activity" on Android) StepQ reads the step counter built into your phone. If you connect **Health Connect**, StepQ instead **reads, and never writes**, your steps, distance, exercise sessions and active calories. We keep one total per day: no GPS route, no raw sensor data, no heart rate or other health records.

Data from Health Connect and the step counter is used **only** to show your activity to you, to the friends and groups you choose and in rankings, and to run streaks, goals and challenges. It is never used for advertising, never sold, never used to decide anything about your credit, insurance or employment, and never shared with anyone except the hosting providers listed below. This follows Google Play's Health Connect policy.

### Friends, groups, QRuns and challenges

Friend requests, groups, challenges and QRuns (group walks) you create or join, water reminders you send, and the steps you choose to share. A QRun you create has the meeting place you pick (a name and map position).

### Community posts

What you post, reply, like, repost and report in the community, and the people you block.

### Contacts (only if you tap "Find contacts")

To find friends already on StepQ, the app turns the email addresses in your phone's contacts into one-way hashes **on your phone** and sends only the hashes to match against StepQ accounts. Neither your contacts' addresses nor their hashes are stored.

### Location (only on the QRun tab, if you allow it)

A rough, city-block level location to show QRuns near you and the name of your area. It is used on your phone and to search places, and is **not stored** on our servers.

### Notifications and crashes

If you allow notifications, a device token from Firebase Cloud Messaging so we can send them. If the app crashes, a crash report from Firebase Crashlytics with the device model, Android version and what went wrong.

# Who can see your activity

Your name, username, avatar and step totals are visible to the friends you accept, to people in the groups, QRuns and challenges you join, and in your country's rankings. Your community posts are visible to everyone signed in to StepQ. Your email, date of birth and gender are never shown to other users. Authorised StepQ team members can see account and activity data to run the service, support you and handle reports.

# What the website collects

We only collect what you type into a form on this site:

- **Waitlist:** your name, email, gender, age group, country, the username you reserve, and where you came from (a referral or campaign link), if any.
- **Join the team:** your name, email, phone, the role, an optional link (such as LinkedIn or a portfolio), why you want to join, and your résumé PDF.
- **Become an ambassador:** your name, email, phone, city, Instagram handle, follower range, college or company, and your plan.
- **Fund StepQ:** your name, phone, the amount, and whether to show your name on the backers wall. Payment happens in your own UPI app; we never see your UPI PIN, bank or card details.
- **Connect with the founder:** your name, email, optional phone, the topic and your message.

Each form says what it is for before you send it. To stop abuse we keep a one-way hash of your IP address for a few minutes, never the address itself. Our hosting provider (Vercel) keeps short-lived server logs, which include IP addresses, for security.

### Cookies and similar storage

We do **not** use advertising or tracking cookies, and no third-party scripts track you here. The site uses:

- your browser's session storage, to remember a form you just sent (cleared when you close the tab), and local storage, to remember that you dismissed the waitlist pop-up or the privacy notice;
- one sign-in cookie, only for StepQ admins on /admin;
- anonymous counting of page visits and button or link clicks (the page, what was clicked and the site that linked here), with no cookie and nothing that identifies you. You can turn it off with "Don't count my visits" in the notice at the bottom of the page, and we skip it when your browser sends Global Privacy Control or Do Not Track.

# Why we use it, and on what basis

We use your data only for the purposes below, on the basis of the **consent** you give when you sign up or send a form (DPDP Act section 6), or for the legitimate uses the Act allows (section 7), such as meeting a legal obligation.

- To run the app: count your steps, track your goal, streak and score, and show your progress to you and the people you choose.
- To run the community: show posts, act on reports and keep StepQ safe.
- To send the reminders and updates you ask for, and to fix crashes.
- To tell you when StepQ launches and hold the username you reserved.
- To review applications and reply to you.
- To verify backings and, if you agree, show your first name and initial on the backers wall.
- To answer your message.
- To ask a parent's consent for users aged 13 to 17, and keep a record of it.
- To meet our legal obligations, such as keeping certain records and responding to lawful requests from authorities.

We do not use your data to profile you for advertising, and we do not make decisions about you by automated means alone.

# Where it is stored

Your data is stored in a database hosted by **Supabase in Mumbai, India**. We use these service providers (Data Processors), each under contract to use it only to provide their service to us:

- **Supabase** (database and sign-in), Mumbai, India.
- **Vercel** (website hosting), which may serve pages from outside India.
- **Google**: Google Sign-In, Firebase Cloud Messaging (notifications) and Firebase Crashlytics (crash reports), which may process data outside India.
- **Apple**: Sign in with Apple, if you use it.
- **Resend** or our email provider, to send emails to the StepQ team and to you, which may process data outside India.

Transfers outside India are made only to countries the Government of India has not restricted under section 16 of the DPDP Act.

# How long we keep it

We keep personal data only as long as the purpose needs it, then delete it:

- **Accounts waiting for a parent's consent:** deleted after 7 days if no parent agrees, or straight away if they say no.
- **App account, profile, steps and activity:** while you have an account. If you delete your account, it is deleted straight away from the live database, and from backups within 30 days. As the IT Rules 2021 (rule 3(1)(h)) require, we keep only your email, name and username for 180 days after deletion, then delete them.
- **Inactive app accounts:** if you do not open StepQ for 3 years, we will email you, and delete your account if you do not sign in within 48 hours of that notice.
- **Community posts:** until you delete them or your account. Posts we remove for breaking the rules, and the reports about them, are kept for 180 days for any investigation, then deleted.
- **Waitlist:** until 6 months after StepQ launches, or sooner if you ask to leave.
- **Job and ambassador applications:** 1 year after we decide, unless you join us.
- **Messages to the founder:** 2 years.
- **Backings:** as long as tax and accounting law requires (up to 8 years).
- **Security logs:** 1 year, as the DPDP Rules require.
- **Anonymous visit counts:** these are not personal data.

# Your rights

Under the DPDP Act you have the right to:

- **Access:** get a summary of your data and how it is used. In the app, Profile → Privacy and data → **Download my data** gives you a copy of everything we hold about your account.
- **Correction and completion:** fix your name, username, avatar and goal in the app, or ask us to correct anything else.
- **Erasure:** delete your account in the app (Profile → Account → Delete account), or ask us to delete website submissions.
- **Withdraw consent:** as easily as you gave it. Stop StepQ reading your steps, contacts or location at any time in your phone's settings (Apps → StepQ → Permissions) or in Health Connect; withdrawing consent to everything means deleting your account. Withdrawing does not affect what was done before.
- **Nominate** someone to exercise these rights for you if you die or become unable to.
- **Grievance redressal:** complain to our Grievance Officer, and then to the **Data Protection Board of India** if you are not satisfied.

Email ${mail(CONTACT_EMAIL)} from the address you used. We may ask you to confirm it is you. We reply as soon as we can, and in any case within 30 days (the DPDP Rules allow up to 90).

### If you are in the EU or UK

StepQ is built for India, but if the GDPR or UK GDPR applies to you, our legal bases are your consent (including your **explicit consent** for step and health data), performing our contract with you (running your account), and our legitimate interests (keeping StepQ safe). You also have the rights to object, to restrict processing and to data portability, and to complain to your local data protection authority. Transfers out of the EU or UK rely on our providers' standard contractual clauses.

# Children and teens

StepQ is not for children under 13, and the app checks your date of birth at sign-up.

The DPDP Act treats anyone under 18 as a child. If you are **13 to 17**, the app asks for a parent or legal guardian's name and email, and we email them a one-time link. On stepq.in they see what StepQ collects, confirm they are your parent or guardian and an adult, and say yes or no (section 9(1) of the Act and rule 10 of the DPDP Rules). Until they say yes, StepQ keeps only your sign-in and profile and your account cannot save steps, add friends or post. If they say no, or do not answer within 7 days, we delete the account. A parent can withdraw consent at any time by emailing ${mail(CONTACT_EMAIL)}, and we will delete the account.

For everyone under 18 we never show advertising, never track behaviour across other apps or sites, and never use their data in ways likely to harm their well-being (section 9(2) and 9(3)).

The website's forms are for adults only. If you think a child has given us their data without a parent's consent, email ${mail(CONTACT_EMAIL)} and we will delete it.

# Security and breaches

Data is encrypted in transit (HTTPS) and at rest by our providers. Access is limited by row-level security, so each person can only reach their own data and what others choose to share, and only named admins can see the admin dashboard. If a personal data breach happens, we will tell the Data Protection Board of India and every affected person without delay, with what happened, the likely impact and what we are doing about it, as section 8(6) of the DPDP Act and rule 7 of the DPDP Rules require.

# Grievance Officer

${officerLine}

- **Email:** ${mail(GRIEVANCE_OFFICER.email)}${addressLine}

See [/grievance](/grievance) for how complaints are handled and how long each step takes.

# Changes

If this policy changes, the new version will be posted here with a new date. If a change affects how we use data you already gave us, we will tell you in the app or by email and, where the law needs it, ask for your consent again.
`;

export const TERMS = `
# About these terms

These terms are an agreement between you and ${COMPANY.legalName} ("StepQ", "we") for using the StepQ app and stepq.in. By creating an account or using StepQ you agree to them and to our [Privacy policy](/privacy). Last updated ${POLICY_DATE}.

# Who can use StepQ

You must be **13 or older**. If you are 13 to 17, a parent or legal guardian must agree to these terms and our Privacy policy for you, through the consent email StepQ sends them, before you can use the app; they are responsible for your use of StepQ. Website forms (waitlist, applications, ambassadors, funding) are for adults 18 and older. One account per person; keep your password safe and tell us at ${mail(CONTACT_EMAIL)} if someone else gets into your account.

# Health

StepQ shows step counts, distance and calories as estimates for motivation only. It is **not a medical device** and does not give medical advice. Check with a doctor before starting a new exercise routine, and stop if you feel unwell. Take care of your own safety on walks and QRuns: watch the road, and walk only where it is safe.

# Community rules

StepQ is a friendly place to walk together. As the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 require, you must not post, share or send anything that:

- belongs to someone else and you have no right to share;
- is obscene, pornographic, paedophilic, invades someone's bodily or other privacy, insults or harasses anyone on the basis of gender, or is racially or ethnically objectionable;
- is harmful to a child;
- infringes a patent, trademark, copyright or other proprietary right;
- deceives or misleads about where it came from, or knowingly spreads false or misleading information, including information the Government has identified as fake;
- impersonates another person;
- threatens the unity, integrity, defence, security or sovereignty of India, its friendly relations with other countries or public order, incites any offence, or insults another nation;
- contains viruses or other code meant to disrupt any computer resource;
- is an online game or advertisement not allowed under Indian law; or
- breaks any law in force.

Also: no spam, scams, fake step counts, buying or selling accounts, or bullying. Don't share other people's personal details (phone numbers, addresses) without their permission.

### Reporting and blocking

Tap **…** on any post to **Report** it or **Block** the person who wrote it. Blocking hides their posts from you and yours from them. A post reported by several people is hidden straight away while we review it. To complain about content, or to tell us about content that shows you in a sexual act, in the nude or partially nude, or impersonates you, contact the Grievance Officer ([/grievance](/grievance)); we act on such content within 24 hours.

### What we can do

We may remove content or suspend or close accounts that break these terms or the law, and must act on lawful orders from courts and the Government. Where the law requires, we keep removed content and related records for 180 days for investigation, and share information with authorities who lawfully ask for it. We remind all users of these rules at least once a year.

# Your content

You keep ownership of what you post. You give StepQ a non-exclusive, royalty-free licence to store, show and share it inside StepQ, to the people you share it with, for as long as it is on StepQ. Deleting a post or your account ends this licence (except for copies others reposted while it was up, and records the law makes us keep).

# QRuns and events

QRuns are walks people organise. StepQ is not the organiser unless the QRun says it is a StepQ event. For paid StepQ events, the price and what it includes are shown before you join.

# Pro and payments

If StepQ offers paid features, the price and terms will be shown before you pay. Backings through "Fund StepQ" are voluntary support and are not an investment, a donation with tax benefits, or a purchase.

# Ending your account

You can delete your account at any time in the app (Profile → Account → Delete account). We may close accounts that break these terms; where we can, we will tell you why.

# Liability

StepQ is provided "as is". To the extent the law allows, we are not responsible for indirect losses, or for what other users post or do. Nothing in these terms limits rights you have under Indian consumer law.

# Law and disputes

These terms are governed by the laws of India. Please contact the Grievance Officer first; if we can't resolve it, the courts of India have jurisdiction.

# Changes

We may update these terms. If a change matters, we will tell you in the app or by email before it takes effect, and you can delete your account if you don't agree.

# Contact

${mail(CONTACT_EMAIL)}${addressLine}
`;

export const GRIEVANCE = `
# Grievance Officer

${officerLine}

- **Email:** ${mail(GRIEVANCE_OFFICER.email)}${addressLine}
- **Hours:** Monday to Friday, 10 am to 6 pm IST. Emails are read every working day.

Appointed under rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and section 8(10) of the Digital Personal Data Protection Act, 2023.

# What you can complain about

- Anything about your personal data: how StepQ uses it, a request we didn't answer, or a request to see, correct or delete it.
- A post, reply or account in the StepQ community that breaks our [community rules](/terms#community-rules) or the law.
- Content that shows you in a sexual act, nude or partially nude, or impersonates you, including morphed images.

# How to complain

Email ${mail(GRIEVANCE_OFFICER.email)} with the subject "Grievance", and include:

- your name, and the email or StepQ username of your account, if you have one;
- what the complaint is about (for a post: the author's username, what it says and roughly when it was posted; a screenshot helps);
- what you would like us to do.

You can also send privacy requests from the [Connect with the founder](/?modal=founder&topic=privacy) form, choosing "Privacy or data request". In the app, the **Report** option on any post reaches the same team.

# What happens next

- **Within 24 hours:** we acknowledge your complaint.
- **Within 24 hours:** for content showing you in a sexual act, nude or partially nude, or impersonating you, we remove it or disable access to it.
- **Within 15 days:** we resolve your complaint and tell you what we did, as the IT Rules require. For personal data requests we reply within 30 days at the latest (the DPDP Rules allow up to 90).

If you are not satisfied with our answer, you can complain to the **Data Protection Board of India** about personal data, or appeal content decisions to the Grievance Appellate Committee set up under the IT Rules (gac.gov.in).
`;
