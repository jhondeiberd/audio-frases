# Phrase Audio

Upload a PDF phrase list (3 columns: number, language 1, language 2) and, optionally, its audio.
It builds a new MP3 with the selected phrases and the repetitions you choose per language.

- **With audio:** everything is processed in the browser.
- **Without audio:** speech is generated from the PDF text with free Microsoft neural voices (via `/api/tts`) or ElevenLabs (your own key).

## Structure

```
api/tts.js                 Vercel function: text -> MP3 with Microsoft voices
package.json               function dependency (msedge-tts, pinned)
vercel.json                deployment: serves /public, function limits, headers
scripts/release.js         version bump + git commit/tag/push + Vercel deploy
public/                    what the browser receives
  index.html               page structure
  favicon.svg / .png       icon
  css/styles.css           styles
  js/core/audio-engine.js  domain: segmentation, voices, pairing, MP3/ZIP (no DOM)
  js/app/                  UI and flow (load order in index.html)
    config.js              ELEVEN = true/false
    version.js             version shown in the header (updated by npm run release)
    state.js               shared state and helpers
    prefs.js               local preferences
    i18n.js                ES / EN interface (dictionary + t('key'))
    theme.js               light / dark theme
    dropzones.js           file loading
    pdf-parser.js          PDF reading
    audio-loader.js        audio decoding
    phrase-table.js        phrase table
    generator.js           audio generation
    voice-browser.js       voice panels and browser voice
    voice-microsoft.js     Microsoft voice client (/api/tts)
    voice-elevenlabs.js    ElevenLabs and synthesized audio assembly
    player.js              result player
    save.js                saving
    bootstrap.js           startup
```

## Local development

```
npm install
vercel dev
```

`vercel dev` serves the page and the `/api/tts` function together (http://localhost:3000).

## Notes

- `/api/tts` only accepts calls from the site itself. To allow other origins, set `TTS_ALLOWED_ORIGINS`
  (comma-separated list) in the Vercel project.
- The Microsoft voice uses an unofficial service: it may stop working if Microsoft changes its protocol.
- The ElevenLabs key is stored only in the browser of whoever types it.
- Row repetitions: a global default (1) in the languages section sets every row; the last table column lets you change single rows. The whole row (both languages, with their own per-language repetitions) plays that many times before the next row.
- Interface language (ES/EN) and light/dark theme: header buttons. Texts live in `public/js/app/i18n.js`
  (same keys in `es` and `en`); in HTML use `data-i18n="key"`. Code and comments are always in English.

## Release (GitHub + Vercel)

```
npm run release -- 1.3.0 "Reason for the change"
```
Updates `version.js` and `package.json`, then commits (`v1.3.0: reason`), creates the annotated tag `v1.3.0`,
pushes to `origin` with the tag, and finally runs `vercel --prod` with `--meta version=… --meta description=…`.
If the git step fails, nothing is deployed. Flags: `--no-git`, `--no-deploy`.
Requires a git repository with an `origin` remote (GitHub). If Vercel is connected to the GitHub repo, the push may also start its own deployment.
