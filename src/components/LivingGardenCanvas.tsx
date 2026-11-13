import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Story } from '../types/garden';
import { soundscape } from '../utils/soundscape';
import { MeadowFlowerSvg } from './FlowerIllustration';

interface LivingGardenCanvasProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  highlightedStoryId?: string | null;
}

interface GrassBlade {
  xRatio: number;
  yOffsetRatio: number;
  height: number;
  width: number;
  color: string;
  highlightColor: string;
  phase: number;
  speed: number;
  stiffness: number;
  currentAngle: number;
  velocity: number;
  layer: 0 | 1 | 2;
  isFoxtail: boolean;
  blossomType: 'blue' | 'yellow' | 'pink' | 'lavender' | null;
}

interface AtmosphericParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  kind: 'pollen' | 'petal' | 'bokeh' | 'dandelion';
  color: string;
  rotation: number;
  vRot: number;
}

interface Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wingPhase: number;
  color: string;
  innerColor: string;
  scale: number;
}

export const LivingGardenCanvas: React.FC<LivingGardenCanvasProps> = ({
  stories,
  onSelectStory,
  highlightedStoryId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);
  const [cursorParallax, setCursorParallax] = useState({ x: 0, y: 0 });
  const [flowerBends, setFlowerBends] = useState<Record<string, number>>({});

  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  const springStateRef = useRef<
    Record<string, { angle: number; velocity: number; phase: number; speed: number }>
  >({});

  // Sync spring physics states for all stories
  useEffect(() => {
    const current = springStateRef.current;
    stories.forEach((story, idx) => {
      if (!current[story.storyId]) {
        current[story.storyId] = {
          angle: 0,
          velocity: 0,
          phase: idx * 1.17,
          speed: 1.05 + (idx % 5) * 0.14,
        };
      }
    });
  }, [stories]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const updateCanvasSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Load the reference meadow photograph & orient it into a crisp landscape offscreen canvas
    const offscreenLandscape = document.createElement('canvas');
    offscreenLandscape.width = 1600;
    offscreenLandscape.height = 900;
    let isPhotoLoaded = false;

    const refImage = new Image();
    refImage.crossOrigin = 'anonymous';
    refImage.src =
      '/assets/aistudio/WhatsApp_Image_2026-11-04_at_23.23.46_8e9dddc2.jpeg';
    refImage.onload = () => {
      const oCtx = offscreenLandscape.getContext('2d');
      if (!oCtx) return;
      const w = offscreenLandscape.width;
      const h = offscreenLandscape.height;
      oCtx.save();
      // The uploaded image is rotated 90deg CW (portrait 653x1280).
      // Rotating -90deg CCW places the blue sky & cumulus clouds at top and the flower meadow at bottom.
      oCtx.translate(w / 2, h / 2);
      oCtx.rotate(-Math.PI / 2);
      // Slight 1.08x zoom crops the tiny watermark on the right sky edge and fills 16:9 cleanly
      const drawW = h * 1.08;
      const drawH = w * 1.08;
      oCtx.drawImage(refImage, -drawW / 2 - 22, -drawH / 2, drawW, drawH);
      oCtx.restore();
      isPhotoLoaded = true;
    };

    // Foreground & Mid-ground High-Detail Grass & Wildflower Blades
    const grassPalette = [
      { base: '#346320', lit: '#689E48' },
      { base: '#44782C', lit: '#82B85D' },
      { base: '#558C3B', lit: '#9BCE73' },
      { base: '#6BA34C', lit: '#B8E38E' },
    ];
    const blades: GrassBlade[] = [];
    const bladeCount = Math.min(340, Math.max(180, Math.floor(width / 4.2)));

    for (let i = 0; i < bladeCount; i++) {
      const layer = (i % 3) as 0 | 1 | 2;
      const xRatio = i / bladeCount + (Math.random() - 0.5) * 0.016;
      const yOffsetRatio =
        layer === 0
          ? 0.24 + Math.random() * 0.15
          : layer === 1
          ? 0.09 + Math.random() * 0.16
          : -0.04 + Math.random() * 0.12;

      const hBase =
        layer === 0
          ? 44 + Math.random() * 40
          : layer === 1
          ? 68 + Math.random() * 56
          : 92 + Math.random() * 78;

      const pal = grassPalette[(i + layer) % grassPalette.length];
      const roll = Math.random();
      let blossomType: GrassBlade['blossomType'] = null;
      if (roll < 0.11) blossomType = 'blue';
      else if (roll < 0.19) blossomType = 'yellow';
      else if (roll < 0.27) blossomType = 'pink';
      else if (roll < 0.34) blossomType = 'lavender';

      blades.push({
        xRatio,
        yOffsetRatio,
        height: hBase,
        width: layer === 0 ? 1.8 : layer === 1 ? 2.6 : 3.6,
        color: pal.base,
        highlightColor: pal.lit,
        phase: Math.random() * Math.PI * 2,
        speed: 1.0 + Math.random() * 0.85,
        stiffness: 0.08 + Math.random() * 0.04,
        currentAngle: 0,
        velocity: 0,
        layer,
        isFoxtail: !blossomType && Math.random() < 0.14,
        blossomType,
      });
    }

    // Atmospheric VFX Particles: Golden Pollen, Floating Petals, Dandelion Seeds, and Lens Bokeh
    const particles: AtmosphericParticle[] = Array.from({ length: 64 }).map(
      (_, i) => {
        const kindRoll = Math.random();
        const kind: AtmosphericParticle['kind'] =
          kindRoll < 0.48
            ? 'pollen'
            : kindRoll < 0.72
            ? 'bokeh'
            : kindRoll < 0.88
            ? 'petal'
            : 'dandelion';

        const petalColors = ['#FFD9E6', '#FFF3B0', '#E8D1FF', '#FFC4A3'];
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0.22 + Math.random() * 0.48,
          vy: -0.12 + (Math.random() - 0.5) * 0.28,
          size:
            kind === 'bokeh'
              ? 14 + Math.random() * 28
              : kind === 'dandelion'
              ? 5 + Math.random() * 3
              : 1.8 + Math.random() * 2.8,
          alpha:
            kind === 'bokeh'
              ? 0.08 + Math.random() * 0.14
              : 0.45 + Math.random() * 0.45,
          kind,
          color: petalColors[i % petalColors.length],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.022,
        };
      }
    );

    // 3 Fluttering Meadow Butterflies
    const butterflies: Butterfly[] = [
      {
        x: width * 0.25,
        y: height * 0.62,
        vx: 0.75,
        vy: -0.15,
        wingPhase: 0,
        color: '#FFF7D6',
        innerColor: '#F9C846',
        scale: 0.95,
      },
      {
        x: width * 0.68,
        y: height * 0.58,
        vx: -0.65,
        vy: 0.12,
        wingPhase: 2.1,
        color: '#FFE3EE',
        innerColor: '#F497B6',
        scale: 0.85,
      },
      {
        x: width * 0.48,
        y: height * 0.68,
        vx: 0.55,
        vy: -0.1,
        wingPhase: 4.2,
        color: '#EFE3FF',
        innerColor: '#C59BE8',
        scale: 0.78,
      },
    ];

    let animationFrameId: number;
    let lastSpringSync = 0;

    const render = (timeMs: number) => {
      const t = timeMs * 0.001;
      const ptr = pointerRef.current;

      const normPtrX = ptr.active ? ptr.x / width - 0.5 : 0;
      const normPtrY = ptr.active ? ptr.y / height - 0.5 : 0;

      if (isPhotoLoaded) {
        // 1A. Draw Upper Sky & Cumulus Horizon with smooth parallax
        const srcW = offscreenLandscape.width;
        const srcH = offscreenLandscape.height;
        const padX = 28;
        const padY = 18;
        const skyParallaxX = -normPtrX * 16 + Math.sin(t * 0.18) * 6;
        const skyParallaxY = -normPtrY * 10;

        ctx.drawImage(
          offscreenLandscape,
          0,
          0,
          srcW,
          srcH * 0.54,
          -padX + skyParallaxX,
          -padY + skyParallaxY,
          width + padX * 2,
          height * 0.55 + padY
        );

        // 1B. Draw Lower Flower Meadow with Real-Time Wind Ripple & Cursor Parting Displacement
        const strips = 36;
        const meadowStartRatio = 0.45;
        const meadowEndRatio = 1.0;

        for (let s = 0; s < strips; s++) {
          const frac0 = s / strips;
          const frac1 = (s + 1) / strips;
          const rY0 = meadowStartRatio + frac0 * (meadowEndRatio - meadowStartRatio);
          const rY1 = meadowStartRatio + frac1 * (meadowEndRatio - meadowStartRatio);

          const sy = rY0 * srcH;
          const sh = (rY1 - rY0) * srcH + 1.5;

          const dy = rY0 * height;
          const dh = (rY1 - rY0) * height + 1.5;

          // Wind wave increases toward foreground strips
          const depthWeight = Math.pow(frac0, 1.25);
          const windShift = prefersReducedMotion
            ? 0
            : Math.sin(t * 1.65 - frac0 * 4.8) * (7.5 * depthWeight) +
              Math.cos(t * 0.9 + frac0 * 3.1) * (3.5 * depthWeight);

          // Subtle cursor ripple in the meadow
          let cursorShift = 0;
          if (ptr.active && !prefersReducedMotion) {
            const distY = Math.abs(dy - ptr.y);
            if (distY < 130) {
              const wy = 1 - distY / 130;
              cursorShift = Math.sin((ptr.x / width) * Math.PI * 2) * wy * 5.5;
            }
          }

          const parallaxShift = normPtrX * (22 * depthWeight);
          const totalShiftX = windShift + parallaxShift + cursorShift;

          ctx.drawImage(
            offscreenLandscape,
            0,
            sy,
            srcW,
            sh,
            -padX + totalShiftX,
            dy - padY * 0.3,
            width + padX * 2,
            dh + padY * 0.3
          );
        }
      } else {
        // Immediate fallback gradient while photo buffer initializes
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#449CE0');
        skyGrad.addColorStop(0.48, '#87CDF6');
        skyGrad.addColorStop(0.55, '#F4FAFF');
        skyGrad.addColorStop(0.65, '#86BE64');
        skyGrad.addColorStop(1, '#3D7028');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Volumetric Drifting Cloud Veil & Sunlit Horizon Mist
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let c = 0; c < 4; c++) {
        const cloudX =
          ((width * (0.2 * c) + t * (9 + c * 3)) % (width + 500)) - 250;
        const cloudY = height * (0.28 + (c % 2) * 0.12);
        const radGrad = ctx.createRadialGradient(
          cloudX,
          cloudY,
          20,
          cloudX,
          cloudY,
          240
        );
        radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
        radGrad.addColorStop(0.6, 'rgba(240, 250, 255, 0.05)');
        radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, 240, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Crepuscular Volumetric Sunbeams (God Rays) Streaming Across the Meadow
      const rayOriginX = width * 0.18;
      const rayOriginY = -height * 0.15;
      for (let r = 0; r < 5; r++) {
        const baseAngle = 0.35 + r * 0.16 + Math.sin(t * 0.35 + r) * 0.03;
        const raySpread = 0.065;
        const rayLen = Math.max(width, height) * 1.45;
        const rayAlpha = 0.045 + 0.025 * Math.sin(t * 0.7 + r * 1.7);

        const rayGrad = ctx.createLinearGradient(
          rayOriginX,
          rayOriginY,
          rayOriginX + Math.cos(baseAngle) * rayLen,
          rayOriginY + Math.sin(baseAngle) * rayLen
        );
        rayGrad.addColorStop(0, `rgba(255, 253, 230, ${rayAlpha * 1.8})`);
        rayGrad.addColorStop(0.55, `rgba(255, 249, 210, ${rayAlpha})`);
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(rayOriginX, rayOriginY);
        ctx.lineTo(
          rayOriginX + Math.cos(baseAngle - raySpread) * rayLen,
          rayOriginY + Math.sin(baseAngle - raySpread) * rayLen
        );
        ctx.lineTo(
          rayOriginX + Math.cos(baseAngle + raySpread) * rayLen,
          rayOriginY + Math.sin(baseAngle + raySpread) * rayLen
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 4. Foreground & Midground Swaying Sunlit Grass, Foxtails & Tiny Wildflowers
      for (let i = 0; i < blades.length; i++) {
        const b = blades[i];
        const baseX = b.xRatio * width;
        const baseY = height - b.yOffsetRatio * (height * 0.44);

        const windWave = prefersReducedMotion
          ? 2
          : Math.sin(t * b.speed + b.xRatio * 5.8 + b.phase) * 10 +
            Math.cos(t * 0.7 + b.xRatio * 3.2) * 4.5 +
            3.5;

        let cursorPush = 0;
        if (ptr.active && !prefersReducedMotion) {
          const dx = baseX - ptr.x;
          const dy = baseY - b.height * 0.5 - ptr.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = 150;
          if (dist < radius && dist > 1) {
            const force = Math.pow(1 - dist / radius, 1.6);
            cursorPush = (dx / dist) * force * 36;
          }
        }

        const targetAngle = windWave + cursorPush;
        const accel = (targetAngle - b.currentAngle) * b.stiffness;
        b.velocity = (b.velocity + accel) * 0.82;
        b.currentAngle += b.velocity;

        const rad = (b.currentAngle * Math.PI) / 180;
        const tipX = baseX + Math.sin(rad) * b.height;
        const tipY = baseY - Math.cos(rad) * b.height;
        const ctrlX = baseX + Math.sin(rad * 0.5) * (b.height * 0.55);
        const ctrlY = baseY - b.height * 0.52;

        // Main grass blade with sunlit gradient
        const bladeGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
        bladeGrad.addColorStop(0, b.color);
        bladeGrad.addColorStop(1, b.highlightColor);

        ctx.beginPath();
        ctx.moveTo(baseX - b.width * 0.5, baseY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        ctx.quadraticCurveTo(
          ctrlX + b.width * 0.35,
          ctrlY,
          baseX + b.width * 0.5,
          baseY
        );
        ctx.fillStyle = bladeGrad;
        ctx.fill();

        // Sunlit Foxtail Seed Plume
        if (b.isFoxtail) {
          ctx.save();
          ctx.translate(tipX, tipY);
          ctx.rotate(rad);
          ctx.fillStyle = 'rgba(235, 248, 185, 0.78)';
          ctx.beginPath();
          ctx.ellipse(0, -6, 2.8, 9.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Tiny Wildflower Blossoms in Foreground Grass
        if (b.blossomType) {
          ctx.save();
          ctx.translate(tipX, tipY);
          if (b.blossomType === 'blue') {
            ctx.fillStyle = '#80C4FF';
            for (let p = 0; p < 5; p++) {
              const a = (p * Math.PI * 2) / 5;
              ctx.beginPath();
              ctx.arc(
                Math.cos(a) * 3.2,
                Math.sin(a) * 3.2,
                2.2,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
            ctx.fillStyle = '#FFF7A8';
            ctx.beginPath();
            ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (b.blossomType === 'yellow') {
            ctx.fillStyle = '#FFE45E';
            ctx.beginPath();
            ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (b.blossomType === 'pink') {
            ctx.fillStyle = '#FAD0DF';
            ctx.beginPath();
            ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
            ctx.fill();
          } else if (b.blossomType === 'lavender') {
            ctx.fillStyle = '#E2BAFA';
            ctx.beginPath();
            ctx.arc(0, -2, 3.0, 0, Math.PI * 2);
            ctx.arc(-2, 2, 2.5, 0, Math.PI * 2);
            ctx.arc(2, 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // 5. Render Fluttering Meadow Butterflies
      for (let i = 0; i < butterflies.length; i++) {
        const bf = butterflies[i];
        if (!prefersReducedMotion) {
          bf.wingPhase += 0.22;
          bf.x += bf.vx + Math.sin(t * 1.2 + i) * 0.35;
          bf.y += bf.vy + Math.cos(t * 1.7 + i * 2) * 0.45;

          // Gently steer away from cursor
          if (ptr.active) {
            const dx = bf.x - ptr.x;
            const dy = bf.y - ptr.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 130 && d > 1) {
              bf.x += (dx / d) * 2.2;
              bf.y += (dy / d) * 2.2;
            }
          }

          if (bf.x > width + 40) bf.x = -30;
          if (bf.x < -40) bf.x = width + 30;
          if (bf.y < height * 0.35) bf.vy = Math.abs(bf.vy);
          if (bf.y > height * 0.82) bf.vy = -Math.abs(bf.vy);
        }

        const flap = Math.abs(Math.sin(bf.wingPhase));
        ctx.save();
        ctx.translate(bf.x, bf.y);
        ctx.rotate(bf.vx > 0 ? 0.2 : -0.2);
        ctx.scale(bf.scale, bf.scale);

        ctx.shadowColor = 'rgba(255, 250, 210, 0.7)';
        ctx.shadowBlur = 8;

        // Upper & lower wings modulated by flap
        ctx.fillStyle = bf.color;
        ctx.beginPath();
        ctx.ellipse(-4, -3, 7 * flap + 1.5, 5, -0.35, 0, Math.PI * 2);
        ctx.ellipse(4, -3, 7 * flap + 1.5, 5, 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = bf.innerColor;
        ctx.beginPath();
        ctx.ellipse(-3, 2, 4.5 * flap + 1, 3.5, -0.2, 0, Math.PI * 2);
        ctx.ellipse(3, 2, 4.5 * flap + 1, 3.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Render Atmospheric Particles (Lens Bokeh, Dandelion Pappus, Pollen, Petals)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!prefersReducedMotion) {
          p.x += p.vx + Math.sin(t * 0.75 + i) * 0.2;
          p.y += p.vy + Math.cos(t * 0.55 + i) * 0.16;
          p.rotation += p.vRot;

          if (p.x > width + 40) p.x = -40;
          if (p.x < -40) p.x = width + 40;
          if (p.y < -40) p.y = height + 30;
          if (p.y > height + 40) p.y = -30;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const pulse = 0.7 + 0.3 * Math.sin(t * 1.4 + i);
        ctx.globalAlpha = p.alpha * pulse;

        if (p.kind === 'bokeh') {
          const bokehGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, p.size);
          bokehGrad.addColorStop(0, 'rgba(255, 253, 232, 0.85)');
          bokehGrad.addColorStop(0.7, 'rgba(255, 245, 200, 0.35)');
          bokehGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = bokehGrad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'dandelion') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 0.8;
          for (let ray = 0; ray < 7; ray++) {
            const a = -Math.PI * 0.85 + (ray / 6) * Math.PI * 0.7;
            ctx.beginPath();
            ctx.moveTo(0, 3);
            ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
            ctx.stroke();
          }
          ctx.fillStyle = '#FFF6D6';
          ctx.beginPath();
          ctx.arc(0, 3.5, 1.1, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'petal') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.8, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#FFFDF0';
          ctx.shadowColor = '#FFF59E';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 7. Update Spring Physics for Interactive Story Flowers (~30fps sync)
      if (timeMs - lastSpringSync > 32) {
        lastSpringSync = timeMs;
        const nextBends: Record<string, number> = {};
        const meadowHeightPx = height * 0.48;

        stories.forEach((s) => {
          const st = springStateRef.current[s.storyId];
          if (!st) return;

          const flowerX = (s.positionX / 100) * width;
          const flowerY = height - (s.positionY / 100) * meadowHeightPx - 65;

          const wind = prefersReducedMotion
            ? 0
            : Math.sin(t * st.speed + (s.positionX / 100) * 5.2 + st.phase) * 7.5 +
              Math.cos(t * 0.7 + st.phase) * 3.2 +
              2.2;

          let push = 0;
          if (ptr.active && !prefersReducedMotion) {
            const dx = flowerX - ptr.x;
            const dy = flowerY - ptr.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const influenceRadius = 170;
            if (dist < influenceRadius && dist > 1) {
              const factor = Math.pow(1 - dist / influenceRadius, 1.5);
              push = (dx / dist) * factor * 25;
            }
          }

          const target = wind + push;
          const accel = (target - st.angle) * 0.14;
          st.velocity = (st.velocity + accel) * 0.78;
          st.angle += st.velocity;
          nextBends[s.storyId] = Number(st.angle.toFixed(2));
        });

        setFlowerBends(nextBends);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [stories]);

  const handlePointerMove = (clientX: number, clientY: number) => {
    pointerRef.current = { x: clientX, y: clientY, active: true };
    const nx = (clientX / window.innerWidth - 0.5) * 2;
    const ny = (clientY / window.innerHeight - 0.5) * 2;
    setCursorParallax({ x: nx * 12, y: ny * 7 });
  };

  const handlePointerLeave = () => {
    pointerRef.current.active = false;
    setCursorParallax({ x: 0, y: 0 });
  };

  // Clicking anywhere in the flower meadow also discovers a story if a visitor taps between stems
  const handleMeadowBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.clientY > window.innerHeight * 0.52 && stories.length > 0) {
      soundscape.playBloomChord();
      const randomStory = stories[Math.floor(Math.random() * stories.length)];
      onSelectStory(randomStory);
    }
  };

  const sortedStories = useMemo(() => {
    return [...stories].sort((a, b) => b.positionY - a.positionY);
  }, [stories]);

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onMouseLeave={handlePointerLeave}
      onClick={handleMeadowBackgroundClick}
      onTouchMove={(e) => {
        if (e.touches[0]) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handlePointerLeave}
      className="relative w-full h-screen overflow-hidden select-none bg-[#55ACE3]"
    >
      {/* Photorealistic Multi-Plane & High-VFX Canvas Engine */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ zIndex: 10 }}
      />

      {/* Interactive Story Flowers Anchored in the 3D Meadow */}
      <div
        className="absolute inset-x-0 bottom-0 h-[49%] pointer-events-none"
        style={{
          zIndex: 30,
          transform: `translate3d(${cursorParallax.x * 0.9}px, ${cursorParallax.y * 0.35}px, 0)`,
        }}
      >
        {sortedStories.map((story) => {
          const isHovered = hoveredStoryId === story.storyId;
          const isHighlighted = highlightedStoryId === story.storyId;
          const bend = flowerBends[story.storyId] || 0;
          const depthZ =
            Math.round(120 - story.positionY) + (isHovered ? 100 : 0);

          return (
            <div
              key={story.storyId}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto absolute origin-bottom -translate-x-1/2"
              style={{
                left: `${story.positionX}%`,
                bottom: `${story.positionY * 0.78}%`,
                zIndex: depthZ,
              }}
            >
              {/* Newly Planted Bioluminescent Aura */}
              {(isHighlighted || story.isNewlyPlanted) && (
                <div className="pointer-events-none absolute -inset-5 rounded-full bg-amber-200/55 blur-xl animate-pulse-aura" />
              )}

              {/* Hover Story Whisper Pill */}
              <div
                className={`pointer-events-none absolute left-1/2 -top-11 -translate-x-1/2 whitespace-nowrap transition-all duration-200 ${
                  isHovered || isHighlighted
                    ? 'opacity-100 -translate-y-1 scale-100'
                    : 'opacity-0 translate-y-2 scale-95'
                }`}
              >
                <div className="px-3 py-1 rounded-full bg-white/92 backdrop-blur-md shadow-md border border-white/85 text-center">
                  <p className="text-[11px] font-semibold text-slate-800 leading-tight">
                    {isHighlighted
                      ? 'Your newly planted flower'
                      : 'Read this story'}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {story.anonymousId} · {story.warmthCount} warmth
                  </p>
                </div>
              </div>

              <button
                type="button"
                onMouseEnter={() => {
                  setHoveredStoryId(story.storyId);
                  soundscape.playHoverChime();
                }}
                onMouseLeave={() => setHoveredStoryId(null)}
                onFocus={() => setHoveredStoryId(story.storyId)}
                onBlur={() => setHoveredStoryId(null)}
                onClick={() => {
                  soundscape.playBloomChord();
                  onSelectStory(story);
                }}
                aria-label={`Read story by ${story.anonymousId}`}
                className="group relative block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90 rounded-full"
                style={{
                  transform: `scale(${story.scale})`,
                  transformOrigin: 'bottom center',
                }}
              >
                <div className="w-[82px] sm:w-[92px] h-[160px] sm:h-[176px]">
                  <MeadowFlowerSvg
                    variant={story.flowerVariant}
                    isHovered={isHovered || isHighlighted}
                    bendAngle={bend}
                    stemHeight={132}
                    uniqueId={story.storyId}
                  />
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Soft Optical Depth-of-Field Foreground Blur & Sunlit Vignette */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
        style={{
          zIndex: 40,
          background:
            'linear-gradient(180deg, rgba(46, 84, 29, 0) 0%, rgba(28, 56, 16, 0.38) 100%)',
        }}
      />
    </div>
  );
};
