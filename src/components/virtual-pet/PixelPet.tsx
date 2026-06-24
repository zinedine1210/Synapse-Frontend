'use client';

import React, { useMemo } from 'react';

/**
 * PixelPet — A cute 20x20 pixel art cat with rich detail & animations.
 * Each mood has a distinct facial expression and body language.
 */

export type PetMood = 'ecstatic' | 'happy' | 'neutral' | 'sad' | 'sick' | 'dead' | 'sleeping';

interface PixelPetProps {
  mood: PetMood;
  size?: number;
  accessory?: 'none' | 'crown' | 'scarf' | 'glasses' | 'halo';
  animate?: boolean;
}

// ─── Palette ────────────────────────────────────────────────────────────────────
const PAL: Record<string, string> = {
  ' ': 'transparent',
  // Cat body
  'o': '#F5A623', // orange body
  'O': '#E8941B', // orange mid-shadow
  'd': '#CC7A0E', // dark stripe / shadow
  'w': '#FFF5E6', // cream white (chest/muzzle)
  'W': '#FFFFFF', // pure white (eye highlight)
  'p': '#FFBFBF', // pink (inner ear)
  'n': '#FF6B8A', // nose
  'q': '#FF4757', // tongue / mouth
  // Eyes
  'E': '#1A1A2E', // eye pupil
  'G': '#2ECC71', // green iris (happy/ecstatic)
  'g': '#55E088', // green highlight
  'B': '#3498DB', // blue iris (neutral)
  'b': '#5DADE2', // blue highlight
  'R': '#E74C3C', // red (sick)
  'X': '#95A5A6', // x-eye (dead)
  // Accessories & effects
  '*': '#FFD700', // gold (crown)
  'Y': '#FFF176', // sparkle
  'H': '#FDCB6E', // halo
  'z': '#B39DDB', // sleep Z
  'Z': '#9575CD', // sleep Z dark
  'h': '#FF8A80', // heart
  '!': '#FF5252', // blush
  // Dead
  'D': '#90A4AE', // dead body
  'K': '#78909C', // dead stripe
};

// ─── Sprites (20 wide × 18 tall) ───────────────────────────────────────────────
const SPRITES: Record<PetMood, string[]> = {
  ecstatic: [
    '  Y    Y    Y   Y   ',
    '   Y          Y     ',
    '  oo          oo    ',
    '  oopo      opoo    ',
    '  ooooooooooooooo   ',
    '  odooooooooooodoo  ',
    '  ooooooooooooooooo ',
    '  ooGgoooooooGgoooo ',
    '  ooGEoooooooGEoooo ',
    '  oo!ooooooooo!oooo ',
    '  ooooooonnooooooo  ',
    '  oooooqooooqooooo  ',
    '   oooooqqqooooo    ',
    '    oowwwwwwwoo     ',
    '    oowwwwwwwoo     ',
    '     ooooooooo      ',
    '     oo ooo oo      ',
    '     dd ooo dd      ',
  ],
  happy: [
    '                    ',
    '                    ',
    '  oo          oo    ',
    '  oopo      opoo    ',
    '  ooooooooooooooo   ',
    '  odooooooooooodoo  ',
    '  ooooooooooooooooo ',
    '  ooGgoooooooGgoooo ',
    '  ooGEoooooooGEoooo ',
    '  ooooooooooooooooo ',
    '  ooooooonnooooooo  ',
    '  ooooooqqqooooooo  ',
    '   ooooooooooooo    ',
    '    oowwwwwwwoo     ',
    '    oowwwwwwwoo     ',
    '     ooooooooo      ',
    '     oo ooo oo      ',
    '     dd ooo dd      ',
  ],
  neutral: [
    '                    ',
    '                    ',
    '  oo          oo    ',
    '  oopo      opoo    ',
    '  ooooooooooooooo   ',
    '  odooooooooooodoo  ',
    '  ooooooooooooooooo ',
    '  ooBbooooooBboooo  ',
    '  ooBEooooooBEoooo  ',
    '  ooooooooooooooooo ',
    '  ooooooonnooooooo  ',
    '  ooooooooooooooooo ',
    '   ooooooooooooo    ',
    '    oowwwwwwwoo     ',
    '    oowwwwwwwoo     ',
    '     ooooooooo      ',
    '     oo ooo oo      ',
    '     dd ooo dd      ',
  ],
  sad: [
    '                    ',
    '                    ',
    '  oo          oo    ',
    '  oopo      opoo    ',
    '  ooooooooooooooo   ',
    '  odooooooooooodoo  ',
    '  ooooooooooooooooo ',
    '  ooBbooooooBboooo  ',
    '  ooBEooooooBEoooo  ',
    '  ooooooooooooooooo ',
    '  ooooooonnooooooo  ',
    '  oooooEEEEEooooo   ',
    '   ooooooooooooo    ',
    '    oowwwwwwwoo     ',
    '    oowwwwwwwoo     ',
    '     ooooooooo      ',
    '     oo ooo oo      ',
    '     dd ooo dd      ',
  ],
  sick: [
    '                    ',
    '                    ',
    '  oo          oo    ',
    '  oopo      opoo    ',
    '  ooooooooooooooo   ',
    '  odooooooooooodoo  ',
    '  ooooooooooooooooo ',
    '  ooRRoooooooRRoooo ',
    '  ooRRoooooooRRoooo ',
    '  ooooooooooooooooo ',
    '  ooooooonnooooooo  ',
    '  oooqqqqqqqqooooo  ',
    '   ooooooooooooo    ',
    '    oowwwwwwwoo     ',
    '    oowwwwwwwoo     ',
    '     ooooooooo      ',
    '     oo ooo oo      ',
    '     dd ooo dd      ',
  ],
  dead: [
    '                    ',
    '                    ',
    '  DD          DD    ',
    '  DDKD      DKDD    ',
    '  DDDDDDDDDDDDDDD  ',
    '  DKDDDDDDDDDDKDD  ',
    '  DDDDDDDDDDDDDDDDD',
    '  DDXEXDDDDDDXEXDDD ',
    '  DDEXEDDDDDDEXEDDD ',
    '  DDDDDDDDDDDDDDDDD',
    '  DDDDDDDDDDDDDDD   ',
    '  DDDDDDDDDDDDDDD   ',
    '   DDDDDDDDDDDDD    ',
    '    DDDDDDDDDDD     ',
    '    DDDDDDDDDDD     ',
    '     DDDDDDDDD      ',
    '     DD DDD DD      ',
    '     DD DDD DD      ',
  ],
  sleeping: [
    '               z Z  ',
    '              z  z  ',
    '  oo       Z oo     ',
    '  oopo      opoo    ',
    '  ooooooooooooooo   ',
    '  odooooooooooodoo  ',
    '  ooooooooooooooooo ',
    '  ooEEEoooooEEEoooo ',
    '  ooooooooooooooooo ',
    '  ooooooooooooooooo ',
    '  ooooooonnooooooo  ',
    '  ooooooooooooooooo ',
    '   ooooooooooooo    ',
    '    oowwwwwwwoo     ',
    '    oowwwwwwwoo     ',
    '     ooooooooo      ',
    '     oo ooo oo      ',
    '     dd ooo dd      ',
  ],
};

