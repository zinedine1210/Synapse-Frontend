'use client';

import React, { useMemo } from 'react';

/**
 * PixelPet — A detailed 24x24 pixel art cat with animations.
 * More expressive than the 16x16 version.
 */

export type PetMood = 'ecstatic' | 'happy' | 'neutral' | 'sad' | 'sick' | 'dead' | 'sleeping';

interface PixelPetProps {
  mood: PetMood;
  size?: number;
  accessory?: 'none' | 'crown' | 'scarf' | 'glasses' | 'halo';
  animate?: boolean;
}

// ─── Palette ────────────────────────────────────────────────────────────────────
const PAL = {
  ' ': 'transparent',
  // Cat
  'o': '#F5A623', // orange body
  'd': '#D4800E', // dark stripe
  'w': '#FFFFFF', // white chest/muzzle
  'p': '#FFCCCB', // pink (ear, nose)
  'b': '#1A1A2E', // black (eyes, outline)
  'n': '#FF6B8A', // nose
  't': '#FF4757', // tongue
  // Eyes
  'e': '#2D3436', // eye dark
  'g': '#00B894', // eye green (happy)
  'r': '#FF6B6B', // red (sick eyes)
  'x': '#6C5CE7', // x eyes (dead)
  // Effects
  '*': '#FFD700', // sparkle/crown gold
  's': '#FFC8DD', // blush
  'z': '#A29BFE', // sleep Z
  'h': '#FDCB6E', // halo
  // Gray (dead)
  'G': '#636E72', // gray body
  'D': '#2D3436', // dark gray
};

// ─── Frames (24 wide × 20 tall) ────────────────────────────────────────────────
// Each frame is designed to be a cute chibi cat with big head
const SPRITES: Record<PetMood, string[]> = {
  ecstatic: [
    '         *    *         ',
    '     *          *       ',
    '   oo            oo     ',
    '  oooo          oooo    ',
    '  ooooooooooooooooooo   ',
    '  odoooooooooooooodoo   ',
    '  ooooooooooooooooooo   ',
    '  ooooooooooooooooooo   ',
    '  oooggoooooooooggooo   ',
    '  oooggoooooooooggooo   ',
    '  ooosoooooooooosooo    ',
    '  oooooooonnooooooo     ',
    '  oooottoooottooooo     ',
    '   ooooooooooooooo      ',
    '    oowwwwwwwwwoo       ',
    '    oowwwwwwwwwoo       ',
    '     oooooooooooo       ',
    '     oo  oooo  oo       ',
    '     oo  oooo  oo       ',
    '                        ',
  ],
  happy: [
    '                        ',
    '                        ',
    '   oo            oo     ',
    '  oooo          oooo    ',
    '  ooooooooooooooooooo   ',
    '  odoooooooooooooodoo   ',
    '  ooooooooooooooooooo   ',
    '  ooooooooooooooooooo   ',
    '  oooeeooooooooeeoooo   ',
    '  oooeeooooooooeeoooo   ',
    '  ooooooooooooooooooo   ',
    '  oooooooonnooooooo     ',
    '  oooootooootoooooo     ',
    '   ooooooooooooooo      ',
    '    oowwwwwwwwwoo       ',
    '    oowwwwwwwwwoo       ',
    '     oooooooooooo       ',
    '     oo  oooo  oo       ',
    '     oo  oooo  oo       ',
    '                        ',
  ],
  neutral: [
    '                        ',
    '                        ',
    '   oo            oo     ',
    '  oooo          oooo    ',
    '  ooooooooooooooooooo   ',
    '  odoooooooooooooodoo   ',
    '  ooooooooooooooooooo   ',
    '  ooooooooooooooooooo   ',
    '  oooeeooooooooeeoooo   ',
    '  oooeeooooooooeeoooo   ',
    '  ooooooooooooooooooo   ',
    '  oooooooonnooooooo     ',
    '  ooooooooooooooooo     ',
    '   ooooooooooooooo      ',
    '    oowwwwwwwwwoo       ',
    '    oowwwwwwwwwoo       ',
    '     oooooooooooo       ',
    '     oo  oooo  oo       ',
    '     oo  oooo  oo       ',
    '                        ',
  ],
  sad: [
    '                        ',
    '                        ',
    '   oo            oo     ',
    '  oooo          oooo    ',
    '  ooooooooooooooooooo   ',
    '  odoooooooooooooodoo   ',
    '  ooooooooooooooooooo   ',
    '  ooooooooooooooooooo   ',
    '  oooeeooooooooeeoooo   ',
    '  oooeeooooooooeeoooo   ',
    '  ooooooooooooooooooo   ',
    '  oooooooonnooooooo     ',
    '  oooooobbbbooooooo     ',
    '   ooooooooooooooo      ',
    '    oowwwwwwwwwoo       ',
    '    oowwwwwwwwwoo       ',
    '     oooooooooooo       ',
    '     oo  oooo  oo       ',
    '     oo  oooo  oo       ',
    '                        ',
  ],
  sick: [
    '                        ',
    '                        ',
    '   oo            oo     ',
    '  oooo          oooo    ',
    '  ooooooooooooooooooo   ',
    '  odoooooooooooooodoo   ',
    '  ooooooooooooooooooo   ',
    '  ooooooooooooooooooo   ',
    '  ooorroooooooorrooo    ',
    '  ooorroooooooorrooo    ',
    '  ooooooooooooooooooo   ',
    '  oooooooonnooooooo     ',
    '  ooootttttttooooooo    ',
    '   ooooooooooooooo      ',
    '    oowwwwwwwwwoo       ',
    '    oowwwwwwwwwoo       ',
    '     oooooooooooo       ',
    '     oo  oooo  oo       ',
    '     oo  oooo  oo       ',
    '                        ',
  ],
  dead: [
    '                        ',
    '                        ',
    '   GG            GG     ',
    '  GGGG          GGGG    ',
    '  GGGGGGGGGGGGGGGGGGG   ',
    '  GDGGGGGGGGGGGGGGDGG   ',
    '  GGGGGGGGGGGGGGGGGGG   ',
    '  GGGGGGGGGGGGGGGGGGG   ',
    '  GGGxbGGGGGGGxbGGGG   ',
    '  GGGbxGGGGGGGbxGGGG   ',
    '  GGGGGGGGGGGGGGGGGGG   ',
    '  GGGGGGGGGGGGGGGGG     ',
    '  GGGGGGGGGGGGGGGGG     ',
    '   GGGGGGGGGGGGGGG      ',
    '    GGGGGGGGGGGGGG      ',
    '    GGGGGGGGGGGGGG      ',
    '     GGGGGGGGGGGG       ',
    '     GG  GGGG  GG       ',
    '     GG  GGGG  GG       ',
    '                        ',
  ],
  sleeping: [
    '                    z   ',
    '                  zz    ',
    '   oo         z oo      ',
    '  oooo          oooo    ',
    '  ooooooooooooooooooo   ',
    '  odoooooooooooooodoo   ',
    '  ooooooooooooooooooo   ',
    '  ooooooooooooooooooo   ',
    '  ooobbbooooooobbboo    ',
    '  ooooooooooooooooooo   ',
    '  ooooooooooooooooooo   ',
    '  oooooooonnooooooo     ',
    '  ooooooooooooooooo     ',
    '   ooooooooooooooo      ',
    '    oowwwwwwwwwoo       ',
    '    oowwwwwwwwwoo       ',
    '     oooooooooooo       ',
    '     oo  oooo  oo       ',
    '     oo  oooo  oo       ',
    '                        ',
  ],
};

