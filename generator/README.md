# Profile cards

Every image on [github.com/SkevJ](https://github.com/SkevJ) is an SVG drawn by this folder.
No dependencies, no third-party card service: if a service goes down, nothing here breaks.

## The design

Editorial, set like a printed page: type sits directly on the page, hairline rules
carry the structure, and one accent — safety orange — does the shouting. The numbers
are set like a personal annual report: numbered plates, one big figure, one chart,
a mono footnote.

- **Archivo Expanded Black** for the name, the section words and big figures.
- **Newsreader** for prose, **IBM Plex Mono** for footnotes and axes.
- Fonts are embedded in each SVG, subset to the characters it uses.
- Motion plays once on load and rests: type rises out of its baseline, numbers roll
  like an odometer, charts build left to right. With reduced motion, the cards are
  simply there.

## How it works

1. Every night at 00:17 (Honduras time) the **Profile cards** workflow runs `build.mjs`.
2. It reads the contribution calendar, languages and commit times from GitHub's API.
3. It draws every card in light and dark.
4. It force-pushes the result to the `output` branch, which the README points to.

If part of the data cannot be read, the cards are still published with yesterday's
values and the run is marked as failed, so GitHub emails you. If there is no data at
all, nothing is published and yesterday's cards stay online.

## Change the words

Everything the profile says is in [`config.mjs`](config.mjs): hero, sections, work,
tools and the closing line. Push to `main` and the workflow rebuilds the cards within
a minute or two. Work for employers and clients stays private: describe the kind of
work, never the systems themselves (a test checks the config for that).

## The token

Languages and commit times come from private repositories, so the workflow needs a
personal access token in the repository secret `GH_TOKEN`:

- **Classic token** with the `repo` and `read:user` scopes.
- Pick a long expiration. Two weeks before it expires the run starts failing on purpose,
  with a message that says so.

Without it the calendar and streak keep updating (that data is public); languages and
the hour-of-day dial freeze at their last values.

## Run it locally

```sh
npm test          # unit tests, offline
npm run preview   # builds into dist/ from the published data; open dist/preview.html
```

`--data <file>` builds from a saved `data.json`; `--offline` skips Google Fonts.
