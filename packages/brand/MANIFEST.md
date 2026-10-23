# Brand asset manifest

Source: Figma file `ALlGHGf0uFKj8bqXaoZnK1`. SVGs are the unmodified output of `exportAsync({ format: 'SVG_STRING' })`
(www.figma.com is not reachable from the build environment, so the asset-URL route was not used).
PNGs come from `get_screenshot` with `maxDimension = ceil(max(width, height))`, so desktop frames are 1440 px wide.

## Piko (component set `4:265`, variant property `Mood`)

| Asset                | Figma node           |
| -------------------- | -------------------- |
| `svg/piko-happy.svg` | `4:222` (Mood=Happy) |
| `svg/piko-cheer.svg` | `4:236` (Mood=Cheer) |
| `svg/piko-nudge.svg` | `4:248` (Mood=Nudge) |

## Icons (every `icon/<name>` instance in the W1 frames)

The node id is the first instance found. Some icons appear in several colours; see the note below the table.

| Asset                      | Figma node | Instances |
| -------------------------- | ---------- | --------- |
| `svg/icons/footprints.svg` | `9:101`    | 1         |
| `svg/icons/lock.svg`       | `9:163`    | 2         |
| `svg/icons/target.svg`     | `61:1196`  | 1         |
| `svg/icons/gift.svg`       | `61:1200`  | 1         |
| `svg/icons/users.svg`      | `9:186`    | 1         |
| `svg/icons/briefcase.svg`  | `9:198`    | 1         |
| `svg/icons/rupee.svg`      | `9:207`    | 1         |
| `svg/icons/megaphone.svg`  | `9:215`    | 1         |
| `svg/icons/check.svg`      | `9:307`    | 7         |
| `svg/icons/share.svg`      | `9:322`    | 1         |
| `svg/icons/chev.svg`       | `10:152`   | 5         |
| `svg/icons/chevR.svg`      | `10:687`   | 5         |
| `svg/icons/file.svg`       | `10:157`   | 1         |
| `svg/icons/upload.svg`     | `10:212`   | 1         |
| `svg/icons/x.svg`          | `10:217`   | 2         |

The brief's indicative list had `sparkle`, which does not exist in the W1 frames; `footprints`, `share` and `chevR` do and are exported instead.

Instances whose SVG differs from the exported one (other stroke colour or similar): `lock` `10:406`; `check` `9:317`, `10:400`, `10:797`, `10:801`, `10:805`, `10:853`; `chev` `10:208`; `x` `10:914`.

## Figma reference renders (`apps/web/e2e/figma/`)

| File      | Frame node | Frame size    | PNG size    |
| --------- | ---------- | ------------- | ----------- |
| `w01.png` | `9:85`     | 1440 x 2864.5 | 1440 x 2865 |
| `w02.png` | `9:313`    | 1440 x 900    | 1440 x 900  |
| `w03.png` | `9:330`    | 1440 x 900    | 1440 x 900  |
| `w04.png` | `10:127`   | 1440 x 1840.5 | 1440 x 1841 |
| `w05.png` | `10:268`   | 1440 x 1126   | 1440 x 1126 |
| `w06.png` | `10:337`   | 1440 x 1321   | 1440 x 1321 |
| `w07.png` | `10:663`   | 1440 x 900    | 1440 x 900  |
| `m01.png` | `10:668`   | 390 x 844     | 390 x 844   |
| `w08.png` | `10:709`   | 1440 x 1126   | 1440 x 1126 |
| `w09.png` | `10:778`   | 1440 x 1657.5 | 1440 x 1658 |
| `w10.png` | `10:912`   | 1440 x 900    | 1440 x 900  |
| `w11.png` | `10:918`   | 1440 x 1126   | 1440 x 1126 |
| `w15.png` | `11:1108`  | 1440 x 1658   | 1440 x 1658 |
| `w16.png` | `30:1321`  | 1440 x 970    | 1440 x 970  |
| `w17.png` | `30:1576`  | 1440 x 900    | 1440 x 900  |
