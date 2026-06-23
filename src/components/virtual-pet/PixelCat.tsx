'use client';

import React from 'react';

/**
 * PixelCat — A 16x16 pixel art cat rendered as SVG.
 * States: happy, content, sad, sick, dead, celebrating, sleeping
 */

export type CatState = 'happy' | 'content' | 'sad' | 'sick' | 'dead' | 'celebrating' | 'sleeping';

interface PixelCatProps {
  state: CatState;
  size?: number;
  className?: string;
}

// Color palette
const C = {
  _: 'transparent',
  // Cat body colors
  O: '#F5A623', // orange fur
  D: '#D4800E', // dark orange (shadows/stripes)
  W: '#FFFFFF', // white
  P: '#FFD4D4', // pink (inner ear, nose)
  B: '#1A1A1A', // black (eyes, outline)
  N: '#FF8FA0', // nose pink
  G: '#4ADE80', // green (happy eyes)
  R: '#EF4444', // red (sick/angry)
  Y: '#FBBF24', // yellow (celebrating sparkle)
  X: '#6B7280', // gray (dead/ghost)
  L: '#A78BFA', // lavender (sleeping Z)
  T: '#D97706', // tongue
  S: '#FDE68A', // sparkle yellow light
};

// Pixel art frames — 16x16 grid, each char maps to a color
const FRAMES: Record<CatState, string[]> = {
  happy: [
    '________________',
    '___O__________O_',
    '__OO__________OO',
    '_OOO__________OO',
    '_OOOOOOOOOOOOOOO',
    '_ODOOOOOOOOOODOO',
    '_OOOOOOOOOOOOOOO',
    '_OBWOOOOOOOOWBOO',
    '_OBWOOOOOOOOWBOO',
    '_OOOOOOONOOOOOO_',
    '_OOOOTOOOOTOOOO_',
    '__OOOOOOOOOOOO__',
    '___OOOOOOOOOO___',
    '___OO______OO___',
    '___OO______OO___',
    '________________',
  ],
  content: [
    '________________',
    '___O__________O_',
    '__OO__________OO',
    '_OOO__________OO',
    '_OOOOOOOOOOOOOOO',
    '_ODOOOOOOOOOODOO',
    '_OOOOOOOOOOOOOOO',
    '_OBBOOOOOOOOBBOO',
    '_OBBOOOOOOOOBBOO',
    '_OOOOOOONOOOOOO_',
    '_OOOOOOOOOOOOOO_',
    '__OOOOOOOOOOOO__',
    '___OOOOOOOOOO___',
    '___OO______OO___',
    '___OO______OO___',
    '________________',
  ],
  sad: [
    '________________',
    '___O__________O_',
    '__OO__________OO',
    '_OOO__________OO',
    '_OOOOOOOOOOOOOOO',
    '_ODOOOOOOOOOODOO',
    '_OOOOOOOOOOOOOOO',
    '_OBBOOOOOOOOBBOO',
    '_OBBOOOOOOOOBBOO',
    '_OOOOOOONOOOOOO_',
    '_OOOOOOOOOOOOOO_',
    '__OOOOBBBBOOO___',
    '___OOOOOOOOOO___',
    '___OO______OO___',
    '___OO______OO___',
    '________________',
  ],
  sick: [
    '________________',
    '___O__________O_',
    '__OO__________OO',
    '_OOO__________OO',
    '_OOOOOOOOOOOOOOO',
    '_ODOOOOOOOOOODOO',
    '_OOOOOOOOOOOOOOO',
    '_ORROOOOOOOORROO',
    '_ORROOOOOOOORROO',
    '_OOOOOOONOOOOOO_',
    '_OOOTOOOOOOTOO__',
    '__OOOOOOOOOOOO__',
    '___OOOOOOOOOO___',
    '___OO______OO___',
    '___OO______OO___',
    '________________',
  ],
  dead: [
    '________________',
    '___X__________X_',
    '__XX__________XX',
    '_XXX__________XX',
    '_XXXXXXXXXXXXXXX',
    '_XXXXXXXXXXXXXXX',
    '_XXXXXXXXXXXXXXX',
    '_XBXBXXXXXBXBXXX',
    '_XXBXXXXXXBXXXXX',
    '_XBXBXXXXXBXBXX_',
    '_XXXXXXXXXXXXXXX',
    '__XXXXXXXXXXXX__',
    '___XXXXXXXXXX___',
    '___XX______XX___',
    '___XX______XX___',
    '________________',
  ],
  celebrating: [
    '____Y_______S___',
    '___O____Y_____O_',
    '__OO__________OO',
    '_OOO__________OO',
    '_OOOOOOOOOOOOOOO',
    '_ODOOOOOOOOOODOO',
    'S_OOOOOOOOOOOOOY',
    '_OGGOOOOOOOGGOO_',
    '_OGGOOOOOOOGGOO_',
    '_OOOOOOONOOOOOO_',
    '_OOOOTOOOOTOOOO_',
    '__OOOOOOOOOOOO__',
    'Y__OOOOOOOOOO_S_',
    '___OO______OO___',
    '___OO______OO___',
    '_S____________Y_',
  ],
  sleeping: [
    '________________',
    '___O_________LO_',
    '__OO________LLOO',
    '_OOO_______L__OO',
    '_OOOOOOOOOOOOOOO',
    '_ODOOOOOOOOOODOO',
    '_OOOOOOOOOOOOOOO',
    '_OBBBOOOOOOBBBOO',
    '_OOOOOOOOOOOOOOO',
    '_OOOOOOONOOOOOO_',
    '_OOOOOOOOOOOOOO_',
    '__OOOOOOOOOOOO__',
    '___OOOOOOOOOO___',
    '___OO______OO___',
    '___OO______OO___',
    '________________',
  ],
};

const COLOR_MAP: Record<string, string> = {
  _: C._, O: C.O, D: C.D, W: C.W, P: C.P, B: C.B, N: C.N,
  G: C.G, R: C.R, Y: C.Y, X: C.X, L: C.L, T: C.T, S: C.S,
};

export function PixelCat({ state, size = 128, className }: PixelCatProps) {
  const frame = FRAMES[state];

  return (
    <div className={className} style={{ display: 'inline-block', lineHeight: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        style={{ imageRendering: 'pixelated' }}
      >
        {frame.map((row, y) =>
          row.split('').map((char, x) => {
            const color = COLOR_MAP[char];
            if (!color || color === 'transparent') return null;
            return (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill={color}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
