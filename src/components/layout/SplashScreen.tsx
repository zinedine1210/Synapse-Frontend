'use client';

import React from 'react';
import Image from 'next/image';
import { brand } from '@/config/brand';

export function SplashScreen() {
  return (
    <div className="splash-screen">
      {/* Animated background orbs */}
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />
      <div className="splash-orb splash-orb-3" />

      {/* Grid pattern overlay */}
      <div className="splash-grid" />

      {/* Content */}
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <div className="splash-logo-ring" />
          <div className="splash-logo">
            <Image
              src={brand.logoPath}
              alt={brand.name}
              width={52}
              height={52}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </div>

        <h1 className="splash-title">{brand.name}</h1>
        <p className="splash-tagline">{brand.tagline}</p>

        {/* Loading indicator */}
        <div className="splash-loader">
          <div className="splash-loader-track">
            <div className="splash-loader-bar" />
          </div>
        </div>
      </div>
    </div>
  );
}
