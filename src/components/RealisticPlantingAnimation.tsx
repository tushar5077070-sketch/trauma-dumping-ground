import React, { useEffect, useRef } from 'react';
import { FlowerVariant, SeedType } from '../types/garden';

export type PlantingPhase =
  | 'writing'
  | 'seed-falling'
  | 'soil-light'
  | 'stem-growing'
  | 'leaves-unfurling'
  | 'flower-blooming'
  | 'complete';

interface RealisticPlantingAnimationProps {
  seedType: SeedType;
  flowerVariant: FlowerVariant;
  onPhaseChange: (phase: Exclude<PlantingPhase, 'writing'>) => void;
}

interface SoilCrumb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  rotation: number;
  vRot: number;
  settled: boolean;
}

interface RainDrop {
  x: number;
  y: number;
  vy: number;
  length: number;
  alpha: number;
  spawnAt: number;
}

interface PollenMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  alpha: number;
}

interface BackgroundBlade {
  offsetX: number;
  height: number;
  lean: number;
  width: number;
  phase: number;
  tone: string;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

function easeOutBack(t: number): number {
  const c = clamp01(t);
  const c1 = 1.65;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getBezierPoint(
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0x + 3 * uu * t * p1x + 3 * u * tt * p2x + ttt * p3x,
    y: uuu * p0y + 3 * uu * t * p1y + 3 * u * tt * p2y + ttt * p3y,
  };
}

export const RealisticPlantingAnimation: React.FC<
  RealisticPlantingAnimationProps
> = ({ seedType, flowerVariant, onPhaseChange }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onPhaseChangeRef = useRef(onPhaseChange);

  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  }, [onPhaseChange]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let width = wrapper.clientWidth || 440;
    let height = wrapper.clientHeight || 270;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!wrapper || !canvas) return;
      width = Math.max(260, wrapper.clientWidth);
      height = Math.max(210, wrapper.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapper);

    // Precompute deterministic soil texture speckles
    const soilPebbles = Array.from({ length: 58 }).map((_, i) => ({
      rx: ((Math.sin(i * 19.7) + 1) * 0.5) * 2 - 1, // -1 .. 1
      ry: (Math.cos(i * 31.3) + 1) * 0.5, // 0 .. 1
      r: 0.9 + ((i * 7) % 5) * 0.45,
      tone:
        i % 3 === 0
          ? 'rgba(42, 26, 15, 0.55)'
          : i % 3 === 1
          ? 'rgba(118, 82, 52, 0.42)'
          : 'rgba(155, 118, 76, 0.3)',
    }));

    const bgBlades: BackgroundBlade[] = Array.from({ length: 42 }).map(
      (_, i) => {
        const norm = (i / 41) * 2 - 1;
        return {
          offsetX: norm * 0.46 + (Math.sin(i * 11.3) * 0.015),
          height: 16 + ((i * 13) % 24) * (1 - Math.abs(norm) * 0.28),
          lean: norm * 0.16 + Math.sin(i * 5.1) * 0.08,
          width: 1.6 + (i % 3) * 0.55,
          phase: i * 0.65,
          tone:
            i % 3 === 0
              ? '#497A31'
              : i % 3 === 1
              ? '#5E9640'
              : '#7BB456',
        };
      }
    );

    const pollenMotes: PollenMote[] = Array.from({ length: 22 }).map((_, i) => ({
      x: ((Math.sin(i * 13.7) + 1) * 0.5 - 0.5) * 220,
      y: ((Math.cos(i * 7.9) + 1) * 0.5) * 140,
      vx: (Math.sin(i * 3.1) * 0.28),
      vy: -0.22 - (i % 4) * 0.09,
      size: 1.3 + (i % 4) * 0.65,
      phase: i * 0.9,
      alpha: 0.3 + (i % 5) * 0.12,
    }));

    // Dynamic physics particles initialized on seed impact & sprout emergence
    let impactTriggered = false;
    let sproutCrumbsTriggered = false;
    const soilCrumbs: SoilCrumb[] = [];

    const rainDrops: RainDrop[] = Array.from({ length: 14 }).map((_, i) => ({
      x: ((Math.sin(i * 23.1) + 1) * 0.5 - 0.5) * 86,
      y: -110 - (i % 5) * 26,
      vy: 165 + (i % 4) * 24,
      length: 8 + (i % 3) * 4,
      alpha: 0.45 + (i % 3) * 0.15,
      spawnAt: 950 + i * 52,
    }));

    const spawnSoilBurst = (
      originX: number,
      originY: number,
      count: number,
      upwardBias: number
    ) => {
      const crumbPalette = ['#4E3320', '#63432B', '#795436', '#3A2414'];
      for (let i = 0; i < count; i++) {
        const spread = ((i / Math.max(1, count - 1)) - 0.5) * 2 + (Math.random() - 0.5) * 0.35;
        soilCrumbs.push({
          x: originX + spread * 4,
          y: originY - 1,
          vx: spread * (32 + Math.random() * 38),
          vy: -(upwardBias + Math.random() * 48),
          radius: 1.4 + Math.random() * 2.1,
          color: crumbPalette[i % crumbPalette.length],
          alpha: 0.95,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 9,
          settled: false,
        });
      }
    };

    const drawSeedShape = (
      cx: number,
      cy: number,
      rot: number,
      scale: number,
      alpha: number
    ) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      if (seedType === 'sunflower') {
        // Striped cream-and-espresso sunflower seed hull
        const grad = ctx.createLinearGradient(-5, -9, 5, 9);
        grad.addColorStop(0, '#3C2D24');
        grad.addColorStop(0.5, '#261B14');
        grad.addColorStop(1, '#1A110C');

        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.bezierCurveTo(6.5, -5, 6.2, 6.5, 0, 10.5);
        ctx.bezierCurveTo(-6.2, 6.5, -6.5, -5, 0, -10);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#EFE3C8';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(-2.3, -6.5);
        ctx.quadraticCurveTo(-3.4, 1, -1.6, 8);
        ctx.moveTo(2.1, -6.2);
        ctx.quadraticCurveTo(3.2, 1.5, 1.5, 8.2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 245, 220, 0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -8.5);
        ctx.lineTo(0, 8.5);
        ctx.stroke();
      } else if (seedType === 'daisy') {
        // Winged golden-ochre meadow achene seed
        const grad = ctx.createLinearGradient(-4, -9, 4, 9);
        grad.addColorStop(0, '#E8C57B');
        grad.addColorStop(0.6, '#C49245');
        grad.addColorStop(1, '#8C5F22');

        ctx.beginPath();
        ctx.moveTo(0, -9.5);
        ctx.bezierCurveTo(4.6, -4.5, 3.8, 6, 0, 9.5);
        ctx.bezierCurveTo(-3.8, 6, -4.6, -4.5, 0, -9.5);
        ctx.fillStyle = grad;
        ctx.fill();

        // Delicate pappus crown tuft on top
        ctx.strokeStyle = 'rgba(255, 250, 235, 0.88)';
        ctx.lineWidth = 0.9;
        for (let r = -2; r <= 2; r++) {
          ctx.beginPath();
          ctx.moveTo(r * 0.7, -8.5);
          ctx.lineTo(r * 2.1, -13.5);
          ctx.stroke();
        }
      } else {
        // Smooth oval mahogany lavender seed nutlet
        const grad = ctx.createRadialGradient(-1.5, -2.5, 1, 0, 0, 8);
        grad.addColorStop(0, '#A57C5B');
        grad.addColorStop(0.55, '#6B462B');
        grad.addColorStop(1, '#3D2414');

        ctx.beginPath();
        ctx.ellipse(0, 0, 4.4, 7.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 236, 210, 0.35)';
        ctx.beginPath();
        ctx.ellipse(-1.4, -2.4, 1.3, 2.7, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawLeafBlade = (
      anchorX: number,
      anchorY: number,
      side: -1 | 1,
      length: number,
      widthPx: number,
      angleRad: number,
      growProgress: number,
      isCotyledon: boolean
    ) => {
      if (growProgress <= 0.02) return;
      const g = easeOutCubic(growProgress);
      const len = length * g;
      const w = widthPx * g;

      ctx.save();
      ctx.translate(anchorX, anchorY);
      ctx.rotate(angleRad + side * lerp(0.55, 0, g));

      const grad = ctx.createLinearGradient(0, 0, side * len, -len * 0.45);
      if (isCotyledon) {
        grad.addColorStop(0, '#7EB85A');
        grad.addColorStop(1, '#BCE68E');
      } else {
        grad.addColorStop(0, '#46782B');
        grad.addColorStop(0.55, '#72AC4E');
        grad.addColorStop(1, '#B3DE84');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      if (isCotyledon) {
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          side * len * 0.4,
          -w * 1.1,
          side * len * 0.95,
          -w * 0.85,
          side * len,
          -w * 0.1
        );
        ctx.bezierCurveTo(
          side * len * 0.85,
          w * 0.55,
          side * len * 0.3,
          w * 0.45,
          0,
          0
        );
      } else {
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          side * len * 0.28,
          -len * 0.45 - w * 0.5,
          side * len * 0.72,
          -len * 0.65 - w * 0.25,
          side * len,
          -len * 0.52
        );
        ctx.bezierCurveTo(
          side * len * 0.75,
          -len * 0.2,
          side * len * 0.36,
          -len * 0.06,
          0,
          2
        );
      }
      ctx.fill();

      // Delicate sunlit midrib vein
      if (g > 0.35) {
        ctx.strokeStyle = 'rgba(232, 250, 198, 0.55)';
        ctx.lineWidth = isCotyledon ? 0.8 : 1.05;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        if (isCotyledon) {
          ctx.quadraticCurveTo(
            side * len * 0.5,
            -w * 0.2,
            side * len * 0.82,
            -w * 0.08
          );
        } else {
          ctx.quadraticCurveTo(
            side * len * 0.45,
            -len * 0.32,
            side * len * 0.86,
            -len * 0.46
          );
        }
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawBloomingFlowerHead = (
      headX: number,
      headY: number,
      tiltRad: number,
      budProgress: number,
      bloomProgress: number,
      variant: FlowerVariant
    ) => {
      const open = easeOutBack(bloomProgress);
      const bud = easeOutCubic(budProgress);

      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(tiltRad);

      // Soft warm backlit flower aura as it opens
      if (bloomProgress > 0.05) {
        const glowR = 34 * clamp01(bloomProgress);
        const halo = ctx.createRadialGradient(0, -14, 2, 0, -14, glowR);
        halo.addColorStop(0, 'rgba(255, 250, 212, 0.72)');
        halo.addColorStop(0.6, 'rgba(255, 242, 180, 0.25)');
        halo.addColorStop(1, 'rgba(255, 242, 180, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, -14, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 1. Calyx / Sepals holding the bud and peeling back on bloom
      const sepalSpread = lerp(0.18, 1.05, clamp01(bloomProgress * 1.15));
      const sepalScale = lerp(0.35, 1, bud);
      if (bud > 0.02) {
        for (const side of [-1, 1] as const) {
          ctx.save();
          ctx.scale(sepalScale, sepalScale);
          ctx.rotate(side * sepalSpread);
          ctx.fillStyle = '#5E943C';
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.quadraticCurveTo(side * 7, -6, side * 2, -16);
          ctx.quadraticCurveTo(-side * 2, -6, 0, 4);
          ctx.fill();
          ctx.restore();
        }
      }

      // If still only swelling bud before petals open, show tinted tight bud tip
      if (bloomProgress <= 0.02) {
        const budColor =
          variant === 'sunflower'
            ? '#E6B832'
            : variant === 'daisy'
            ? '#F9E6EE'
            : variant === 'yellow-tulip'
            ? '#FCE068'
            : variant === 'orange-tulip'
            ? '#F48A4E'
            : variant === 'lavender' || variant === 'purple-wildflower'
            ? '#C896EB'
            : '#F5B5CA';
        ctx.save();
        ctx.scale(bud, bud);
        ctx.fillStyle = budColor;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.bezierCurveTo(6, -12, 6, -2, 0, 2);
        ctx.bezierCurveTo(-6, -2, -6, -12, 0, -18);
        ctx.fill();
        ctx.fillStyle = '#6AA348';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.bezierCurveTo(6.5, -8, 6, 1, 0, 4);
        ctx.bezierCurveTo(-6, 1, -6.5, -8, 0, -12);
        ctx.fill();
        ctx.restore();
        ctx.restore();
        return;
      }

      // 2. Variant-specific petal-by-petal unfolding
      if (
        variant === 'pink-tulip' ||
        variant === 'yellow-tulip' ||
        variant === 'orange-tulip'
      ) {
        const palette =
          variant === 'pink-tulip'
            ? {
                back: '#EAA8C0',
                top: '#FFF7FA',
                mid: '#F6BFD4',
                deep: '#C66A8A',
                throat: '#FFF3B0',
              }
            : variant === 'yellow-tulip'
            ? {
                back: '#F5D14B',
                top: '#FFFDF2',
                mid: '#FFE87A',
                deep: '#CC8A18',
                throat: '#FFFBE0',
              }
            : {
                back: '#F29456',
                top: '#FFF5E0',
                mid: '#FFA866',
                deep: '#BE3F18',
                throat: '#FFF2A6',
              };

        const cupScale = lerp(0.55, 1.05, open);
        const petalFan = lerp(0.06, 0.34, open);

        ctx.save();
        ctx.scale(cupScale, cupScale);

        // Back petal
        ctx.fillStyle = palette.back;
        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.bezierCurveTo(-11, -6, -12, -32, 0, -37);
        ctx.bezierCurveTo(12, -32, 11, -6, 0, 3);
        ctx.fill();

        // Left & Right cupping petals rotating gently outward
        for (const side of [-1, 1] as const) {
          ctx.save();
          ctx.translate(side * 1.5, 2);
          ctx.rotate(side * petalFan);
          const pGrad = ctx.createLinearGradient(0, -36, 0, 4);
          pGrad.addColorStop(0, palette.top);
          pGrad.addColorStop(0.45, palette.mid);
          pGrad.addColorStop(1, palette.deep);
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.moveTo(0, 2);
          ctx.bezierCurveTo(
            side * 16,
            -2,
            side * 20,
            -25,
            side * 7,
            -35
          );
          ctx.bezierCurveTo(side * 1, -30, -side * 1, -12, 0, 2);
          ctx.fill();
          ctx.restore();
        }

        // Front central tulip petal
        const centerGrad = ctx.createLinearGradient(0, -36, 0, 4);
        centerGrad.addColorStop(0, '#FFFFFF');
        centerGrad.addColorStop(0.38, palette.mid);
        centerGrad.addColorStop(1, palette.deep);
        ctx.fillStyle = centerGrad;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.bezierCurveTo(-14, -4, -14, -27, -4, -34);
        ctx.quadraticCurveTo(0, -37, 4, -34);
        ctx.bezierCurveTo(14, -27, 14, -4, 0, 4);
        ctx.fill();

        // Warm sunlit inner throat glow
        ctx.globalAlpha = 0.45 * clamp01(bloomProgress);
        ctx.fillStyle = palette.throat;
        ctx.beginPath();
        ctx.ellipse(0, -4, 6.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (variant === 'daisy' || variant === 'sunflower') {
        const isSun = variant === 'sunflower';
        const petalCount = isSun ? 16 : 14;
        const diskRx = (isSun ? 10.5 : 8.2) * lerp(0.5, 1.05, open);
        const diskRy = (isSun ? 7.0 : 5.4) * lerp(0.5, 1.05, open);
        const petalLen = (isSun ? 27 : 23) * lerp(0.35, 1.04, open);
        const liftScale = lerp(0.3, 1.0, clamp01(bloomProgress * 1.1));

        ctx.save();
        ctx.translate(0, -15);

        // Back layer petals (behind the seed disk)
        for (let i = 0; i < petalCount; i++) {
          const baseAngle = (i / petalCount) * Math.PI * 2;
          // Draw upper half first
          if (Math.sin(baseAngle) > 0.15) continue;
          const petalOpenDelay = (i % 3) * 0.08;
          const pT = easeOutBack(clamp01((bloomProgress - petalOpenDelay) / 0.85));
          ctx.save();
          ctx.rotate(baseAngle);
          ctx.scale(1, 0.72 * pT * liftScale);
          const grad = ctx.createLinearGradient(0, -petalLen, 0, 0);
          if (isSun) {
            grad.addColorStop(0, '#FFF6A8');
            grad.addColorStop(0.55, '#F9C938');
            grad.addColorStop(1, '#C4710E');
          } else {
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.75, '#FFF5F9');
            grad.addColorStop(1, '#E6ABC0');
          }
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, -2);
          ctx.bezierCurveTo(-4.4, -petalLen * 0.45, -4.8, -petalLen * 0.85, 0, -petalLen);
          ctx.bezierCurveTo(4.8, -petalLen * 0.85, 4.4, -petalLen * 0.45, 0, -2);
          ctx.fill();
          ctx.restore();
        }

        // Seed Disk
        const diskGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, diskRx);
        if (isSun) {
          diskGrad.addColorStop(0, '#8C5127');
          diskGrad.addColorStop(0.55, '#4A250E');
          diskGrad.addColorStop(1, '#240F03');
        } else {
          diskGrad.addColorStop(0, '#FFF49C');
          diskGrad.addColorStop(0.6, '#F5C338');
          diskGrad.addColorStop(1, '#B3680A');
        }
        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, diskRx, diskRy, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isSun && bloomProgress > 0.3) {
          ctx.strokeStyle = 'rgba(245, 184, 46, 0.85)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([1.5, 2.2]);
          ctx.beginPath();
          ctx.ellipse(0, 0, diskRx * 0.78, diskRy * 0.74, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Front layer petals (overlapping the front rim slightly in 3/4 perspective)
        for (let i = 0; i < petalCount; i++) {
          const baseAngle = (i / petalCount) * Math.PI * 2;
          if (Math.sin(baseAngle) <= 0.15) continue;
          const petalOpenDelay = (i % 3) * 0.08 + 0.06;
          const pT = easeOutBack(clamp01((bloomProgress - petalOpenDelay) / 0.85));
          ctx.save();
          ctx.rotate(baseAngle);
          ctx.scale(1, 0.78 * pT * liftScale);
          const grad = ctx.createLinearGradient(0, -petalLen, 0, 0);
          if (isSun) {
            grad.addColorStop(0, '#FFF8B8');
            grad.addColorStop(0.55, '#F9C938');
            grad.addColorStop(1, '#C4710E');
          } else {
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.75, '#FFF5F9');
            grad.addColorStop(1, '#E6ABC0');
          }
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, 2);
          ctx.bezierCurveTo(-4.2, -petalLen * 0.4, -4.6, -petalLen * 0.8, 0, -petalLen * 0.92);
          ctx.bezierCurveTo(4.6, -petalLen * 0.8, 4.2, -petalLen * 0.4, 0, 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      } else {
        // Lavender / Purple-Wildflower raceme blooming progressively from bottom florets up to tip
        ctx.save();
        ctx.strokeStyle = '#72A64C';
        ctx.lineWidth = 1.9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.bezierCurveTo(-2, -16, 2, -32, 0, -52 * clamp01(bloomProgress * 1.15));
        ctx.stroke();

        const florets = [
          { x: -7, y: -5, s: 1.08, r: -0.32, start: 0.0 },
          { x: 8, y: -11, s: 1.02, r: 0.36, start: 0.1 },
          { x: -6, y: -19, s: 0.94, r: -0.25, start: 0.2 },
          { x: 6, y: -26, s: 0.88, r: 0.3, start: 0.3 },
          { x: -5, y: -34, s: 0.78, r: -0.2, start: 0.42 },
          { x: 4, y: -41, s: 0.7, r: 0.24, start: 0.54 },
          { x: -2, y: -48, s: 0.58, r: -0.14, start: 0.66 },
          { x: 1, y: -53, s: 0.48, r: 0.08, start: 0.76 },
        ];

        for (const fl of florets) {
          const ft = easeOutBack(clamp01((bloomProgress - fl.start) / 0.32));
          if (ft <= 0.02) continue;
          ctx.save();
          ctx.translate(fl.x, fl.y);
          ctx.rotate(fl.r);
          ctx.scale(fl.s * ft, fl.s * ft);

          const fGrad = ctx.createRadialGradient(0, -1, 0.5, 0, 0, 7);
          fGrad.addColorStop(0, '#FFF8FF');
          fGrad.addColorStop(0.5, '#E4B8FA');
          fGrad.addColorStop(1, '#9E5DC4');
          ctx.fillStyle = fGrad;

          for (let p = 0; p < 5; p++) {
            const ang = (p / 5) * Math.PI * 2 - Math.PI / 2;
            ctx.save();
            ctx.rotate(ang);
            ctx.beginPath();
            ctx.ellipse(0, -3.5, 2.2, 3.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.fillStyle = '#FFF5AD';
          ctx.beginPath();
          ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      ctx.restore();
    };

    let rafId = 0;
    const startPerf = performance.now();
    let prevPerf = startPerf;
    let lastEmittedPhase: Exclude<PlantingPhase, 'writing'> | null = null;

    const emitPhase = (next: Exclude<PlantingPhase, 'writing'>) => {
      if (lastEmittedPhase !== next) {
        lastEmittedPhase = next;
        onPhaseChangeRef.current(next);
      }
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - prevPerf) / 1000);
      prevPerf = now;

      const elapsedMs = prefersReducedMotion ? 5600 : now - startPerf;
      const tSec = elapsedMs * 0.001;

      // Update React caption phase synchronously from simulation clock
      if (elapsedMs < 900) {
        emitPhase('seed-falling');
      } else if (elapsedMs < 1850) {
        emitPhase('soil-light');
      } else if (elapsedMs < 2850) {
        emitPhase('stem-growing');
      } else if (elapsedMs < 3900) {
        emitPhase('leaves-unfurling');
      } else if (elapsedMs < 5400) {
        emitPhase('flower-blooming');
      } else {
        emitPhase('complete');
      }

      const centerX = width * 0.5;
      const groundY = height * 0.74;

      ctx.clearRect(0, 0, width, height);

      // 1. Warm sunlit atmospheric backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY + 12);
      skyGrad.addColorStop(0, '#CAE8FB');
      skyGrad.addColorStop(0.55, '#EFF8FF');
      skyGrad.addColorStop(1, '#D7EDC9');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, groundY + 12);

      // Gentle sun halo behind the bloom area
      const sunX = width * 0.5;
      const sunY = height * 0.28;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, width * 0.45);
      sunGlow.addColorStop(0, 'rgba(255, 252, 224, 0.85)');
      sunGlow.addColorStop(0.5, 'rgba(255, 248, 200, 0.32)');
      sunGlow.addColorStop(1, 'rgba(255, 248, 200, 0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, width, groundY + 12);

      // Distant soft meadow hill silhouette
      ctx.fillStyle = '#9ECA78';
      ctx.beginPath();
      ctx.moveTo(0, groundY + 4);
      ctx.quadraticCurveTo(width * 0.25, groundY - 14, width * 0.55, groundY - 5);
      ctx.quadraticCurveTo(width * 0.82, groundY + 4, width, groundY - 10);
      ctx.lineTo(width, groundY + 12);
      ctx.lineTo(0, groundY + 12);
      ctx.fill();

      // Gentle breeze formula active throughout
      const breeze = prefersReducedMotion
        ? 0
        : Math.sin(tSec * 1.85) * 0.075 + Math.cos(tSec * 0.9) * 0.03;

      // 2. Background grass blades flanking the planting mound
      for (const b of bgBlades) {
        const bx = centerX + b.offsetX * width;
        const sway = b.lean + breeze * (0.7 + (b.height / 40) * 0.5) + Math.sin(tSec * 2.1 + b.phase) * 0.04;
        const tipX = bx + Math.sin(sway) * b.height;
        const tipY = groundY + 2 - Math.cos(sway) * b.height;
        ctx.fillStyle = b.tone;
        ctx.beginPath();
        ctx.moveTo(bx - b.width * 0.5, groundY + 3);
        ctx.quadraticCurveTo(bx + sway * 10, groundY - b.height * 0.55, tipX, tipY);
        ctx.quadraticCurveTo(bx + sway * 10 + b.width * 0.4, groundY - b.height * 0.55, bx + b.width * 0.5, groundY + 3);
        ctx.fill();
      }

      // 3. Cross-section of warm rich living topsoil below groundY
      const soilDepth = height - groundY;
      const soilGrad = ctx.createLinearGradient(0, groundY - 2, 0, height);
      soilGrad.addColorStop(0, '#6B4C31');
      soilGrad.addColorStop(0.22, '#543A23');
      soilGrad.addColorStop(0.65, '#3E2918');
      soilGrad.addColorStop(1, '#2B1B0F');

      // Soft undulating topsoil horizon
      ctx.fillStyle = soilGrad;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 2);
      ctx.quadraticCurveTo(width * 0.25, groundY - 2, centerX - 46, groundY);
      // Small planting mound around centerX
      ctx.quadraticCurveTo(centerX, groundY - 9, centerX + 46, groundY);
      ctx.quadraticCurveTo(width * 0.78, groundY - 2, width, groundY + 2);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Subtle grass rim where meadow meets earth cutaway
      ctx.strokeStyle = 'rgba(132, 184, 92, 0.55)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 1);
      ctx.quadraticCurveTo(width * 0.25, groundY - 2.5, centerX - 46, groundY);
      ctx.quadraticCurveTo(centerX, groundY - 9, centerX + 46, groundY);
      ctx.quadraticCurveTo(width * 0.78, groundY - 2.5, width, groundY + 1);
      ctx.stroke();

      // Humus pebbles & soil grain texture
      for (const p of soilPebbles) {
        const px = centerX + p.rx * (width * 0.48);
        const py = groundY + 6 + p.ry * (soilDepth - 10);
        ctx.fillStyle = p.tone;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Moisture dampening & warm nourishment glow around buried seed (0.95s -> 5.4s+)
      const moistureLevel =
        smoothstep(950, 1750, elapsedMs) * (1 - 0.55 * smoothstep(3200, 5200, elapsedMs));
      if (moistureLevel > 0.02) {
        const dampGrad = ctx.createRadialGradient(
          centerX,
          groundY + 12,
          3,
          centerX,
          groundY + 12,
          56
        );
        dampGrad.addColorStop(0, `rgba(28, 17, 9, ${0.55 * moistureLevel})`);
        dampGrad.addColorStop(0.55, `rgba(38, 24, 14, ${0.28 * moistureLevel})`);
        dampGrad.addColorStop(1, 'rgba(38, 24, 14, 0)');
        ctx.fillStyle = dampGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, groundY + 12, 58, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        const auraGrad = ctx.createRadialGradient(
          centerX,
          groundY + 6,
          2,
          centerX,
          groundY + 6,
          44
        );
        auraGrad.addColorStop(0, `rgba(255, 224, 130, ${0.32 * moistureLevel})`);
        auraGrad.addColorStop(1, 'rgba(255, 224, 130, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(centerX, groundY + 6, 44, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Seed physics drop (0s -> 0.72s) & tucking into soil (0.72s -> 1.5s)
      const impactTimeMs = 680;
      const seedStartY = 26;
      const seedRestY = groundY + 10;

      if (elapsedMs < impactTimeMs) {
        const u = elapsedMs / impactTimeMs;
        // Gravity acceleration: y = s0 + (s1 - s0) * u^2
        const sy = lerp(seedStartY, groundY - 2, u * u);
        const flutterX = Math.sin(u * Math.PI * 3.2) * (1 - u) * 14;
        const rot = Math.sin(u * Math.PI * 2.5) * 0.45 * (1 - u * 0.7);
        drawSeedShape(centerX + flutterX, sy, rot, 1.0, smoothstep(0, 120, elapsedMs));
      } else {
        if (!impactTriggered && !prefersReducedMotion) {
          impactTriggered = true;
          spawnSoilBurst(centerX, groundY - 2, 15, 42);
        }

        const tuckProgress = smoothstep(impactTimeMs, 1350, elapsedMs);
        const seedY = lerp(groundY - 2, seedRestY, easeOutCubic(tuckProgress));
        const seedOpacity = 1 - smoothstep(1450, 2350, elapsedMs) * 0.45;
        drawSeedShape(centerX, seedY, 0.14 * tuckProgress, 0.96, seedOpacity);

        // Soft mounding earth covering the seed once tucked
        if (tuckProgress > 0.15) {
          ctx.save();
          ctx.globalAlpha = smoothstep(0.15, 0.95, tuckProgress) * 0.82;
          ctx.fillStyle = '#5B3E26';
          ctx.beginPath();
          ctx.ellipse(centerX, groundY - 1.5, 18, 6.5, 0, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 6. Underground Root System Germination (1.05s -> 3.8s+)
      const rootProgress = smoothstep(1050, 2900, elapsedMs);
      if (rootProgress > 0.01) {
        const rp = easeOutCubic(rootProgress);
        const rootLen = (soilDepth - 16) * 0.82 * rp;
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 236, 206, 0.85)';
        ctx.lineCap = 'round';

        // Primary taproot curving downward into earth
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(centerX, seedRestY + 2);
        const rEndX = centerX + 3 * rp;
        const rEndY = seedRestY + 2 + rootLen;
        ctx.bezierCurveTo(
          centerX - 5 * rp,
          seedRestY + rootLen * 0.35,
          centerX + 7 * rp,
          seedRestY + rootLen * 0.7,
          rEndX,
          rEndY
        );
        ctx.stroke();

        // Delicate branching lateral root hairs
        const subT = smoothstep(1450, 3200, elapsedMs);
        if (subT > 0.02) {
          ctx.lineWidth = 1.05;
          ctx.strokeStyle = 'rgba(245, 236, 206, 0.62)';
          const branches = [
            { sy: 0.25, dx: -20, dy: 11 },
            { sy: 0.38, dx: 22, dy: 13 },
            { sy: 0.56, dx: -17, dy: 12 },
            { sy: 0.7, dx: 15, dy: 10 },
          ];
          for (const br of branches) {
            const bt = easeOutCubic(subT);
            const startY = seedRestY + 2 + rootLen * br.sy;
            const startX = centerX + (br.dx > 0 ? 1.5 : -1.5);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(
              startX + br.dx * 0.5 * bt,
              startY + br.dy * 0.25 * bt,
              startX + br.dx * bt,
              startY + br.dy * bt
            );
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 7. Gentle Morning Rain / Mist Droplets (0.95s -> 1.85s)
      if (!prefersReducedMotion) {
        for (const drop of rainDrops) {
          if (elapsedMs < drop.spawnAt || elapsedMs > drop.spawnAt + 680) continue;
          const lifeSec = (elapsedMs - drop.spawnAt) / 1000;
          const dy = drop.y + lifeSec * drop.vy + groundY;
          if (dy <= groundY - 2) {
            ctx.save();
            ctx.strokeStyle = `rgba(174, 224, 255, ${drop.alpha})`;
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(centerX + drop.x, dy - drop.length);
            ctx.lineTo(centerX + drop.x, dy);
            ctx.stroke();
            ctx.restore();
          } else if (dy <= groundY + 24) {
            // Subtle splash ring on soil surface
            const rippleT = (dy - (groundY - 2)) / 26;
            ctx.save();
            ctx.strokeStyle = `rgba(210, 240, 255, ${(1 - rippleT) * 0.55})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(
              centerX + drop.x,
              groundY - 1,
              3 + rippleT * 9,
              1 + rippleT * 2.5,
              0,
              0,
              Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // 8. Stem Emergence & Curving Growth (1.85s -> 3.90s)
      const stemProgress = smoothstep(1820, 3850, elapsedMs);
      if (stemProgress > 0.01) {
        if (!sproutCrumbsTriggered && elapsedMs >= 1920 && !prefersReducedMotion) {
          sproutCrumbsTriggered = true;
          spawnSoilBurst(centerX, groundY - 5, 8, 28);
        }

        const sp = easeOutCubic(stemProgress);
        const maxStemHeight = Math.min(138, groundY - 56);
        const currStemHeight = lerp(10, maxStemHeight, sp);

        // Hypocotyl arch curl near early sprout stage that gracefully straightens
        const archAmount = (1 - smoothstep(1820, 2650, elapsedMs)) * 18;
        const tipSwayPx = breeze * currStemHeight * 0.72;

        const baseX = centerX;
        const baseY = groundY + 1;
        const tipX = centerX + tipSwayPx + archAmount * 0.45;
        const tipY = groundY - currStemHeight;

        const ctrl1X = baseX + tipSwayPx * 0.22 - archAmount * 0.35;
        const ctrl1Y = baseY - currStemHeight * 0.36;
        const ctrl2X = baseX + tipSwayPx * 0.72 + archAmount;
        const ctrl2Y = baseY - currStemHeight * 0.72 - archAmount * 0.4;

        // Subtle shadow stroke + sunlit stem stroke
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#3E6E24';
        ctx.lineWidth = lerp(2.6, 4.4, sp);
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, tipX, tipY);
        ctx.stroke();

        const stemGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
        stemGrad.addColorStop(0, '#4E8232');
        stemGrad.addColorStop(0.55, '#7BB353');
        stemGrad.addColorStop(1, '#B4DF87');
        ctx.strokeStyle = stemGrad;
        ctx.lineWidth = lerp(1.8, 2.9, sp);
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, tipX, tipY);
        ctx.stroke();
        ctx.restore();

        // 9. Cotyledons & True Botanical Leaves Unfurling along Stem
        const cotyProgress = smoothstep(2350, 3150, elapsedMs);
        if (cotyProgress > 0.02) {
          const pCot = getBezierPoint(
            baseX,
            baseY,
            ctrl1X,
            ctrl1Y,
            ctrl2X,
            ctrl2Y,
            tipX,
            tipY,
            0.22
          );
          drawLeafBlade(pCot.x, pCot.y, -1, 16, 7.5, breeze * 0.35, cotyProgress, true);
          drawLeafBlade(pCot.x, pCot.y, 1, 16, 7.5, breeze * 0.35, cotyProgress, true);
        }

        const leaf1Progress = smoothstep(2750, 3650, elapsedMs);
        if (leaf1Progress > 0.02) {
          const pLeaf1 = getBezierPoint(
            baseX,
            baseY,
            ctrl1X,
            ctrl1Y,
            ctrl2X,
            ctrl2Y,
            tipX,
            tipY,
            0.34
          );
          drawLeafBlade(
            pLeaf1.x,
            pLeaf1.y,
            -1,
            34,
            13,
            breeze * 0.45,
            leaf1Progress,
            false
          );
        }

        const leaf2Progress = smoothstep(2980, 3880, elapsedMs);
        if (leaf2Progress > 0.02) {
          const pLeaf2 = getBezierPoint(
            baseX,
            baseY,
            ctrl1X,
            ctrl1Y,
            ctrl2X,
            ctrl2Y,
            tipX,
            tipY,
            0.52
          );
          drawLeafBlade(
            pLeaf2.x,
            pLeaf2.y,
            1,
            30,
            11.5,
            breeze * 0.55,
            leaf2Progress,
            false
          );
        }

        // 10. Swelling Flower Bud & Realistic Petal-by-Petal Bloom (3.45s -> 5.40s+)
        const budProgress = smoothstep(3380, 4050, elapsedMs);
        const bloomProgress = smoothstep(3920, 5280, elapsedMs);
        if (budProgress > 0.02) {
          const headTilt = breeze * 0.85 + archAmount * 0.03;
          drawBloomingFlowerHead(
            tipX,
            tipY,
            headTilt,
            budProgress,
            bloomProgress,
            flowerVariant
          );
        }
      }

      // 11. Physics Soil Crumbs (from seed drop & sprout emergence)
      for (const c of soilCrumbs) {
        if (!c.settled) {
          c.vy += 210 * dt;
          c.vx *= 0.985;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.rotation += c.vRot * dt;

          const floorY = groundY - 0.5;
          if (c.y >= floorY) {
            c.y = floorY;
            if (Math.abs(c.vy) > 18) {
              c.vy = -c.vy * 0.28;
              c.vx *= 0.55;
            } else {
              c.vy = 0;
              c.vx = 0;
              c.settled = true;
            }
          }
        }
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.globalAlpha = c.alpha;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, c.radius, c.radius * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 12. Soft Sunlit Pollen & Morning Mist Motes floating upward once bloom opens
      const moteAlphaFactor = smoothstep(3700, 4800, elapsedMs);
      if (moteAlphaFactor > 0.02) {
        for (const m of pollenMotes) {
          const driftTime = Math.max(0, tSec - 3.7);
          const mx =
            centerX +
            m.x +
            Math.sin(tSec * 1.1 + m.phase) * 14 +
            driftTime * m.vx * 18;
          const myRaw =
            groundY -
            40 -
            ((m.y + driftTime * Math.abs(m.vy) * 42) % (groundY - 12));
          const fadeTop = smoothstep(8, 38, myRaw);

          ctx.save();
          ctx.globalAlpha = m.alpha * moteAlphaFactor * fadeTop;
          ctx.fillStyle = '#FFFCE0';
          ctx.shadowColor = '#FFE97F';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(mx, myRaw, m.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [seedType, flowerVariant]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-60 sm:h-72 rounded-2xl overflow-hidden border border-white/80 shadow-inner bg-sky-50"
    >
      <canvas
        ref={canvasRef}
        aria-label="Animated time-lapse of your seed taking root, sprouting leaves, and blooming into a meadow flower"
        className="block w-full h-full"
      />
    </div>
  );
};
