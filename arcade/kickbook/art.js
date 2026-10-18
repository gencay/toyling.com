// Original cartoon art as inline SVG: a generic footballer built from a card's `look` and `kit` (design token names,
// never colors), country flags, and the penalty goal. The cartoon is the fallback when a real photo (home-only build,
// web/img/) is missing.

/** A design token name (kitYellow, skin3) as its CSS variable (generated tokens.css). */
export const v = (name) => `var(--${name.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase()})`;
const f = (name) => `style="fill:${v(name)}"`;

const HAIR = {
  short: (c) => `<path d="M42 36c0-14 8-20 18-20s18 6 18 20c-4-7-10-9-18-9s-14 2-18 9z" ${f(c)}/>`,
  shaved: (c) => `<path d="M43 34c1-11 8-16 17-16s16 5 17 16c-5-6-10-8-17-8s-12 2-17 8z" ${f(c)} opacity=".55"/>`,
  beard: (c) => `${HAIR.short(c)}<path d="M44 42c2 12 8 16 16 16s14-4 16-16c-2 5-6 8-16 8s-14-3-16-8z" ${f(c)}/>`,
  'long-band': (c) => `<path d="M40 40c0-16 9-24 20-24s20 8 20 24v18c-3 2-6 2-8 0V36H48v22c-2 2-5 2-8 0z" ${f(c)}/><rect x="41" y="27" width="38" height="5" rx="2" ${f('kitWhite')}/>`,
  bun: (c) => `${HAIR.short(c)}<circle cx="60" cy="14" r="6" ${f(c)}/>`,
  ponytail: (c) => `${HAIR.short(c)}<path d="M76 30c8 2 10 12 6 22-2-6-5-10-9-12z" ${f(c)}/>`,
};

/** A footballer for a player card. */
export function playerSvg(p, { title = '' } = {}) {
  const { skin, hair, style } = p.look;
  const k = p.kit;
  const stripes = k.stripes ? [46, 56, 66].map((x) => `<rect x="${x}" y="60" width="5" height="40" ${f(k.stripes)}/>`).join('') : '';
  return `<svg class="player-art" viewBox="0 0 120 160" role="img" aria-label="${title}">
  <ellipse cx="60" cy="152" rx="34" ry="5" ${f('shadow')} opacity=".18"/>
  <rect x="47" y="112" width="10" height="30" rx="4" ${f(skin)}/><rect x="63" y="112" width="10" height="30" rx="4" ${f(skin)}/>
  <rect x="47" y="126" width="10" height="14" ${f(k.trim)}/><rect x="63" y="126" width="10" height="14" ${f(k.trim)}/>
  <path d="M44 140h14v8H40c0-4 1-8 4-8zM62 140h14c3 0 4 4 4 8H62z" ${f(k.boots ?? 'kitBlack')}/>
  <path d="M42 98h36l3 20H39z" ${f(k.shorts)}/>
  <path d="M38 62c6-6 14-8 22-8s16 2 22 8l12 16-10 6-6-8v24H42V76l-6 8-10-6z" ${f(k.shirt)}/>
  ${stripes}
  <path d="M52 55c2 5 5 7 8 7s6-2 8-7" fill="none" style="stroke:${v(k.trim)}" stroke-width="4" stroke-linecap="round"/>
  <text x="60" y="90" text-anchor="middle" class="kit-num" ${f(k.number)}>${p.number}</text>
  <circle cx="30" cy="82" r="6" ${f(skin)}/><circle cx="90" cy="82" r="6" ${f(skin)}/>
  <rect x="54" y="48" width="12" height="10" ${f(skin)}/>
  <circle cx="60" cy="36" r="18" ${f(skin)}/>
  ${HAIR[style](hair)}
  <circle cx="53" cy="38" r="2.2" ${f('ink')}/><circle cx="67" cy="38" r="2.2" ${f('ink')}/>
  <path d="M53 45c4 4 10 4 14 0" fill="none" style="stroke:${v('ink')}" stroke-width="2.2" stroke-linecap="round"/>
  <g transform="translate(88 136)"><circle r="10" ${f(k.ball ?? 'ball')} style="stroke:${v('ballPatch')}" stroke-width="1.5"/><path d="M0-4l4 3-1.5 5h-5L-4-1z" ${f('ballPatch')}/></g>
</svg>`;
}

