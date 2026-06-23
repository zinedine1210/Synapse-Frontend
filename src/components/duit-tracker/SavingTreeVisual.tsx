'use client';

import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sprout } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TreeGrowthStage = 'seed' | 'sprout' | 'sapling' | 'growing' | 'full' | 'blooming';

export interface SavingTree {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
}

export interface SavingTreeVisualProps {
  trees: SavingTree[];
}

// ─── Pure stage determination function (exported for testing) ──────────────────

/**
 * Determines the tree growth stage based on progress percentage.
 * - 0%: seed
 * - 1-24%: sprout
 * - 25-49%: sapling
 * - 50-74%: growing
 * - 75-99%: full
 * - 100%: blooming
 *
 * @param progress - Progress percentage (0-100). Values are clamped to [0, 100].
 */
export function getTreeGrowthStage(progress: number): TreeGrowthStage {
  const clamped = Math.max(0, Math.min(100, progress));

  if (clamped === 0) return 'seed';
  if (clamped >= 1 && clamped <= 24) return 'sprout';
  if (clamped >= 25 && clamped <= 49) return 'sapling';
  if (clamped >= 50 && clamped <= 74) return 'growing';
  if (clamped >= 75 && clamped <= 99) return 'full';
  return 'blooming';
}

// ─── Helper: calculate progress ───────────────────────────────────────────────

function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  const raw = (current / target) * 100;
  return Math.min(100, Math.max(0, Math.floor(raw)));
}

// ─── Helper: format currency ──────────────────────────────────────────────────

function formatRupiah(value: number): string {
  return 'Rp ' + value.toLocaleString('id-ID');
}

// ─── Tree SVG Illustrations ───────────────────────────────────────────────────

function SeedIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Seed stage">
      {/* Sky gradient */}
      <defs>
        <radialGradient id="seedSoilGlow" cx="50%" cy="80%" r="40%">
          <stop offset="0%" stopColor="#a87c2e" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#a87c2e" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Soil glow */}
      <ellipse cx="60" cy="100" rx="35" ry="12" fill="url(#seedSoilGlow)" />
      {/* Ground */}
      <ellipse cx="60" cy="100" rx="30" ry="6" fill="#8B6914" opacity="0.35" />
      {/* Small grass blades */}
      <line x1="38" y1="100" x2="36" y2="92" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--1" />
      <line x1="45" y1="99" x2="43" y2="93" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--2" />
      <line x1="75" y1="99" x2="77" y2="93" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--3" />
      <line x1="82" y1="100" x2="84" y2="94" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--4" />
      {/* Seed body */}
      <ellipse cx="60" cy="88" rx="10" ry="12" fill="#8B6914" className="tree-anim-seed" />
      {/* Seed detail line */}
      <path d="M60 78 Q62 88 60 98" stroke="#6B4F10" strokeWidth="1" fill="none" />
      {/* Tiny glow under seed */}
      <ellipse cx="60" cy="93" rx="6" ry="2" fill="#22c55e" opacity="0.15" className="tree-anim-seed-glow" />
      {/* Floating dust particles */}
      <circle cx="42" cy="78" r="1" fill="#d4a847" className="tree-anim-particle tree-anim-particle--1" />
      <circle cx="78" cy="82" r="0.8" fill="#d4a847" className="tree-anim-particle tree-anim-particle--2" />
      <circle cx="55" cy="70" r="0.6" fill="#d4a847" className="tree-anim-particle tree-anim-particle--3" />
    </svg>
  );
}

function SproutIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Sprout stage">
      {/* Ground */}
      <ellipse cx="60" cy="100" rx="30" ry="6" fill="#8B6914" opacity="0.3" />
      {/* Grass */}
      <line x1="35" y1="100" x2="32" y2="90" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--1" />
      <line x1="42" y1="99" x2="40" y2="91" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--2" />
      <line x1="78" y1="99" x2="80" y2="91" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--3" />
      <line x1="85" y1="100" x2="87" y2="92" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--4" />
      {/* Stem */}
      <path d="M60 100 L60 72" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      {/* Leaves with flutter */}
      <ellipse cx="52" cy="72" rx="8" ry="5" fill="#22c55e" transform="rotate(-30 52 72)" className="tree-anim-leaf tree-anim-leaf--1 tree-anim-flutter" />
      <ellipse cx="68" cy="72" rx="8" ry="5" fill="#16a34a" transform="rotate(30 68 72)" className="tree-anim-leaf tree-anim-leaf--2 tree-anim-flutter--alt" />
      {/* Water drops */}
      <circle cx="48" cy="80" r="1.2" fill="#60a5fa" className="tree-anim-drop tree-anim-drop--1" />
      <circle cx="72" cy="76" r="1" fill="#60a5fa" className="tree-anim-drop tree-anim-drop--2" />
      {/* Floating particle */}
      <circle cx="40" cy="65" r="1" fill="#86efac" className="tree-anim-particle tree-anim-particle--1" />
    </svg>
  );
}

function SaplingIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Sapling stage">
      {/* Ground */}
      <ellipse cx="60" cy="105" rx="32" ry="6" fill="#8B6914" opacity="0.3" />
      {/* Grass */}
      <line x1="30" y1="105" x2="27" y2="95" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--1" />
      <line x1="38" y1="104" x2="35" y2="96" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--2" />
      <line x1="82" y1="104" x2="85" y2="96" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--3" />
      <line x1="90" y1="105" x2="92" y2="97" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--4" />
      {/* Rain drops */}
      <line x1="25" y1="15" x2="25" y2="22" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" className="tree-anim-rain tree-anim-rain--1" />
      <line x1="50" y1="8" x2="50" y2="15" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" className="tree-anim-rain tree-anim-rain--2" />
      <line x1="80" y1="12" x2="80" y2="19" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" className="tree-anim-rain tree-anim-rain--3" />
      <line x1="95" y1="20" x2="95" y2="27" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" className="tree-anim-rain tree-anim-rain--4" />
      <line x1="38" y1="5" x2="38" y2="12" stroke="#93c5fd" strokeWidth="0.8" strokeLinecap="round" className="tree-anim-rain tree-anim-rain--5" />
      <line x1="68" y1="18" x2="68" y2="25" stroke="#93c5fd" strokeWidth="0.8" strokeLinecap="round" className="tree-anim-rain tree-anim-rain--6" />
      {/* Trunk */}
      <path d="M60 105 L60 55" stroke="#92400e" strokeWidth="4" strokeLinecap="round" className="tree-anim-branch" />
      {/* Branches */}
      <path d="M60 75 L45 62" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 65 L75 55" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" className="tree-anim-branch" />
      {/* Leaves with flutter */}
      <circle cx="42" cy="58" r="8" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--1 tree-anim-flutter" />
      <circle cx="60" cy="48" r="9" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--2 tree-anim-flutter--alt" />
      <circle cx="78" cy="52" r="7" fill="#4ade80" className="tree-anim-leaf tree-anim-leaf--3 tree-anim-flutter" />
    </svg>
  );
}

function GrowingIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Growing tree stage">
      <defs>
        <radialGradient id="sunGlow" cx="95%" cy="5%" r="30%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Sun glow */}
      <circle cx="105" cy="15" r="30" fill="url(#sunGlow)" />
      {/* Sun */}
      <circle cx="105" cy="15" r="8" fill="#fbbf24" opacity="0.6" className="tree-anim-sun" />
      {/* Sun rays */}
      <line x1="105" y1="3" x2="105" y2="0" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" opacity="0.3" className="tree-anim-ray" />
      <line x1="115" y1="8" x2="118" y2="5" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" opacity="0.3" className="tree-anim-ray" />
      <line x1="117" y1="15" x2="120" y2="15" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" opacity="0.3" className="tree-anim-ray" />
      {/* Ground */}
      <ellipse cx="60" cy="108" rx="35" ry="6" fill="#8B6914" opacity="0.3" />
      {/* Grass */}
      <line x1="28" y1="108" x2="25" y2="98" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--1" />
      <line x1="35" y1="107" x2="32" y2="99" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--2" />
      <line x1="85" y1="107" x2="88" y2="99" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--3" />
      <line x1="92" y1="108" x2="94" y2="100" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--4" />
      {/* Trunk */}
      <path d="M60 108 L60 45" stroke="#78350f" strokeWidth="5" strokeLinecap="round" className="tree-anim-branch" />
      {/* Branches */}
      <path d="M60 80 L38 68" stroke="#78350f" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 70 L82 58" stroke="#78350f" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 58 L42 45" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 50 L76 40" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" className="tree-anim-branch" />
      {/* Canopy with flutter */}
      <circle cx="35" cy="62" r="10" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--1 tree-anim-flutter" />
      <circle cx="60" cy="38" r="12" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--2 tree-anim-flutter--alt" />
      <circle cx="82" cy="52" r="10" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--3 tree-anim-flutter" />
      <circle cx="42" cy="42" r="9" fill="#4ade80" className="tree-anim-leaf tree-anim-leaf--4 tree-anim-flutter--alt" />
      <circle cx="76" cy="36" r="9" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--5 tree-anim-flutter" />
      {/* Butterfly */}
      <g className="tree-anim-butterfly">
        <ellipse cx="0" cy="0" rx="3" ry="2" fill="#c084fc" className="tree-anim-wing-l" />
        <ellipse cx="0" cy="0" rx="3" ry="2" fill="#e879f9" className="tree-anim-wing-r" />
        <line x1="0" y1="-2" x2="0" y2="2" stroke="#9333ea" strokeWidth="0.5" />
      </g>
      {/* Floating particles */}
      <circle cx="20" cy="50" r="1" fill="#86efac" className="tree-anim-particle tree-anim-particle--1" />
      <circle cx="100" cy="45" r="0.8" fill="#86efac" className="tree-anim-particle tree-anim-particle--2" />
    </svg>
  );
}

function FullIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Full tree stage">
      <defs>
        <radialGradient id="fullSunGlow" cx="95%" cy="5%" r="30%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#15803d" floodOpacity="0.2" />
        </filter>
      </defs>
      {/* Sun glow */}
      <circle cx="105" cy="15" r="30" fill="url(#fullSunGlow)" />
      <circle cx="105" cy="15" r="8" fill="#fbbf24" opacity="0.7" className="tree-anim-sun" />
      {/* Sun rays */}
      <line x1="105" y1="3" x2="105" y2="0" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" className="tree-anim-ray" />
      <line x1="115" y1="8" x2="118" y2="5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" className="tree-anim-ray" />
      {/* Falling leaf */}
      <ellipse cx="22" cy="70" rx="2.5" ry="1.5" fill="#86efac" opacity="0.7" className="tree-anim-falling-leaf tree-anim-falling-leaf--1" />
      <ellipse cx="95" cy="60" rx="2" ry="1.2" fill="#4ade80" opacity="0.6" className="tree-anim-falling-leaf tree-anim-falling-leaf--2" />
      {/* Ground */}
      <ellipse cx="60" cy="110" rx="38" ry="6" fill="#8B6914" opacity="0.3" />
      {/* Grass */}
      <line x1="25" y1="110" x2="22" y2="100" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--1" />
      <line x1="32" y1="109" x2="29" y2="101" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--2" />
      <line x1="88" y1="109" x2="91" y2="101" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--3" />
      <line x1="95" y1="110" x2="97" y2="102" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--4" />
      {/* Small flower on ground */}
      <circle cx="20" cy="108" r="2" fill="#fca5a5" className="tree-anim-bloom tree-anim-bloom--6" />
      <circle cx="100" cy="108" r="1.8" fill="#c4b5fd" className="tree-anim-bloom tree-anim-bloom--7" />
      {/* Trunk */}
      <path d="M60 110 L60 50" stroke="#78350f" strokeWidth="6" strokeLinecap="round" className="tree-anim-branch" />
      {/* Roots */}
      <path d="M60 108 L48 112" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 108 L72 112" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      {/* Branches */}
      <path d="M60 85 L35 72" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 75 L85 62" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 62 L38 48" stroke="#78350f" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 55 L80 42" stroke="#78350f" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      {/* Full canopy with flutter + shadow */}
      <g filter="url(#leafShadow)">
        <circle cx="32" cy="65" r="12" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--1 tree-anim-flutter" />
        <circle cx="50" cy="42" r="13" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--2 tree-anim-flutter--alt" />
        <circle cx="70" cy="38" r="14" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--3 tree-anim-flutter" />
        <circle cx="88" cy="55" r="12" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--4 tree-anim-flutter--alt" />
        <circle cx="60" cy="30" r="14" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--5 tree-anim-flutter" />
        <circle cx="38" cy="52" r="10" fill="#4ade80" className="tree-anim-leaf tree-anim-leaf--6 tree-anim-flutter--alt" />
        <circle cx="78" cy="48" r="10" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--7 tree-anim-flutter" />
      </g>
      {/* Butterflies */}
      <g className="tree-anim-butterfly">
        <ellipse cx="0" cy="0" rx="3" ry="2" fill="#c084fc" className="tree-anim-wing-l" />
        <ellipse cx="0" cy="0" rx="3" ry="2" fill="#e879f9" className="tree-anim-wing-r" />
        <line x1="0" y1="-2" x2="0" y2="2" stroke="#9333ea" strokeWidth="0.5" />
      </g>
      <g className="tree-anim-butterfly tree-anim-butterfly--2">
        <ellipse cx="0" cy="0" rx="2.5" ry="1.5" fill="#fca5a5" className="tree-anim-wing-l" />
        <ellipse cx="0" cy="0" rx="2.5" ry="1.5" fill="#fda4af" className="tree-anim-wing-r" />
        <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke="#e11d48" strokeWidth="0.4" />
      </g>
      {/* Fireflies */}
      <circle cx="25" cy="55" r="1.5" fill="#fde68a" className="tree-anim-firefly tree-anim-firefly--1" />
      <circle cx="95" cy="42" r="1.2" fill="#fde68a" className="tree-anim-firefly tree-anim-firefly--2" />
      <circle cx="50" cy="25" r="1" fill="#fef08a" className="tree-anim-firefly tree-anim-firefly--3" />
    </svg>
  );
}

function BloomingIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg tree-svg--blooming" aria-label="Blooming tree stage">
      <defs>
        <radialGradient id="bloomSunGlow" cx="95%" cy="5%" r="35%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bloomAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.08" />
          <stop offset="60%" stopColor="#22c55e" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <filter id="bloomShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#15803d" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Aura glow behind tree */}
      <circle cx="60" cy="60" r="55" fill="url(#bloomAura)" className="tree-anim-glow" />
      {/* Sun glow */}
      <circle cx="105" cy="15" r="35" fill="url(#bloomSunGlow)" />
      <circle cx="105" cy="15" r="9" fill="#fbbf24" opacity="0.8" className="tree-anim-sun" />
      {/* Ground */}
      <ellipse cx="60" cy="110" rx="38" ry="6" fill="#8B6914" opacity="0.3" />
      {/* Grass */}
      <line x1="25" y1="110" x2="22" y2="100" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--1" />
      <line x1="32" y1="109" x2="29" y2="101" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--2" />
      <line x1="88" y1="109" x2="91" y2="101" stroke="#86efac" strokeWidth="1.2" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--3" />
      <line x1="95" y1="110" x2="97" y2="102" stroke="#4ade80" strokeWidth="1" strokeLinecap="round" className="tree-anim-grass tree-anim-grass--4" />
      {/* Ground flowers */}
      <circle cx="18" cy="108" r="2.2" fill="#fca5a5" className="tree-anim-bloom tree-anim-bloom--6" />
      <circle cx="102" cy="108" r="2" fill="#c4b5fd" className="tree-anim-bloom tree-anim-bloom--7" />
      <circle cx="28" cy="107" r="1.8" fill="#fde68a" className="tree-anim-bloom tree-anim-bloom--5" />
      {/* Falling petals */}
      <ellipse cx="20" cy="50" rx="2" ry="1.2" fill="#f9a8d4" opacity="0.7" className="tree-anim-petal tree-anim-petal--1" />
      <ellipse cx="45" cy="30" rx="1.8" ry="1" fill="#fda4af" opacity="0.6" className="tree-anim-petal tree-anim-petal--2" />
      <ellipse cx="85" cy="40" rx="2" ry="1.2" fill="#f9a8d4" opacity="0.5" className="tree-anim-petal tree-anim-petal--3" />
      <ellipse cx="100" cy="60" rx="1.5" ry="0.9" fill="#e9d5ff" opacity="0.6" className="tree-anim-petal tree-anim-petal--4" />
      <ellipse cx="35" cy="15" rx="1.8" ry="1" fill="#fda4af" opacity="0.5" className="tree-anim-petal tree-anim-petal--5" />
      {/* Trunk */}
      <path d="M60 110 L60 50" stroke="#78350f" strokeWidth="6" strokeLinecap="round" className="tree-anim-branch" />
      {/* Roots */}
      <path d="M60 108 L48 112" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 108 L72 112" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      {/* Branches */}
      <path d="M60 85 L35 72" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 75 L85 62" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 62 L38 48" stroke="#78350f" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 55 L80 42" stroke="#78350f" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      {/* Full canopy with shadow */}
      <g filter="url(#bloomShadow)">
        <circle cx="32" cy="65" r="12" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--1 tree-anim-flutter" />
        <circle cx="50" cy="42" r="13" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--2 tree-anim-flutter--alt" />
        <circle cx="70" cy="38" r="14" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--3 tree-anim-flutter" />
        <circle cx="88" cy="55" r="12" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--4 tree-anim-flutter--alt" />
        <circle cx="60" cy="30" r="14" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--5 tree-anim-flutter" />
        <circle cx="38" cy="52" r="10" fill="#4ade80" className="tree-anim-leaf tree-anim-leaf--6 tree-anim-flutter--alt" />
        <circle cx="78" cy="48" r="10" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--7 tree-anim-flutter" />
      </g>
      {/* Flowers / blooms */}
      <circle cx="35" cy="58" r="4" fill="#f472b6" className="tree-anim-bloom tree-anim-bloom--1" />
      <circle cx="55" cy="34" r="4.5" fill="#fb7185" className="tree-anim-bloom tree-anim-bloom--2" />
      <circle cx="72" cy="32" r="4" fill="#f472b6" className="tree-anim-bloom tree-anim-bloom--3" />
      <circle cx="85" cy="50" r="3.5" fill="#fb923c" className="tree-anim-bloom tree-anim-bloom--4" />
      <circle cx="60" cy="24" r="4" fill="#fbbf24" className="tree-anim-bloom tree-anim-bloom--5" />
      <circle cx="42" cy="45" r="3.5" fill="#a78bfa" className="tree-anim-bloom tree-anim-bloom--6" />
      <circle cx="76" cy="42" r="3.5" fill="#f472b6" className="tree-anim-bloom tree-anim-bloom--7" />
      {/* Glow ring */}
      <circle cx="60" cy="55" r="42" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.3" className="tree-anim-glow" />
      {/* Sparkle particles */}
      <circle cx="30" cy="35" r="2" fill="#fbbf24" opacity="0" className="tree-anim-sparkle" style={{ animationDelay: '0s', animationDuration: '2.5s' }} />
      <circle cx="90" cy="40" r="1.5" fill="#f472b6" opacity="0" className="tree-anim-sparkle" style={{ animationDelay: '0.8s', animationDuration: '3s' }} />
      <circle cx="48" cy="22" r="1.5" fill="#a78bfa" opacity="0" className="tree-anim-sparkle" style={{ animationDelay: '1.5s', animationDuration: '2.8s' }} />
      <circle cx="75" cy="28" r="2" fill="#fbbf24" opacity="0" className="tree-anim-sparkle" style={{ animationDelay: '2s', animationDuration: '2.5s' }} />
      {/* Butterflies */}
      <g className="tree-anim-butterfly">
        <ellipse cx="0" cy="0" rx="3" ry="2" fill="#c084fc" className="tree-anim-wing-l" />
        <ellipse cx="0" cy="0" rx="3" ry="2" fill="#e879f9" className="tree-anim-wing-r" />
        <line x1="0" y1="-2" x2="0" y2="2" stroke="#9333ea" strokeWidth="0.5" />
      </g>
      <g className="tree-anim-butterfly tree-anim-butterfly--2">
        <ellipse cx="0" cy="0" rx="2.5" ry="1.5" fill="#fca5a5" className="tree-anim-wing-l" />
        <ellipse cx="0" cy="0" rx="2.5" ry="1.5" fill="#fda4af" className="tree-anim-wing-r" />
        <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke="#e11d48" strokeWidth="0.4" />
      </g>
      {/* Fireflies */}
      <circle cx="18" cy="50" r="1.5" fill="#fde68a" className="tree-anim-firefly tree-anim-firefly--1" />
      <circle cx="100" cy="38" r="1.2" fill="#fde68a" className="tree-anim-firefly tree-anim-firefly--2" />
      <circle cx="45" cy="18" r="1" fill="#fef08a" className="tree-anim-firefly tree-anim-firefly--3" />
      <circle cx="80" cy="22" r="1.3" fill="#fde68a" className="tree-anim-firefly tree-anim-firefly--4" />
    </svg>
  );
}