// ─── Accessory overlays ─────────────────────────────────────────────────────────
const ACCESSORIES: Record<string, { rows: string[]; offsetY: number }> = {
  crown: {
    rows: [
      '     * * *          ',
      '    *******         ',
      '    *Y*Y*Y*         ',
    ],
    offsetY: -1,
  },
  halo: {
    rows: [
      '     HHHHH          ',
      '    H     H         ',
      '     HHHHH          ',
    ],
    offsetY: -1,
  },
};

export function PixelPet({ mood, size = 192, accessory = 'none', animate = true }: PixelPetProps) {
  const frame = SPRITES[mood];
  const width = 20;
  const height = 18;

  const pixels = useMemo(() => {
    const result: { x: number; y: number; color: string }[] = [];
    frame.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        const color = PAL[char];
        if (color && color !== 'transparent') {
          result.push({ x, y, color });
        }
      }
    });
    // Accessory
    if (accessory !== 'none' && ACCESSORIES[accessory]) {
      const acc = ACCESSORIES[accessory];
      acc.rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const char = row[x];
          const color = PAL[char];
          if (color && color !== 'transparent') {
            result.push({ x, y: y + acc.offsetY, color });
          }
        }
      });
    }
    return result;
  }, [frame, accessory]);

  const animClass = animate
    ? `pixel-pet-${mood === 'sleeping' ? 'sleep' : mood === 'dead' ? 'dead' : mood === 'ecstatic' ? 'bounce' : 'idle'}`
    : '';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className={animClass} style={{ lineHeight: 0, filter: mood === 'dead' ? 'grayscale(0.6)' : 'none' }}>
        <svg
          width={size}
          height={size * (height / width)}
          viewBox={`-1 -2 ${width + 2} ${height + 2}`}
          shapeRendering="crispEdges"
          style={{ imageRendering: 'pixelated' }}
        >
          {pixels.map((p, i) => (
            <rect key={i} x={p.x} y={p.y} width={1} height={1} fill={p.color} rx={0.05} />
          ))}
        </svg>
      </div>

      <style jsx>{`
        .pixel-pet-idle {
          animation: pet-bob 2.5s ease-in-out infinite;
        }
        .pixel-pet-bounce {
          animation: pet-bounce 1.2s ease-in-out infinite;
        }
        .pixel-pet-sleep {
          animation: pet-sleep 3s ease-in-out infinite;
        }
        .pixel-pet-dead {
          opacity: 0.45;
        }
        @keyframes pet-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes pet-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-8px) scale(1.03); }
          50% { transform: translateY(-2px) scale(0.98); }
          70% { transform: translateY(-6px) scale(1.02); }
        }
        @keyframes pet-sleep {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(2px) rotate(-3deg); }
          75% { transform: translateY(2px) rotate(3deg); }
        }
      `}</style>
    </div>
  );
}
