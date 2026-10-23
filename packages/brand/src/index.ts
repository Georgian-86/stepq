import pikoHappy from '../svg/piko-happy.svg?raw';
import pikoCheer from '../svg/piko-cheer.svg?raw';
import pikoNudge from '../svg/piko-nudge.svg?raw';
import iconFootprints from '../svg/icons/footprints.svg?raw';
import iconLock from '../svg/icons/lock.svg?raw';
import iconTarget from '../svg/icons/target.svg?raw';
import iconGift from '../svg/icons/gift.svg?raw';
import iconUsers from '../svg/icons/users.svg?raw';
import iconBriefcase from '../svg/icons/briefcase.svg?raw';
import iconRupee from '../svg/icons/rupee.svg?raw';
import iconMegaphone from '../svg/icons/megaphone.svg?raw';
import iconCheck from '../svg/icons/check.svg?raw';
import iconShare from '../svg/icons/share.svg?raw';
import iconChev from '../svg/icons/chev.svg?raw';
import iconChevR from '../svg/icons/chevR.svg?raw';
import iconFile from '../svg/icons/file.svg?raw';
import iconUpload from '../svg/icons/upload.svg?raw';
import iconX from '../svg/icons/x.svg?raw';

export type PikoMood = 'happy' | 'cheer' | 'nudge';

export const pikoSvg: Record<PikoMood, string> = {
  happy: pikoHappy,
  cheer: pikoCheer,
  nudge: pikoNudge,
};

export const iconSvg = {
  footprints: iconFootprints,
  lock: iconLock,
  target: iconTarget,
  gift: iconGift,
  users: iconUsers,
  briefcase: iconBriefcase,
  rupee: iconRupee,
  megaphone: iconMegaphone,
  check: iconCheck,
  share: iconShare,
  chev: iconChev,
  chevR: iconChevR,
  file: iconFile,
  upload: iconUpload,
  x: iconX,
} as const satisfies Record<string, string>;

export type IconName = keyof typeof iconSvg;
