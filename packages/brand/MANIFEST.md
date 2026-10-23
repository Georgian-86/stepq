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

File names are `<icon>-<colour token>.svg`; the token is the Figma colour variable (deep `#0A7F3F`, ink `#0E2A1A`, muted `#55695D`, white).
Each distinct colour variant found in the frames is exported unmodified; no recolouring. Where one colour appears at several sizes
(check 16/20/32 px, chev and x 18/20 px) the smallest instance used in the frames is exported and others are listed as notes.
`IconName` is the set of these file names. Regenerate `src/generated.ts` with `pnpm --filter @stepq/brand generate`.

| Asset                            | Figma node                         | Size |
| -------------------------------- | ---------------------------------- | ---- |
| `svg/icons/footprints-deep.svg`  | `9:101`                            | 18   |
| `svg/icons/lock-muted.svg`       | `9:163`                            | 16   |
| `svg/icons/target-deep.svg`      | `61:1196`                          | 26   |
| `svg/icons/gift-deep.svg`        | `61:1200`                          | 26   |
| `svg/icons/users-deep.svg`       | `9:186`                            | 26   |
| `svg/icons/briefcase-ink.svg`    | `9:198`                            | 26   |
| `svg/icons/rupee-ink.svg`        | `9:207`                            | 26   |
| `svg/icons/megaphone-ink.svg`    | `9:215`                            | 26   |
| `svg/icons/check-deep.svg`       | `9:307`                            | 16   |
| `svg/icons/check-white.svg`      | `10:400` (also `10:853`, 16 px)    | 16   |
| `svg/icons/share-deep.svg`       | `9:322`                            | 18   |
| `svg/icons/chev-deep.svg`        | `10:152`                           | 18   |
| `svg/icons/chev-ink.svg`         | `10:208`                           | 20   |
| `svg/icons/chev-r-muted.svg`     | `10:687`                           | 18   |
| `svg/icons/file-deep.svg`        | `10:157`                           | 18   |
| `svg/icons/upload-deep.svg`      | `10:212`                           | 22   |
| `svg/icons/x-muted.svg`          | `10:217`                           | 18   |
| `svg/icons/x-ink.svg`            | `10:914`                           | 20   |
| `svg/icons/check-large-deep.svg` | `9:317` (W03)                      | 32   |
| `svg/icons/live-dot-deep.svg`    | `10:126` (W01 live count, ellipse) | 10   |

The brief's indicative list had `sparkle`, which does not exist in the W1 frames.

Size-only instances not exported (same colour as an exported variant): `check` deep at 20 px `10:797`, `10:801`, `10:805`; `lock` muted `10:406` (same size, slightly different path coordinates).

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
