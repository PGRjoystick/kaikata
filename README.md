# Kaikata (書き方)

A personal app for learning to write Japanese by hand: hiragana, katakana, a few first
words and the 103 JLPT N5 kanji. Everything runs offline in the browser; progress is
stored on the device only (export/import a backup from the Profile tab).

## How it works

- **Learn** – each new item is traced, then written over an outline, then written from memory.
- **Stroke checking** – every stroke is compared with the expected one (place, direction, shape)
  using the `curve-matcher` library. Small end hooks of the brush-style reference strokes are optional,
  and a stroke drawn out of order is reported as such. See `src/lib/grade.ts`.
- **Practice** – hints (outline plus animated stroke) disappear after three right strokes in a row
  and come back on a miss.
- **Review** – each learned item gets a writing card and a reading card, scheduled with FSRS
  (`ts-fsrs`). Missed cards come back at the end of the session.
- **Challenge** – write a whole lesson from memory for up to three stars.

## Commands

    npm install
    npm run dev       # develop, http://localhost:5173
    npm run build     # type-check and build into dist/
    npm run preview   # serve the built app on your network (open the Network URL on a phone)
    npm test          # stroke-grading checks against simulated handwriting
    npm run android   # build the Android APK; installs it if a phone is connected over adb
    npm run data      # rebuild src/data from KanjiVG and KANJIDIC2 (cached in scripts/.cache)

## Android

The `android/` folder is a [Capacitor](https://capacitorjs.com) project. Building needs JDK 21 and the
Android SDK (`JAVA_HOME`, `ANDROID_HOME`). `npm run android` makes a debug APK and installs it on a
phone connected over adb.

Release APKs are signed with a key kept outside the repository: by default
`~/.android-keys/kaikata-signing.properties` (or the file in `KAIKATA_SIGNING`) with `storeFile`,
`storePassword`, `keyAlias` and `keyPassword`. Then run `npm run build && npx cap sync android &&
(cd android && ./gradlew assembleRelease)`.

Pronunciation uses the phone's text-to-speech engine through `@capacitor-community/text-to-speech`;
it needs a Japanese voice installed on the phone.

## Adding content

Kana rows and words live in `src/lib/content.ts`. Any kana already has stroke data. Kanji come
from `scripts/build-data.mjs` (currently the old JLPT level 4 set); widen the filter there and
run `npm run data`.

## Licenses

**Data.** The app bundles two adapted open datasets. They are shared under their original licenses; see
[`src/data/LICENSE.md`](src/data/LICENSE.md) for the full attribution and a list of the changes made.

- Stroke order: [KanjiVG](https://kanjivg.tagaini.net) © Ulrich Apel,
  [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- Kanji readings and meanings: [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project), the property of
  the [Electronic Dictionary Research and Development Group](https://www.edrdg.org/), used in conformance with the
  Group's [licence](https://www.edrdg.org/edrdg/licence.html),
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

**Third-party code.** `npm run build` writes `third-party-notices.json` with the license text of every npm package in
the bundle (`scripts/notices-plugin.ts`). The Android libraries in the APK are listed in
`src/data/android-libraries.json`; regenerate it with `node scripts/android-libraries.mjs` after changing Android
dependencies. The app shows both lists under Profile → Licenses.