function star(cx, cy, r, rot = -90) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.4 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const FLAGS = {
  USA: () => {
    const stripes = Array.from({ length: 13 }, (_, i) => `<rect y="${(i * 20) / 13}" width="30" height="${20 / 13 + 0.02}" ${f(i % 2 ? 'flagWhite' : 'flagRed')}/>`).join('');
    const dots = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) dots.push(`<circle cx="${1.1 + c * 2 + (r % 2)}" cy="${1.1 + r * 2.1}" r=".45" ${f('flagWhite')}/>`);
    return `${stripes}<rect width="12" height="${(7 * 20) / 13}" ${f('flagNavy')}/>${dots.join('')}`;
  },
  TUR: () => `<rect width="30" height="20" ${f('flagTurkRed')}/><circle cx="11" cy="10" r="5" ${f('flagWhite')}/><circle cx="12.25" cy="10" r="4" ${f('flagTurkRed')}/><polygon points="${star(17.2, 10, 2.5, 180)}" ${f('flagWhite')}/>`,
  BRA: () => `<rect width="30" height="20" ${f('flagGreen')}/><polygon points="15,2 28,10 15,18 2,10" ${f('flagYellow')}/><circle cx="15" cy="10" r="4.6" ${f('flagNavy')}/>`,
  ARG: () => `<rect width="30" height="20" ${f('flagSkyBlue')}/><rect y="6.67" width="30" height="6.67" ${f('flagWhite')}/><circle cx="15" cy="10" r="2" ${f('flagSun')}/>`,
  POR: () => `<rect width="30" height="20" ${f('flagRed')}/><rect width="12" height="20" ${f('flagDarkGreen')}/><circle cx="12" cy="10" r="3.6" ${f('flagYellow')}/>`,
  FRA: () => `<rect width="10" height="20" ${f('flagBlue')}/><rect x="10" width="10" height="20" ${f('flagWhite')}/><rect x="20" width="10" height="20" ${f('flagRed')}/>`,
  NOR: () => `<rect width="30" height="20" ${f('flagRed')}/><rect x="8" width="6" height="20" ${f('flagWhite')}/><rect y="7" width="30" height="6" ${f('flagWhite')}/><rect x="9.5" width="3" height="20" ${f('flagNavy')}/><rect y="8.5" width="30" height="3" ${f('flagNavy')}/>`,
};
/** The flags shown for the two app languages. */
export const LANG_FLAG = { en: 'USA', tr: 'TUR' };

export function flagSvg(code, label = '') {
  return `<svg class="flag" viewBox="0 0 30 20" role="img" aria-label="${label}">${FLAGS[code]()}<rect width="30" height="20" fill="none" style="stroke:${v('shadow')}" stroke-opacity=".2"/></svg>`;
}
export const hasFlag = (code) => code in FLAGS;

export const coinSvg = () => `<svg class="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" ${f('coin')} style="stroke:${v('coinDeep')}" stroke-width="2"/><text x="10" y="14" text-anchor="middle" class="coin-k" ${f('coinDeep')}>K</text></svg>`;

/** The penalty scene: goal, net, keeper and ball. The page moves #keeper and #ball with classes. */
export function goalSvg(ballColor = 'ball') {
  const net = [];
  for (let x = 24; x <= 276; x += 14) net.push(`<line x1="${x}" y1="26" x2="${x}" y2="130"/>`);
  for (let y = 26; y <= 130; y += 13) net.push(`<line x1="24" y1="${y}" x2="276" y2="${y}"/>`);
  return `<svg class="goal" viewBox="0 0 300 220" aria-hidden="true">
  <rect width="300" height="220" ${f('pitch')}/>
  <rect y="0" width="300" height="60" ${f('sky')}/>
  <path d="M0 150h300" style="stroke:${v('chalk')}" stroke-width="3"/>
  <g style="stroke:${v('net')}" stroke-width="1.2">${net.join('')}</g>
  <path d="M20 132V22h260v110" fill="none" style="stroke:${v('chalk')}" stroke-width="8" stroke-linejoin="round"/>
  <g id="keeper" class="keeper"><rect x="138" y="70" width="24" height="44" rx="8" ${f('keeper')}/><circle cx="150" cy="60" r="11" ${f('skin2')}/>
    <rect x="118" y="74" width="20" height="8" rx="4" ${f('keeper')}/><rect x="162" y="74" width="20" height="8" rx="4" ${f('keeper')}/>
    <circle cx="116" cy="78" r="6" ${f('chalk')}/><circle cx="184" cy="78" r="6" ${f('chalk')}/>
    <rect x="140" y="112" width="8" height="22" ${f('kitNavy')}/><rect x="152" y="112" width="8" height="22" ${f('kitNavy')}/></g>
  <g id="ball" class="ball"><circle cx="150" cy="190" r="12" ${f(ballColor)} style="stroke:${v('ballPatch')}" stroke-width="1.5"/><path d="M150 185l5 4-2 6h-6l-2-6z" ${f('ballPatch')}/></g>
</svg>`;
}

