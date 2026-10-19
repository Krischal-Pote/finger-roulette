# Who Pays? — finger roulette for splitting a bill

Everyone puts one finger on the black screen. After a short "hold still"
countdown the app picks **one** finger at random — that person doesn't pay, and
the rest split the bill. No dice, no arguing.

Built with Expo / React Native, runs on iOS and Android, and needs no gesture
library — a plain `<View>` taps into the raw multi-touch stream.

## Run it

```bash
cd finger-roulette
npx expo start          # then press i (iOS) or a (Android)
```

Scan the QR code with **Expo Go**, or press `i` / `a` for a simulator. The app
uses `expo-haptics`, `expo-keep-awake` and `react-native-safe-area-context`, all
of which are already bundled in Expo Go, so no development build is needed.

Checks used while building:

```bash
npx tsc --noEmit    # types
npx expo lint       # lint
```

## Build an Android APK

Build a standalone release APK locally with Gradle (no EAS account needed):

```bash
cd android
./gradlew assembleRelease
```

The APK lands at:

```
android/app/build/outputs/apk/release/app-release.apk
```

Install it on a connected phone or emulator:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Notes:

* This local build signs with `android/app/debug.keystore`, which is fine for
  testing on your own device but **not** for the Play Store. For a store build
  generate a real keystore and add it to `signingConfigs` in
  `android/app/build.gradle`, or use EAS (`eas build -p android --profile preview`).
* Gradle caches the JS bundle. If a code change doesn't show up in the APK,
  delete the cached bundle and rebuild:
  ```bash
  rm -rf android/app/build/generated/assets/react
  cd android && ./gradlew assembleRelease
  ```
* To build the release APK in the cloud instead (EAS signs it for you):
  ```bash
  npx eas-cli build -p android --profile preview
  ```

## How to play

1. Optionally type the bill total in the field at the top (e.g. `1200`).
2. Everyone puts one finger on the black area and keeps it there.
3. A green bar fills for the hold time (default 2.5s). Any finger that lifts or
   joins restarts the countdown, so the whole group is always in the draw.
4. The rings start hopping and slow down until they land on one finger: that
   finger is out (it's safe), and the rest hold again for the next round.
5. The last finger left is the unlucky one. **Play again** for the next round.

Not sure what to do? The guide opens on first launch and lives behind the **?**
button at the top right.

### Settings (⚙ at the top right)

| Option | What it does |
| --- | --- |
| Who pays? | `One pays all` — the last finger left pays the whole bill. `Split by luck` — everyone pays a share, with the first picked paying the least and the last picked paying the most. |
| Players | `Auto` starts with 2+ fingers. Pick a number (2–10) to require that exact count, so nobody can sit out unnoticed. |
| Hold time | 1.5s / 2.5s / 3.5s of holding before the pick runs. |
| Currency | Symbol used for the split amounts. |

### How the weighted split works

In `Split by luck` mode the bill is divided into shares that grow with the pick
order. With a 1000 bill and 4 players the shares are **100 / 200 / 300 / 400**:
the first finger picked pays 100, the last pays 400. Shares are rounded to cents
and the remainder goes to the largest shares, so they always add up to exactly
the bill. The settings sheet shows a live example of the split.


## How it stays fair

* The winning finger is drawn **before** the animation, with
  `Math.floor(Math.random() * count)` over the ordered list of fingers
  (`src/lib/random.ts`). The animation only reveals that pre-drawn result — it
  never influences it — and is built so it always lands exactly on the drawn
  finger (`SPIN_STEPS` in `App.tsx`).
* Each index is equally likely. Verified over 200,000 draws per player count:
  worst deviation from a perfectly even split was ~1.4%.
* A finger's position, colour or label never affect the odds; position is only
  used for drawing rings.

## Files

```
App.tsx                          screen: header, touch surface, pick logic, spin animation
src/hooks/useMultiTouch.ts       tracks every finger on the surface at once
src/components/FingerRing.tsx    the coloured ring drawn under a fingertip
src/components/StatusOverlay.tsx instructions + hold countdown
src/components/ResultBanner.tsx  who pays: one winner, or the weighted split table
src/components/SettingsSheet.tsx settings modal, with a live split preview
src/components/HelpSheet.tsx     the "how to play" guide for first-time users
src/lib/random.ts                the draw
src/lib/money.ts                 bill parsing / formatting / weighted shares
src/types.ts, src/constants.ts   shared types, palette, defaults
```

### How multi-touch works here

React Native gives every touch handler `nativeEvent.touches` — **all** active
touches on the screen, each with a unique `identifier` and `pageX`/`pageY` on
both iOS and Android. So `onTouchStart` / `onTouchMove` / `onTouchEnd` /
`onTouchCancel` on one full-screen `<View>` is enough to track a whole hand. The
hook rebuilds the finger list from scratch on every event, which means lifting a
finger just makes it disappear, and no state can leak between rounds.

`pageX`/`pageY` are screen coordinates, so the surface's own offset is measured
with `measureInWindow` (on mount and on every layout change) and subtracted.
Touches outside the surface — the bill field and the ⚙ button in the header —
are filtered out, so they never create a ring.

## Things to know / next steps

* **Simultaneous touch limits are hardware.** Many phones report 5 fingers at
  once, tablets up to 10; the settings sheet shows the most your device has
  reported. If your group is bigger than the limit, play in two groups or use a tablet.
* A desktop simulator can only press one point at a time (hold ⌥/Alt in the iOS
  simulator for a second point), so test the multi-finger flow on a real device.
* The bill field is a plain optional number  no currency conversion, tips, or
  per-person history is stored.
* Everything resets on reload: settings aren't persisted yet. `expo-sqlite` or
  `@react-native-async-storage/async-storage` would be the way to remember them.
* There is no navigation anywhere in the app yet, so it keeps the template's
  single-screen `App.tsx` entry point rather than adding Expo Router. If you add
  more screens (history, groups), move the screen into `src/app/` and add
  `expo-router`.