// ─── Accessory overlays ─────────────────────────────────────────────────────────
const ACCESSORIES: Record<string, string[]> = {
  crown: [
    '        * * *           ',
    '       *******          ',
    '       *******          ',
    '                        ',
  ],
  halo: [
    '       hhhhhhh          ',
    '      h       h         ',
    '       hhhhhhh          ',
    '                        ',
  ],
};

export function PixelPet({ mood, size = 192, accessory = 'none', animate = true }: PixelPetProps) {
  const frame = SPRITES[mood];
  const width = 24;
  const height = 20;

  const pixels = useMemo(() => {
    const result: { x: number; y: number; color: string }[] = [];
    frame.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        const color = PAL[char as keyof typeof PAL];
        if (color && color !== 'transparent') {
          result.push({ x, y, color });
        }
      }
    });
    // Accessory
    if (accessory !== 'none' && ACCESSORIES[accessory]) {
      ACCESSORIES[accessory].forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const char = row[x];
          const color = PAL[char as keyof typeof PAL];
          if (color && color !== 'transparent') {
            result.push({ x, y: y - 2, color }); // offset above head
          }
        }
      });
    }
    return result;
  }, [frame, accessory]);

  const animClass = animate ? `pixel-pet-${mood === 'sleeping' ? 'sleep' : mood === 'dead' ? 'dead' : 'idle'}` : '';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className={animClass} style={{ lineHeight: 0 }}>
        <svg
          width={size}
          height={size * (height / width)}
          viewBox={`0 -2 ${width} ${height + 2}`}
          shapeRendering="crispEdges"
          style={{ imageRendering: 'pixelated' }}
        >
          {pixels.map((p, i) => (
            <rect key={i} x={p.x} y={p.y} width={1} height={1} fill={p.color} />
          ))}
        </svg>
      </div>

      <style jsx>{`
        .pixel-pet-idle {
          animation: pet-bob 2s ease-in-out infinite;
        }
        .pixel-pet-sleep {
          animation: pet-sleep 3s ease-in-out infinite;
        }
        .pixel-pet-dead {
          opacity: 0.5;
          filter: grayscale(0.8);
        }
        @keyframes pet-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pet-sleep {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(2px) rotate(-2deg); }
          75% { transform: translateY(2px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
