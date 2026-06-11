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
      {/* Ground */}
      <ellipse cx="60" cy="100" rx="30" ry="6" fill="#8B6914" opacity="0.3" />
      {/* Seed body */}
      <ellipse cx="60" cy="88" rx="10" ry="12" fill="#8B6914" className="tree-anim-seed" />
      {/* Seed detail line */}
      <path d="M60 78 Q62 88 60 98" stroke="#6B4F10" strokeWidth="1" fill="none" />
    </svg>
  );
}

function SproutIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Sprout stage">
      {/* Ground */}
      <ellipse cx="60" cy="100" rx="30" ry="6" fill="#8B6914" opacity="0.3" />
      {/* Stem */}
      <path d="M60 100 L60 72" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      {/* Leaves */}
      <ellipse cx="52" cy="72" rx="8" ry="5" fill="#22c55e" transform="rotate(-30 52 72)" className="tree-anim-leaf tree-anim-leaf--1" />
      <ellipse cx="68" cy="72" rx="8" ry="5" fill="#16a34a" transform="rotate(30 68 72)" className="tree-anim-leaf tree-anim-leaf--2" />
    </svg>
  );
}

function SaplingIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Sapling stage">
      {/* Ground */}
      <ellipse cx="60" cy="105" rx="32" ry="6" fill="#8B6914" opacity="0.3" />
      {/* Trunk */}
      <path d="M60 105 L60 55" stroke="#92400e" strokeWidth="4" strokeLinecap="round" className="tree-anim-branch" />
      {/* Branches */}
      <path d="M60 75 L45 62" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 65 L75 55" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" className="tree-anim-branch" />
      {/* Leaves */}
      <circle cx="42" cy="58" r="8" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--1" />
      <circle cx="60" cy="48" r="9" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--2" />
      <circle cx="78" cy="52" r="7" fill="#4ade80" className="tree-anim-leaf tree-anim-leaf--3" />
    </svg>
  );
}

function GrowingIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Growing tree stage">
      {/* Ground */}
      <ellipse cx="60" cy="108" rx="35" ry="6" fill="#8B6914" opacity="0.3" />
      {/* Trunk */}
      <path d="M60 108 L60 45" stroke="#78350f" strokeWidth="5" strokeLinecap="round" className="tree-anim-branch" />
      {/* Branches */}
      <path d="M60 80 L38 68" stroke="#78350f" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 70 L82 58" stroke="#78350f" strokeWidth="3" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 58 L42 45" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" className="tree-anim-branch" />
      <path d="M60 50 L76 40" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" className="tree-anim-branch" />
      {/* Canopy */}
      <circle cx="35" cy="62" r="10" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--1" />
      <circle cx="60" cy="38" r="12" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--2" />
      <circle cx="82" cy="52" r="10" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--3" />
      <circle cx="42" cy="42" r="9" fill="#4ade80" className="tree-anim-leaf tree-anim-leaf--4" />
      <circle cx="76" cy="36" r="9" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--5" />
    </svg>
  );
}

function FullIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Full tree stage">
      {/* Ground */}
      <ellipse cx="60" cy="110" rx="38" ry="6" fill="#8B6914" opacity="0.3" />
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
      {/* Full canopy */}
      <circle cx="32" cy="65" r="12" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--1" />
      <circle cx="50" cy="42" r="13" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--2" />
      <circle cx="70" cy="38" r="14" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--3" />
      <circle cx="88" cy="55" r="12" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--4" />
      <circle cx="60" cy="30" r="14" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--5" />
      <circle cx="38" cy="52" r="10" fill="#4ade80" className="tree-anim-leaf tree-anim-leaf--6" />
      <circle cx="78" cy="48" r="10" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--7" />
    </svg>
  );
}

function BloomingIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="tree-svg" aria-label="Blooming tree stage">
      {/* Ground */}
      <ellipse cx="60" cy="110" rx="38" ry="6" fill="#8B6914" opacity="0.3" />
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
      {/* Full canopy */}
      <circle cx="32" cy="65" r="12" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--1" />
      <circle cx="50" cy="42" r="13" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--2" />
      <circle cx="70" cy="38" r="14" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--3" />
      <circle cx="88" cy="55" r="12" fill="#15803d" className="tree-anim-leaf tree-anim-leaf--4" />
      <circle cx="60" cy="30" r="14" fill="#16a34a" className="tree-anim-leaf tree-anim-leaf--5" />
      <circle cx="38" cy="52" r="10" fill="#4ade80" className="tree-anim-leaf tree-anim-leaf--6" />
      <circle cx="78" cy="48" r="10" fill="#22c55e" className="tree-anim-leaf tree-anim-leaf--7" />
      {/* Flowers / blooms */}
      <circle cx="35" cy="58" r="4" fill="#f472b6" className="tree-anim-bloom tree-anim-bloom--1" />
      <circle cx="55" cy="34" r="4.5" fill="#fb7185" className="tree-anim-bloom tree-anim-bloom--2" />
      <circle cx="72" cy="32" r="4" fill="#f472b6" className="tree-anim-bloom tree-anim-bloom--3" />
      <circle cx="85" cy="50" r="3.5" fill="#fb923c" className="tree-anim-bloom tree-anim-bloom--4" />
      <circle cx="60" cy="24" r="4" fill="#fbbf24" className="tree-anim-bloom tree-anim-bloom--5" />
      <circle cx="42" cy="45" r="3.5" fill="#a78bfa" className="tree-anim-bloom tree-anim-bloom--6" />
      <circle cx="76" cy="42" r="3.5" fill="#f472b6" className="tree-anim-bloom tree-anim-bloom--7" />
      {/* Glow effect */}
      <circle cx="60" cy="55" r="42" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.3" className="tree-anim-glow" />
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
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.15);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes treeBranchExtend {
          0% {
            stroke-dashoffset: 60;
            opacity: 0;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes treeBloomPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.7;
          }
        }

        @keyframes treeSeedBob {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes treeGlow {
          0%, 100% {
            opacity: 0.2;
            r: 42;
          }
          50% {
            opacity: 0.5;
            r: 45;
          }
        }

        @keyframes progressFillGrow {
          from {
            width: 0;
          }
        }

        /* ─── Tree SVG element animations ────────────────────────── */

        .tree-svg {
          width: 100%;
          height: 100%;
        }

        .tree-anim-seed {
          animation: treeSeedBob 2s ease-in-out infinite;
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

        /* ─── Reduced motion ─────────────────────────────────────── */

        @media (prefers-reduced-motion: reduce) {
          .tree-anim-seed,
          .tree-anim-branch,
          .tree-anim-leaf,
          .tree-anim-bloom,
          .tree-anim-glow {
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
