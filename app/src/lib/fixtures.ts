import type { Item } from './items';

/**
 * Stand-in garments for the /preview route (dev only).
 *
 * These mimic what the cutout worker produces: transparent PNGs trimmed to the
 * garment. The aspect ratios matter more than the drawing — they're taken from real
 * flat-lay proportions (a tee is noticeably taller than it is wide once you include
 * the body; jeans are ~2.3x taller than wide), because that's what the layout is
 * sensitive to. Getting these wrong makes every garment look stubby.
 */

const svg = (w: number, h: number, body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  )}`;

// 200x237 — short-sleeve tee, ~54cm across the sleeves by 64cm long. The chest is 78%
// of the total width: a flat-laid tee is a broad rectangle with short sleeve stubs, not
// a wide X. Drawing the sleeves too far out makes every top look like a smock.
const TEE = svg(
  200,
  237,
  `<path d="M78 10 L58 14 L6 40 L2 78 L22 86 L18 232 L182 232 L178 86 L198 78 L194 40 L142 14 L122 10 C112 30 88 30 78 10 Z" fill="#EFEAE2"/>`,
);

// 130x300 — straight-leg jeans, waistband full width, crotch at y=160.
const JEANS = svg(
  130,
  300,
  `<path d="M4 2 L126 2 L120 120 L114 296 L76 296 L68 160 L62 160 L54 296 L16 296 L10 120 Z" fill="#4A5A72"/>
   <path d="M4 2 L126 2 L125 18 L5 18 Z" fill="#3C4A5E"/>`,
);

// 190x340 — A-line midi dress with cap sleeves. Shoulders 63% of the width, waist 41%,
// hem 98%, so it actually covers the torso instead of reading as a narrow pinafore.
const DRESS = svg(
  190,
  340,
  `<path d="M75 10 L50 20 L35 44 L54 58 L62 74 L56 130 L2 330 L188 330 L134 130 L128 74 L136 58 L155 44 L140 20 L115 10 C102 28 88 28 75 10 Z" fill="#B5603E"/>`,
);

// 220x290 — open blazer, body 46..174, deep lapel V to y=82.
const BLAZER = svg(
  220,
  290,
  `<path d="M76 10 L22 40 L4 96 L36 114 L46 96 L46 284 L174 284 L174 96 L184 114 L216 96 L198 40 L144 10 L110 82 Z" fill="#6B6A50"/>
   <path d="M76 10 L110 82 L92 98 L60 26 Z" fill="#5B5A43"/>
   <path d="M144 10 L110 82 L128 98 L160 26 Z" fill="#5B5A43"/>`,
);

// The same jeans photographed on their side: a 300x130 frame with the garment lying
// left-to-right. Tagged rotation=90, so a correct renderer stands it back up.
const JEANS_SIDEWAYS = svg(
  300,
  130,
  `<g transform="translate(0,130) rotate(-90)">
     <path d="M4 2 L126 2 L120 120 L114 296 L76 296 L68 160 L62 160 L54 296 L16 296 L10 120 Z" fill="#4A5A72"/>
     <path d="M4 2 L126 2 L125 18 L5 18 Z" fill="#3C4A5E"/>
   </g>`,
);

const SNEAKERS = svg(
  220,
  100,
  `<g fill="#F2EFE9">
     <path d="M4 74 C2 58 10 42 24 32 L42 18 C50 12 60 12 66 20 L84 42 C92 52 98 60 100 70 L100 78 L4 78 Z"/>
     <path d="M116 74 C114 58 122 42 136 32 L154 18 C162 12 172 12 178 20 L196 42 C204 52 210 60 212 70 L212 78 L116 78 Z"/>
   </g>
   <g fill="#1B1A17">
     <path d="M4 78 L100 78 L100 90 C100 94 96 96 92 96 L12 96 C6 96 4 92 4 86 Z"/>
     <path d="M116 78 L212 78 L212 90 C212 94 208 96 204 96 L124 96 C118 96 116 92 116 86 Z"/>
   </g>`,
);

const BAG = svg(
  110,
  130,
  `<path d="M30 44 C30 20 38 8 55 8 C72 8 80 20 80 44" fill="none" stroke="#8A6A49" stroke-width="7"/>
   <path d="M8 42 L102 42 L96 124 L14 124 Z" fill="#9C7A55"/>
   <path d="M8 42 L102 42 L101 56 L9 56 Z" fill="#8A6A49"/>`,
);

function item(
  id: string,
  name: string,
  category: string,
  color: string,
  uri: string,
  rotation = 0,
): Item {
  return {
    id,
    name,
    category,
    primary_color: color,
    image_original: null,
    image_cutout: `fixture/${id}.png`,
    imageUrl: uri,
    hasCutout: true,
    rotation,
    formality: 2,
    warmth: 3,
    occasions: ['casual'],
  };
}

export const FIXTURE_ITEMS: Item[] = [
  item('fx-tee', 'Cotton tee', 'top', 'cream', TEE),
  item('fx-jeans', 'Straight jeans', 'bottom', 'indigo', JEANS),
  item('fx-dress', 'Linen dress', 'dress', 'terracotta', DRESS),
  item('fx-blazer', 'Relaxed blazer', 'outerwear', 'olive', BLAZER),
  item('fx-sneakers', 'Leather sneakers', 'shoes', 'white', SNEAKERS),
  item('fx-bag', 'Shoulder bag', 'accessory', 'tan', BAG),
  item('fx-jeans-side', 'Sideways jeans', 'bottom', 'indigo', JEANS_SIDEWAYS, 90),
  item('fx-jeans-raw', 'Uncorrected jeans', 'bottom', 'indigo', JEANS_SIDEWAYS, 0),
];

const pick = (...ids: string[]) => ids.map((id) => FIXTURE_ITEMS.find((i) => i.id === id)!);

export const FIXTURE_SETS: Record<string, Item[]> = {
  everyday: pick('fx-tee', 'fx-jeans', 'fx-sneakers'),
  layered: pick('fx-tee', 'fx-jeans', 'fx-blazer', 'fx-sneakers', 'fx-bag'),
  dress: pick('fx-dress', 'fx-sneakers', 'fx-bag'),
  bare: pick(),
  // Same sideways photo, corrected vs not — the rotation regression check.
  rotated: pick('fx-tee', 'fx-jeans-side', 'fx-sneakers'),
  unrotated: pick('fx-tee', 'fx-jeans-raw', 'fx-sneakers'),
};