// ─── Stage-to-illustration mapping ────────────────────────────────────────────

function TreeIllustration({ stage }: { stage: TreeGrowthStage }) {
  switch (stage) {
    case 'seed': return <SeedIllustration />;
    case 'sprout': return <SproutIllustration />;
    case 'sapling': return <SaplingIllustration />;
    case 'growing': return <GrowingIllustration />;
    case 'full': return <FullIllustration />;
    case 'blooming': return <BloomingIllustration />;
  }
}

// ─── Stage labels (Indonesian) ────────────────────────────────────────────────

const STAGE_LABELS: Record<TreeGrowthStage, string> = {
  seed: 'Benih',
  sprout: 'Tunas',
  sapling: 'Anakan',
  growing: 'Bertumbuh',
  full: 'Dewasa',
  blooming: 'Berbunga 🎉',
};

// ─── Single Tree Card ─────────────────────────────────────────────────────────

function SavingTreeCard({ tree }: { tree: SavingTree }) {
  const progress = calculateProgress(tree.currentAmount, tree.targetAmount);
  const stage = getTreeGrowthStage(progress);
  const confettiFired = useRef(false);

  useEffect(() => {
    if (stage === 'blooming' && !confettiFired.current) {
      confettiFired.current = true;
      // Fire confetti celebration
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#f472b6', '#fbbf24', '#22c55e', '#a78bfa'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#f472b6', '#fbbf24', '#22c55e', '#a78bfa'],
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [stage]);

  return (
    <div className={`saving-tree-card saving-tree-card--${stage}`}>
      <div className="saving-tree-card__illustration">
        <TreeIllustration stage={stage} />
      </div>

      <div className="saving-tree-card__info">
        <div className="saving-tree-card__header">
          <h3 className="saving-tree-card__name">{tree.name}</h3>
          <span className="saving-tree-card__stage-badge">{STAGE_LABELS[stage]}</span>
        </div>

        <div className="saving-tree-card__amounts">
          <span className="saving-tree-card__current">{formatRupiah(tree.currentAmount)}</span>
          <span className="saving-tree-card__separator">/</span>
          <span className="saving-tree-card__target">{formatRupiah(tree.targetAmount)}</span>
        </div>

        <div className="saving-tree-card__progress-bar">
          <div
            className="saving-tree-card__progress-fill"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress ${progress}%`}
          />
        </div>
        <div className="saving-tree-card__progress-label">{progress}%</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SavingTreeVisual({ trees }: SavingTreeVisualProps) {
  if (!trees || trees.length === 0) {
    return (
      <div className="saving-tree-empty">
        <Sprout size={40} />
        <p>Belum ada pohon tabungan. Mulai menabung sekarang!</p>
        <style jsx>{`
          .saving-tree-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 40px 20px;
            text-align: center;
            color: var(--dt-text-secondary, #6b7280);
            opacity: 0.8;
          }
          .saving-tree-empty p {
            font-size: 14px;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="saving-tree-grid">
      {trees.map((tree) => (
        <SavingTreeCard key={tree.id} tree={tree} />
      ))}

      <style jsx global>{`
        /* ─── Tree Animations ────────────────────────────────────── */

        @keyframes treeLeafAppear {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes treeBranchExtend {
          0% { stroke-dashoffset: 60; opacity: 0; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes treeBloomPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }

        @keyframes treeSeedBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes treeGlow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }

        @keyframes treeSway {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(2deg); }
          75% { transform: rotate(-2deg); }
        }

        @keyframes treeLeafFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          50% { transform: translateY(20px) rotate(45deg); opacity: 0.6; }
          100% { transform: translateY(40px) rotate(90deg); opacity: 0; }
        }

        @keyframes treeSparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }

        @keyframes progressFillGrow {
          from { width: 0; }
        }

        /* ─── Leaf flutter (wind effect on individual leaves) ───── */

        @keyframes treeLeafFlutter {
          0%, 100% { transform: scale(1) translate(0, 0); }
          25% { transform: scale(1.03) translate(1px, -0.5px); }
          50% { transform: scale(0.98) translate(-0.5px, 0.5px); }
          75% { transform: scale(1.02) translate(0.5px, -0.3px); }
        }

        @keyframes treeLeafFlutterAlt {
          0%, 100% { transform: scale(1) translate(0, 0); }
          30% { transform: scale(0.97) translate(-1px, 0.5px); }
          60% { transform: scale(1.04) translate(0.8px, -0.5px); }
          80% { transform: scale(1) translate(-0.3px, 0.3px); }
        }

        /* ─── Grass sway ─────────────────────────────────────────── */

        @keyframes treeGrassSway {
          0%, 100% { transform: rotate(0deg); }
          40% { transform: rotate(5deg); }
          70% { transform: rotate(-3deg); }
        }

        /* ─── Floating particles (dust, pollen) ──────────────────── */

        @keyframes treeParticleFloat {
          0% { transform: translate(0, 0); opacity: 0; }
          20% { opacity: 0.6; }
          50% { transform: translate(8px, -12px); opacity: 0.8; }
          80% { opacity: 0.4; }
          100% { transform: translate(15px, -25px); opacity: 0; }
        }

        /* ─── Rain drops ─────────────────────────────────────────── */

        @keyframes treeRainFall {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(100px); opacity: 0; }
        }

        /* ─── Water drops on leaves ──────────────────────────────── */

        @keyframes treeDropFall {
          0%, 80% { transform: translateY(0); opacity: 0.7; r: 1.2; }
          90% { transform: translateY(3px); opacity: 0.5; r: 1; }
          100% { transform: translateY(8px); opacity: 0; r: 0.5; }
        }

        /* ─── Butterfly path ─────────────────────────────────────── */

        @keyframes treeButterflyPath {
          0% { transform: translate(20px, 40px) rotate(0deg); }
          15% { transform: translate(35px, 32px) rotate(10deg); }
          30% { transform: translate(55px, 38px) rotate(-5deg); }
          50% { transform: translate(75px, 28px) rotate(8deg); }
          70% { transform: translate(90px, 35px) rotate(-8deg); }
          85% { transform: translate(100px, 25px) rotate(5deg); }
          100% { transform: translate(20px, 40px) rotate(0deg); }
        }

        @keyframes treeButterflyPath2 {
          0% { transform: translate(90px, 60px) rotate(0deg); }
          20% { transform: translate(75px, 50px) rotate(-10deg); }
          40% { transform: translate(50px, 55px) rotate(5deg); }
          60% { transform: translate(30px, 45px) rotate(-8deg); }
          80% { transform: translate(40px, 58px) rotate(6deg); }
          100% { transform: translate(90px, 60px) rotate(0deg); }
        }

        @keyframes treeWingFlap {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(0.3); }
        }

        @keyframes treeWingFlapR {
          0%, 100% { transform: scaleX(-1); }
          50% { transform: scaleX(-0.3); }
        }

        /* ─── Sun pulse ──────────────────────────────────────────── */

        @keyframes treeSunPulse {
          0%, 100% { opacity: 0.6; r: 8; }
          50% { opacity: 0.8; r: 9; }
        }

        @keyframes treeSunRayPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }

        /* ─── Firefly glow ───────────────────────────────────────── */

        @keyframes treeFireflyFloat {
          0% { transform: translate(0, 0); opacity: 0; }
          15% { opacity: 0.8; }
          30% { transform: translate(5px, -8px); opacity: 1; }
          50% { transform: translate(-3px, -15px); opacity: 0.6; }
          70% { transform: translate(8px, -10px); opacity: 0.9; }
          85% { opacity: 0.5; }
          100% { transform: translate(0, 0); opacity: 0; }
        }

        /* ─── Falling petals (blooming stage) ────────────────────── */

        @keyframes treePetalFall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.7; }
          50% { transform: translate(10px, 35px) rotate(180deg); opacity: 0.5; }
          75% { transform: translate(-5px, 60px) rotate(300deg); opacity: 0.3; }
          100% { transform: translate(8px, 90px) rotate(360deg); opacity: 0; }
        }

        /* ─── Seed glow pulse ────────────────────────────────────── */

        @keyframes treeSeedGlow {
          0%, 100% { opacity: 0.1; rx: 5; }
          50% { opacity: 0.3; rx: 8; }
        }

        /* ─── Falling leaf (full stage) ──────────────────────────── */

        @keyframes treeFallingLeaf {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.7; }
          30% { transform: translate(8px, 15px) rotate(45deg); opacity: 0.6; }
          60% { transform: translate(-5px, 35px) rotate(120deg); opacity: 0.4; }
          100% { transform: translate(10px, 55px) rotate(200deg); opacity: 0; }
        }

        /* ─── Tree SVG element animations ────────────────────────── */

        .tree-svg {
          width: 100%;
          height: 100%;
          transform-origin: center bottom;
          animation: treeSway 4s ease-in-out infinite;
        }

        .tree-svg--blooming {
          animation: treeSway 5s ease-in-out infinite;
        }

        .tree-anim-seed {
          animation: treeSeedBob 2s ease-in-out infinite;
        }

        .tree-anim-seed-glow {
          animation: treeSeedGlow 3s ease-in-out infinite;
        }

        .tree-anim-branch {
          stroke-dasharray: 60;
          stroke-dashoffset: 0;
          animation: treeBranchExtend 0.8s ease-out both;
        }

        .tree-anim-leaf {
          transform-origin: center;
          animation: treeLeafAppear 0.6s ease-out both;
        }
        .tree-anim-leaf--1 { animation-delay: 0.2s; }
        .tree-anim-leaf--2 { animation-delay: 0.35s; }
        .tree-anim-leaf--3 { animation-delay: 0.5s; }
        .tree-anim-leaf--4 { animation-delay: 0.65s; }
        .tree-anim-leaf--5 { animation-delay: 0.8s; }
        .tree-anim-leaf--6 { animation-delay: 0.95s; }
        .tree-anim-leaf--7 { animation-delay: 1.1s; }

        /* Leaf flutter — continuous wind-blown effect */
        .tree-anim-flutter {
          animation: treeLeafAppear 0.6s ease-out both, treeLeafFlutter 3s ease-in-out 1.2s infinite;
        }
        .tree-anim-flutter--alt {
          animation: treeLeafAppear 0.6s ease-out both, treeLeafFlutterAlt 3.5s ease-in-out 1.2s infinite;
        }

        .tree-anim-bloom {
          transform-origin: center;
          animation: treeBloomPulse 2s ease-in-out infinite;
        }
        .tree-anim-bloom--1 { animation-delay: 0s; }
        .tree-anim-bloom--2 { animation-delay: 0.3s; }
        .tree-anim-bloom--3 { animation-delay: 0.6s; }
        .tree-anim-bloom--4 { animation-delay: 0.9s; }
        .tree-anim-bloom--5 { animation-delay: 1.2s; }
        .tree-anim-bloom--6 { animation-delay: 1.5s; }
        .tree-anim-bloom--7 { animation-delay: 1.8s; }

        .tree-anim-glow {
          animation: treeGlow 3s ease-in-out infinite;
        }

        .tree-anim-sparkle {
          animation: treeSparkle 2.5s ease-in-out infinite;
        }

        /* Grass sway */
        .tree-anim-grass {
          transform-origin: bottom center;
          animation: treeGrassSway 2.5s ease-in-out infinite;
        }
        .tree-anim-grass--1 { animation-delay: 0s; }
        .tree-anim-grass--2 { animation-delay: 0.3s; }
        .tree-anim-grass--3 { animation-delay: 0.15s; }
        .tree-anim-grass--4 { animation-delay: 0.45s; }

        /* Floating particles */
        .tree-anim-particle {
          animation: treeParticleFloat 4s ease-in-out infinite;
        }
        .tree-anim-particle--1 { animation-delay: 0s; }
        .tree-anim-particle--2 { animation-delay: 1.5s; }
        .tree-anim-particle--3 { animation-delay: 3s; }

        /* Rain drops */
        .tree-anim-rain {
          animation: treeRainFall 1.5s linear infinite;
        }
        .tree-anim-rain--1 { animation-delay: 0s; }
        .tree-anim-rain--2 { animation-delay: 0.2s; }
        .tree-anim-rain--3 { animation-delay: 0.5s; }
        .tree-anim-rain--4 { animation-delay: 0.7s; }
        .tree-anim-rain--5 { animation-delay: 0.35s; }
        .tree-anim-rain--6 { animation-delay: 0.85s; }

        /* Water drops on leaf */
        .tree-anim-drop {
          animation: treeDropFall 3s ease-in infinite;
        }
        .tree-anim-drop--1 { animation-delay: 0.5s; }
        .tree-anim-drop--2 { animation-delay: 2s; }

        /* Butterfly */
        .tree-anim-butterfly {
          animation: treeButterflyPath 12s ease-in-out infinite;
        }
        .tree-anim-butterfly--2 {
          animation: treeButterflyPath2 15s ease-in-out infinite;
        }
        .tree-anim-wing-l {
          transform-origin: right center;
          animation: treeWingFlap 0.3s ease-in-out infinite;
        }
        .tree-anim-wing-r {
          transform-origin: left center;
          animation: treeWingFlapR 0.3s ease-in-out infinite;
        }

        /* Sun */
        .tree-anim-sun {
          animation: treeSunPulse 4s ease-in-out infinite;
        }
        .tree-anim-ray {
          animation: treeSunRayPulse 3s ease-in-out infinite;
        }

        /* Fireflies */
        .tree-anim-firefly {
          animation: treeFireflyFloat 5s ease-in-out infinite;
        }
        .tree-anim-firefly--1 { animation-delay: 0s; }
        .tree-anim-firefly--2 { animation-delay: 1.5s; }
        .tree-anim-firefly--3 { animation-delay: 3s; }
        .tree-anim-firefly--4 { animation-delay: 4s; }

        /* Falling petals (blooming) */
        .tree-anim-petal {
          animation: treePetalFall 6s ease-in-out infinite;
        }
        .tree-anim-petal--1 { animation-delay: 0s; }
        .tree-anim-petal--2 { animation-delay: 1.2s; }
        .tree-anim-petal--3 { animation-delay: 2.5s; }
        .tree-anim-petal--4 { animation-delay: 3.8s; }
        .tree-anim-petal--5 { animation-delay: 5s; }

        /* Falling leaf */
        .tree-anim-falling-leaf {
          animation: treeFallingLeaf 7s ease-in-out infinite;
        }
        .tree-anim-falling-leaf--1 { animation-delay: 0s; }
        .tree-anim-falling-leaf--2 { animation-delay: 3.5s; }

        /* ─── Reduced motion ─────────────────────────────────────── */

        @media (prefers-reduced-motion: reduce) {
          .tree-anim-seed,
          .tree-anim-seed-glow,
          .tree-anim-branch,
          .tree-anim-leaf,
          .tree-anim-bloom,
          .tree-anim-glow,
          .tree-anim-sparkle,
          .tree-anim-grass,
          .tree-anim-particle,
          .tree-anim-rain,
          .tree-anim-drop,
          .tree-anim-butterfly,
          .tree-anim-butterfly--2,
          .tree-anim-wing-l,
          .tree-anim-wing-r,
          .tree-anim-sun,
          .tree-anim-ray,
          .tree-anim-firefly,
          .tree-anim-petal,
          .tree-anim-falling-leaf,
          .tree-anim-flutter,
          .tree-anim-flutter--alt,
          .tree-svg,
          .tree-svg--blooming {
            animation: none !important;
            transform: none;
            opacity: 1;
            stroke-dashoffset: 0;
          }
          .saving-tree-card__progress-fill {
            animation: none !important;
          }
        }

        /* ─── Card Grid ──────────────────────────────────────────── */

        .saving-tree-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        /* ─── Tree Card ──────────────────────────────────────────── */

        .saving-tree-card {
          border-radius: 18px;
          padding: 20px;
          background: var(--dt-card-bg, #ffffff);
          border: 1px solid var(--dt-card-border, #e5e7eb);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .saving-tree-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
        }

        .saving-tree-card--blooming {
          border-color: #fbbf24;
          box-shadow: 0 2px 12px rgba(251, 191, 36, 0.15);
        }

        /* ─── Illustration area ──────────────────────────────────── */

        .saving-tree-card__illustration {
          width: 100%;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 100%);
          border-radius: 12px;
          padding: 12px;
        }

        [data-theme="dark"] .saving-tree-card__illustration {
          background: linear-gradient(180deg, rgba(22, 163, 74, 0.08) 0%, rgba(34, 197, 94, 0.04) 100%);
        }

        /* ─── Card Info ──────────────────────────────────────────── */

        .saving-tree-card__info {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .saving-tree-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .saving-tree-card__name {
          font-size: 16px;
          font-weight: 700;
          color: var(--dt-text-primary, #111827);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .saving-tree-card__stage-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 8px;
          background: var(--dt-badge-bg, #f3f4f6);
          color: var(--dt-text-secondary, #4b5563);
          white-space: nowrap;
        }

        .saving-tree-card--blooming .saving-tree-card__stage-badge {
          background: #fef3c7;
          color: #92400e;
        }

        /* ─── Amounts ────────────────────────────────────────────── */

        .saving-tree-card__amounts {
          display: flex;
          align-items: baseline;
          gap: 4px;
          font-size: 13px;
        }

        .saving-tree-card__current {
          font-weight: 700;
          color: #16a34a;
          font-size: 15px;
        }

        .saving-tree-card__separator {
          color: var(--dt-text-secondary, #9ca3af);
          font-weight: 400;
        }

        .saving-tree-card__target {
          color: var(--dt-text-secondary, #6b7280);
          font-weight: 500;
        }

        /* ─── Progress Bar ───────────────────────────────────────── */

        .saving-tree-card__progress-bar {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: var(--dt-badge-bg, #e5e7eb);
          overflow: hidden;
        }

        .saving-tree-card__progress-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          transition: width 0.6s ease-out;
          animation: progressFillGrow 0.8s ease-out both;
        }

        .saving-tree-card--blooming .saving-tree-card__progress-fill {
          background: linear-gradient(90deg, #22c55e, #fbbf24);
        }

        .saving-tree-card__progress-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--dt-text-secondary, #6b7280);
          text-align: right;
        }

        /* ─── Dark mode ──────────────────────────────────────────── */

        [data-theme="dark"] .saving-tree-card {
          background: var(--dt-card-bg, #1f2937);
          border-color: var(--dt-card-border, #374151);
        }

        [data-theme="dark"] .saving-tree-card__name {
          color: var(--dt-text-primary, #f9fafb);
        }

        [data-theme="dark"] .saving-tree-card__stage-badge {
          background: rgba(255, 255, 255, 0.08);
          color: var(--dt-text-secondary, #9ca3af);
        }

        [data-theme="dark"] .saving-tree-card--blooming .saving-tree-card__stage-badge {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        [data-theme="dark"] .saving-tree-card__progress-bar {
          background: rgba(255, 255, 255, 0.1);
        }

        /* ─── Responsive ─────────────────────────────────────────── */

        @media (max-width: 640px) {
          .saving-tree-grid {
            grid-template-columns: 1fr;
          }
          .saving-tree-card {
            padding: 16px;
          }
          .saving-tree-card__illustration {
            height: 120px;
          }
        }
      `}</style>
    </div>
  );
}

export default SavingTreeVisual;