/** A CR7 goal star: filled gold when earned, an outline when not yet. */
export const starSvg = (done) => `<svg class="star${done ? ' on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="${star(12, 12.5, 11)}" style="fill:${v(done ? 'coin' : 'card')};stroke:${v(done ? 'coinDeep' : 'inkSoft')}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

/** Locker item icons, drawn from the item's color token. */
export function itemSvg(it) {
  const c = it.color;
  const shapes = {
    shirt: `<path d="M14 10l8-5h16l8 5 8 10-8 6-4-4v28H18V22l-4 4-8-6z" ${f(c)} style="stroke:${v('line')}" stroke-width="2"/>`,
    shorts: `<path d="M12 14h36l4 32H34l-4-14-4 14H8z" ${f(c)} style="stroke:${v('line')}" stroke-width="2"/>`,
    boots: `<path d="M10 18h16v14l22 6c3 1 4 4 4 7v3H10z" ${f(c)} style="stroke:${v('line')}" stroke-width="2"/><g ${f('line')}><rect x="14" y="48" width="4" height="5"/><rect x="26" y="48" width="4" height="5"/><rect x="40" y="48" width="4" height="5"/></g>`,
    ball: `<circle cx="30" cy="30" r="22" ${f(c)} style="stroke:${v('line')}" stroke-width="2"/><path d="M30 20l9 7-3 10h-12l-3-10z" ${f('ballPatch')}/>`,
    frame: `<path d="M30 4l22 5v34l-22 13-22-13V9z" ${f(c)} style="stroke:${v('line')}" stroke-width="2"/><text x="30" y="34" text-anchor="middle" class="frame-k" ${f('fcInkLight')}>FC</text>`,
  };
  return `<svg class="item-art" viewBox="0 0 60 60" aria-hidden="true">${shapes[it.slot]}</svg>`;
}

/** The memory trick for b and d: b = goalpost then ball, d = ball then goalpost; s = a snake from the top. */
export function mnemonicSvg(letter) {
  const post = (x) => `<rect x="${x}" y="6" width="9" height="48" rx="3" ${f('chalk')} style="stroke:${v('line')}" stroke-width="2"/>`;
  const ball = (x) => `<g transform="translate(${x} 40)"><circle r="13" ${f('ball')} style="stroke:${v('line')}" stroke-width="2"/><path d="M0-5l5 3-2 6h-6l-2-6z" ${f('ballPatch')}/></g>`;
  const body = letter === 'b' ? post(6) + ball(32) : letter === 'd' ? ball(17) + post(36) : `<path d="M44 14c-6-8-30-8-30 4s30 8 30 22-26 12-32 4" fill="none" style="stroke:${v('pitchDark')}" stroke-width="7" stroke-linecap="round"/><circle cx="45" cy="13" r="3" ${f('ink')}/>`;
  return `<svg class="mnemonic" viewBox="0 0 54 60" width="54" height="60" aria-hidden="true">${body}</svg>`;
}

/** Rows of balls for the array questions (2.OA.C.4). */
export function arraySvg(rows, cols) {
  const balls = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) balls.push(`<g transform="translate(${16 + c * 30} ${16 + r * 30})"><circle r="12" ${f('ball')} style="stroke:${v('line')}" stroke-width="2"/><path d="M0-5l5 3-2 6h-6l-2-6z" ${f('ballPatch')}/></g>`);
  return `<svg class="array-art" viewBox="0 0 ${cols * 30 + 2} ${rows * 30 + 2}" role="img" aria-label="${rows} × ${cols}">${balls.join('')}</svg>`;
}
