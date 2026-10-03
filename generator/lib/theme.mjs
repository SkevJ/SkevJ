// Color and type for the editorial system: type sits on the page itself (no
// cards), hairline rules carry the structure, and one accent does the shouting.
// The accent is safety orange, the color of the plants this work runs in.
//
// Contrast against GitHub's own backgrounds (#ffffff light, #0d1117 dark):
// ink > 16:1, ink2 > 7:1, ink3 > 5:1, accentInk > 5:1 — all text passes AA.
// The heat ramp is sequential, so its lightest steps recede on purpose; every
// chart also states its key values in text.

export const themes = {
  light: {
    name: 'light',
    ink: '#111110',
    ink2: '#55534f',
    ink3: '#6f6c66',
    rule: '#111110',
    hair: 'rgba(17,17,16,0.16)',
    accent: '#e8481c',
    accentInk: '#c0390e',
    heat: ['#efede8', '#fbd6c2', '#f6a47c', '#ec6e3c', '#c43e10'],
    wedge: '#9c988f',
    greys: ['#111110', '#7a776f', '#a8a49c', '#cfcbc3', '#e6e3dc'],
  },
  dark: {
    name: 'dark',
    ink: '#f3f1ec',
    ink2: '#a3a09a',
    ink3: '#96938b',
    rule: '#f3f1ec',
    hair: 'rgba(243,241,236,0.16)',
    accent: '#ff6b3d',
    accentInk: '#ff8a63',
    heat: ['#1c1f24', '#4b2618', '#86351a', '#cf4f1f', '#ff7d47'],
    wedge: '#605e58',
    greys: ['#f3f1ec', '#9a978f', '#6d6a64', '#4a4844', '#33322f'],
  },
};

// Four families, each with one job: Archivo Expanded Black shouts (names, section
// words, big numbers); Archivo labels; Newsreader talks; IBM Plex Mono annotates.
export const type = {
  giant: { v: 'AX', size: 118, track: -0.035 },
  section: { v: 'AX', size: 74, track: -0.035 },
  figureXL: { v: 'AX', size: 70, track: -0.04 },
  figure: { v: 'AX', size: 34, track: -0.03 },
  figureS: { v: 'AX', size: 24, track: -0.025 },
  numeral: { v: 'AX', size: 40, track: -0.03 },
  heading: { v: 'AX', size: 20, track: -0.01 },
  label: { v: 'AL', size: 11, track: 0.12, upper: true },
  body: { v: 'NS', size: 16.5, track: -0.003, lh: 24 },
  deck: { v: 'NI', size: 21, track: -0.01, lh: 27 },
  caption: { v: 'NI', size: 16, track: 0, lh: 22 },
  mono: { v: 'PM', size: 10.5, track: 0.02 },
  monoU: { v: 'PM', size: 9.5, track: 0.08, upper: true },
  monoNum: { v: 'PB', size: 11, track: 0.04 },
};
