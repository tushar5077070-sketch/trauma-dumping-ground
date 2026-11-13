import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Heart } from 'lucide-react';
import { SEED_OPTIONS, Story } from '../types/garden';
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

interface FlowerSpringState {
  angle: number;
  velocity: number;
  scale: number;
  scaleVelocity: number;
  phase: number;
  speed: number;
  naturalScale: number;
}

export const LivingGardenCanvas: React.FC<LivingGardenCanvasProps> = ({
  stories,
  onSelectStory,
  highlightedStoryId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const flowersLayerRef = useRef<HTMLDivElement>(null);
  const popupLayerRef = useRef<HTMLDivElement>(null);
  const popupCardRef = useRef<HTMLDivElement>(null);

  const flowerVisualRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState<{
    width: number;
    height: number;
  }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  const hoveredStoryIdRef = useRef<string | null>(null);
  const highlightedStoryIdRef = useRef<string | null>(
    highlightedStoryId || null
  );

  useEffect(() => {
    hoveredStoryIdRef.current = hoveredStoryId;
  }, [hoveredStoryId]);

  useEffect(() => {
    highlightedStoryIdRef.current = highlightedStoryId || null;
  }, [highlightedStoryId]);

  const pointerRef = useRef<{
    x: number;
    y: number;
    smoothX: number;
    smoothY: number;
    parallaxX: number;
    parallaxY: number;
    active: boolean;
  }>({
    x: -9999,
    y: -9999,
    smoothX: -9999,
    smoothY: -9999,
    parallaxX: 0,
    parallaxY: 0,
    active: false,
  });

  const springStateRef = useRef<Record<string, FlowerSpringState>>({});

  // Responsive scale factor adapting smoothly across mobile, tablet (portrait/landscape), and laptop
  const deviceScaleMultiplier = useMemo(() => {
    const w = viewportSize.width;
    const h = viewportSize.height;
    const wFactor =
      w < 420
        ? 0.56
        : w < 640
        ? 0.6
        : w <= 860
        ? 0.64
        : w <= 1080
        ? 0.69
        : 0.78;
    const hFactor =
      h < 500
        ? 0.52
        : h < 660
        ? 0.64
        : h <= 840
        ? 0.72
        : 0.78;
    return Math.min(wFactor, hFactor);
  }, [viewportSize.width, viewportSize.height]);

  useEffect(() => {
    const current = springStateRef.current;
    stories.forEach((story, idx) => {
      const natScale = Number(
        (story.scale * deviceScaleMultiplier).toFixed(3)
      );
      if (!current[story.storyId]) {
        current[story.storyId] = {
          angle: 0,
          velocity: 0,
          scale: natScale,
          scaleVelocity: 0,
          phase: idx * 1.17,
          speed: 1.05 + (idx % 5) * 0.14,
          naturalScale: natScale,
        };
      } else {
        current[story.storyId].naturalScale = natScale;
      }
    });
  }, [stories, deviceScaleMultiplier]);

  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!bgCanvas || !fgCanvas) return;

    const bgCtx = bgCanvas.getContext('2d', { alpha: false });
    const fgCtx = fgCanvas.getContext('2d', { alpha: true });
    if (!bgCtx || !fgCtx) return;

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
      setViewportSize({ width, height });

      bgCanvas.width = Math.floor(width * dpr);
      bgCanvas.height = Math.floor(height * dpr);
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      fgCanvas.width = Math.floor(width * dpr);
      fgCanvas.height = Math.floor(height * dpr);
      fgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Native 1280 x 653 proportional landscape buffer (zero aspect ratio distortion)
    const offscreenLandscape = document.createElement('canvas');
    offscreenLandscape.width = 1280;
    offscreenLandscape.height = 653;
    let isPhotoLoaded = false;

    const refImage = new Image();
    refImage.crossOrigin = 'anonymous';
    refImage.src =
      '/assets/aistudio/WhatsApp_Image_2026-11-04_at_23.23.46_8e9dddc2.jpeg';
    refImage.onload = () => {
      const oCtx = offscreenLandscape.getContext('2d');
      if (!oCtx) return;
      const w = offscreenLandscape.width; // 1280
      const h = offscreenLandscape.height; // 653

      oCtx.save();
      oCtx.translate(w / 2, h / 2);
      oCtx.rotate(-Math.PI / 2);
      // Native image is 653 x 1280. Scale uniformly by 1.09x to crop out the top edge watermark without stretching!
      const uniformScale = 1.09;
      const drawW = h * uniformScale;
      const drawH = w * uniformScale;
      oCtx.drawImage(refImage, -drawW / 2 - 28, -drawH / 2, drawW, drawH);
      oCtx.restore();

      // Seamless sky zenith blend to ensure zero watermark text
      const skyCleanGrad = oCtx.createLinearGradient(0, 0, 0, h * 0.16);
      skyCleanGrad.addColorStop(0, '#49A0DC');
      skyCleanGrad.addColorStop(0.55, '#52A7E0');
      skyCleanGrad.addColorStop(1, 'rgba(82, 167, 224, 0)');
      oCtx.fillStyle = skyCleanGrad;
      oCtx.fillRect(0, 0, w, h * 0.16);

      isPhotoLoaded = true;
    };

    const grassPalette = [
      { base: '#346320', lit: '#689E48' },
      { base: '#44782C', lit: '#82B85D' },
      { base: '#558C3B', lit: '#9BCE73' },
      { base: '#6BA34C', lit: '#B8E38E' },
    ];
    const blades: GrassBlade[] = [];
    const bladeCount = Math.min(320, Math.max(150, Math.floor(width / 4.2)));

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
          ? 40 + Math.random() * 36
          : layer === 1
          ? 60 + Math.random() * 50
          : 82 + Math.random() * 68;

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
        width: layer === 0 ? 1.8 : layer === 1 ? 2.5 : 3.4,
        color: pal.base,
        highlightColor: pal.lit,
        phase: Math.random() * Math.PI * 2,
        speed: 1.0 + Math.random() * 0.85,
        stiffness: 0.075 + Math.random() * 0.035,
        currentAngle: 0,
        velocity: 0,
        layer,
        isFoxtail: !blossomType && Math.random() < 0.14,
        blossomType,
      });
    }

    const particles: AtmosphericParticle[] = Array.from({ length: 56 }).map(
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
              ? 14 + Math.random() * 26
              : kind === 'dandelion'
              ? 5 + Math.random() * 3
              : 1.8 + Math.random() * 2.6,
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

    const butterflies: Butterfly[] = [
      {
        x: width * 0.25,
        y: height * 0.62,
        vx: 0.75,
        vy: -0.15,
        wingPhase: 0,
        color: '#FFF7D6',
        innerColor: '#F9C846',
        scale: 0.9,
      },
      {
        x: width * 0.68,
        y: height * 0.58,
        vx: -0.65,
        vy: 0.12,
        wingPhase: 2.1,
        color: '#FFE3EE',
        innerColor: '#F497B6',
        scale: 0.82,
      },
      {
        x: width * 0.48,
        y: height * 0.68,
        vx: 0.55,
        vy: -0.1,
        wingPhase: 4.2,
        color: '#EFE3FF',
        innerColor: '#C59BE8',
        scale: 0.75,
      },
    ];

    let animationFrameId: number;

    const drawGrassBlade = (
      targetCtx: CanvasRenderingContext2D,
      b: GrassBlade,
      t: number,
      ptr: typeof pointerRef.current
    ) => {
      const baseX = b.xRatio * width;
      const baseY = height - b.yOffsetRatio * (height * 0.42);

      const windWave = prefersReducedMotion
        ? 2
        : Math.sin(t * b.speed + b.xRatio * 5.8 + b.phase) * 9 +
          Math.cos(t * 0.7 + b.xRatio * 3.2) * 4 +
          3;

      let cursorPush = 0;
      if (ptr.active && !prefersReducedMotion) {
        const dx = baseX - ptr.smoothX;
        const dy = baseY - b.height * 0.5 - ptr.smoothY;
        const radius = 155;
        const distSq = dx * dx + dy * dy;
        const rSq = radius * radius;
        if (distSq < rSq) {
          const falloff = Math.pow(1 - distSq / rSq, 2);
          cursorPush = (dx / radius) * falloff * 52;
        }
      }

      const targetAngle = windWave + cursorPush;
      const accel = (targetAngle - b.currentAngle) * b.stiffness;
      b.velocity = (b.velocity + accel) * 0.8;
      b.currentAngle += b.velocity;

      const rad = (b.currentAngle * Math.PI) / 180;
      const tipX = baseX + Math.sin(rad) * b.height;
      const tipY = baseY - Math.cos(rad) * b.height;
      const ctrlX = baseX + Math.sin(rad * 0.5) * (b.height * 0.55);
      const ctrlY = baseY - b.height * 0.52;

      const bladeGrad = targetCtx.createLinearGradient(
        baseX,
        baseY,
        tipX,
        tipY
      );
      bladeGrad.addColorStop(0, b.color);
      bladeGrad.addColorStop(1, b.highlightColor);

      targetCtx.beginPath();
      targetCtx.moveTo(baseX - b.width * 0.5, baseY);
      targetCtx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      targetCtx.quadraticCurveTo(
        ctrlX + b.width * 0.35,
        ctrlY,
        baseX + b.width * 0.5,
        baseY
      );
      targetCtx.fillStyle = bladeGrad;
      targetCtx.fill();

      if (b.isFoxtail) {
        targetCtx.save();
        targetCtx.translate(tipX, tipY);
        targetCtx.rotate(rad);
        targetCtx.fillStyle = 'rgba(235, 248, 185, 0.78)';
        targetCtx.beginPath();
        targetCtx.ellipse(0, -6, 2.8, 9.5, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
      }

      if (b.blossomType) {
        targetCtx.save();
        targetCtx.translate(tipX, tipY);
        if (b.blossomType === 'blue') {
          targetCtx.fillStyle = '#80C4FF';
          for (let p = 0; p < 5; p++) {
            const a = (p * Math.PI * 2) / 5;
            targetCtx.beginPath();
            targetCtx.arc(
              Math.cos(a) * 3.2,
              Math.sin(a) * 3.2,
              2.2,
              0,
              Math.PI * 2
            );
            targetCtx.fill();
          }
          targetCtx.fillStyle = '#FFF7A8';
          targetCtx.beginPath();
          targetCtx.arc(0, 0, 1.5, 0, Math.PI * 2);
          targetCtx.fill();
        } else if (b.blossomType === 'yellow') {
          targetCtx.fillStyle = '#FFE45E';
          targetCtx.beginPath();
          targetCtx.arc(0, 0, 3.5, 0, Math.PI * 2);
          targetCtx.fill();
        } else if (b.blossomType === 'pink') {
          targetCtx.fillStyle = '#FAD0DF';
          targetCtx.beginPath();
          targetCtx.arc(0, 0, 3.8, 0, Math.PI * 2);
          targetCtx.fill();
        } else if (b.blossomType === 'lavender') {
          targetCtx.fillStyle = '#E2BAFA';
          targetCtx.beginPath();
          targetCtx.arc(0, -2, 3.0, 0, Math.PI * 2);
          targetCtx.arc(-2, 2, 2.5, 0, Math.PI * 2);
          targetCtx.arc(2, 2, 2.5, 0, Math.PI * 2);
          targetCtx.fill();
        }
        targetCtx.restore();
      }
    };

    const render = (timeMs: number) => {
      const t = timeMs * 0.001;
      const ptr = pointerRef.current;

      if (ptr.active) {
        if (ptr.smoothX < -1000) {
          ptr.smoothX = ptr.x;
          ptr.smoothY = ptr.y;
        } else {
          ptr.smoothX += (ptr.x - ptr.smoothX) * 0.18;
          ptr.smoothY += (ptr.y - ptr.smoothY) * 0.18;
        }
        const targetPx = (ptr.smoothX / width - 0.5) * 16;
        const targetPy = (ptr.smoothY / height - 0.5) * 8;
        ptr.parallaxX += (targetPx - ptr.parallaxX) * 0.08;
        ptr.parallaxY += (targetPy - ptr.parallaxY) * 0.08;
      } else {
        ptr.parallaxX += (0 - ptr.parallaxX) * 0.06;
        ptr.parallaxY += (0 - ptr.parallaxY) * 0.06;
      }

      const layerTransform = `translate3d(${(ptr.parallaxX * 0.65).toFixed(
        2
      )}px, ${(ptr.parallaxY * 0.25).toFixed(2)}px, 0)`;
      if (flowersLayerRef.current) {
        flowersLayerRef.current.style.transform = layerTransform;
      }
      if (popupLayerRef.current) {
        popupLayerRef.current.style.transform = layerTransform;
      }

      fgCtx.clearRect(0, 0, width, height);

      if (isPhotoLoaded) {
        const srcW = offscreenLandscape.width; // 1280
        const srcH = offscreenLandscape.height; // 653
        const padX = 28;
        const padY = 20;

        // TRUE ASPECT-RATIO SCALING FOR MOBILE, TABLET (4:3 / 3:4), AND LAPTOP (16:9):
        // On portrait/tablet screens, allow the upper zenith sky gradient to fill the top sky so the meadow photo isn't over-zoomed
        const aspect = width / Math.max(1, height);
        const verticalCoverageRatio =
          aspect < 0.85 ? 0.76 : aspect < 1.35 ? 0.84 : 1.0;
        const targetW = width + padX * 2;
        const targetH = height * verticalCoverageRatio + padY * 2;
        const coverScale = Math.max(targetW / srcW, targetH / srcH);
        const destW = srcW * coverScale;
        const destH = srcH * coverScale;

        const baseParallaxX = -ptr.parallaxX * 0.7 + Math.sin(t * 0.18) * 3.5;
        const baseParallaxY = -ptr.parallaxY * 0.6;

        // Center horizontally & anchor meadow bottom so the horizon aligns consistently across mobile, tablet, and desktop
        const destX = (width - destW) * 0.5 + baseParallaxX;
        const rawDestY = height * 0.55 - destH * 0.54 + baseParallaxY;
        const minBottomAlignedY = height + padY - destH + baseParallaxY;
        const destY = Math.max(rawDestY, minBottomAlignedY);

        // Seamlessly fill upper zenith sky if portrait/tablet screen extends above destY
        if (destY > 0) {
          const zenithGrad = bgCtx.createLinearGradient(0, 0, 0, destY + 4);
          zenithGrad.addColorStop(0, '#4197D7');
          zenithGrad.addColorStop(1, '#49A0DC');
          bgCtx.fillStyle = zenithGrad;
          bgCtx.fillRect(0, 0, width, destY + 4);
        }

        // 1A. Continuous full-image cover pass (zero seam line & zero compression!)
        bgCtx.drawImage(
          offscreenLandscape,
          0,
          0,
          srcW,
          srcH,
          destX,
          destY,
          destW,
          destH
        );

        // 1B. Smoothstep wind-swaying lower meadow strips preserving exact cover aspect ratio
        if (!prefersReducedMotion) {
          const strips = 28;
          const startRatio = 0.52;
          const endRatio = 1.0;

          for (let s = 0; s < strips; s++) {
            const frac0 = s / strips;
            const frac1 = (s + 1) / strips;
            const rY0 = startRatio + frac0 * (endRatio - startRatio);
            const rY1 = startRatio + frac1 * (endRatio - startRatio);

            const sy = rY0 * srcH;
            const sh = (rY1 - rY0) * srcH + 1.5;

            const dy = destY + rY0 * destH;
            const dh = (rY1 - rY0) * destH + 1.5;

            const smoothWeight = frac0 * frac0 * (3 - 2 * frac0);

            const windShift =
              (Math.sin(t * 1.5 - frac0 * 4.2) * 5.0 +
                Math.cos(t * 0.8 + frac0 * 2.8) * 2.2) *
              smoothWeight;

            bgCtx.drawImage(
              offscreenLandscape,
              0,
              sy,
              srcW,
              sh,
              destX + windShift,
              dy,
              destW,
              dh
            );
          }
        }
      } else {
        const skyGrad = bgCtx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#449CE0');
        skyGrad.addColorStop(0.48, '#87CDF6');
        skyGrad.addColorStop(0.55, '#F4FAFF');
        skyGrad.addColorStop(0.65, '#86BE64');
        skyGrad.addColorStop(1, '#3D7028');
        bgCtx.fillStyle = skyGrad;
        bgCtx.fillRect(0, 0, width, height);
      }

      // 2. Volumetric Drifting Cloud Veil
      bgCtx.save();
      bgCtx.globalCompositeOperation = 'screen';
      for (let c = 0; c < 4; c++) {
        const cloudX =
          ((width * (0.2 * c) + t * (9 + c * 3)) % (width + 500)) - 250;
        const cloudY = height * (0.28 + (c % 2) * 0.12);
        const radGrad = bgCtx.createRadialGradient(
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
        bgCtx.fillStyle = radGrad;
        bgCtx.beginPath();
        bgCtx.arc(cloudX, cloudY, 240, 0, Math.PI * 2);
        bgCtx.fill();
      }
      bgCtx.restore();

      // 3. Background & Midground Grass Blades
      for (let i = 0; i < blades.length; i++) {
        if (blades[i].layer !== 2) {
          drawGrassBlade(bgCtx, blades[i], t, ptr);
        }
      }

      // 4. Foreground Grass Blades
      for (let i = 0; i < blades.length; i++) {
        if (blades[i].layer === 2) {
          drawGrassBlade(fgCtx, blades[i], t, ptr);
        }
      }

      // 5. Crepuscular Volumetric Sunbeams
      fgCtx.save();
      fgCtx.globalCompositeOperation = 'screen';
      const rayOriginX = width * 0.18;
      const rayOriginY = -height * 0.15;
      for (let r = 0; r < 5; r++) {
        const baseAngle = 0.35 + r * 0.16 + Math.sin(t * 0.35 + r) * 0.03;
        const raySpread = 0.065;
        const rayLen = Math.max(width, height) * 1.45;
        const rayAlpha = 0.038 + 0.02 * Math.sin(t * 0.7 + r * 1.7);

        const rayGrad = fgCtx.createLinearGradient(
          rayOriginX,
          rayOriginY,
          rayOriginX + Math.cos(baseAngle) * rayLen,
          rayOriginY + Math.sin(baseAngle) * rayLen
        );
        rayGrad.addColorStop(0, `rgba(255, 253, 230, ${rayAlpha * 1.8})`);
        rayGrad.addColorStop(0.55, `rgba(255, 249, 210, ${rayAlpha})`);
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        fgCtx.fillStyle = rayGrad;
        fgCtx.beginPath();
        fgCtx.moveTo(rayOriginX, rayOriginY);
        fgCtx.lineTo(
          rayOriginX + Math.cos(baseAngle - raySpread) * rayLen,
          rayOriginY + Math.sin(baseAngle - raySpread) * rayLen
        );
        fgCtx.lineTo(
          rayOriginX + Math.cos(baseAngle + raySpread) * rayLen,
          rayOriginY + Math.sin(baseAngle + raySpread) * rayLen
        );
        fgCtx.closePath();
        fgCtx.fill();
      }
      fgCtx.restore();

      // 6. Fluttering Meadow Butterflies
      for (let i = 0; i < butterflies.length; i++) {
        const bf = butterflies[i];
        if (!prefersReducedMotion) {
          bf.wingPhase += 0.22;
          bf.x += bf.vx + Math.sin(t * 1.2 + i) * 0.35;
          bf.y += bf.vy + Math.cos(t * 1.7 + i * 2) * 0.45;

          if (ptr.active) {
            const dx = bf.x - ptr.smoothX;
            const dy = bf.y - ptr.smoothY;
            const dSq = dx * dx + dy * dy;
            if (dSq < 130 * 130) {
              const falloff = 1 - dSq / (130 * 130);
              bf.x += (dx / 130) * falloff * 2.5;
              bf.y += (dy / 130) * falloff * 2.5;
            }
          }

          if (bf.x > width + 40) bf.x = -30;
          if (bf.x < -40) bf.x = width + 30;
          if (bf.y < height * 0.35) bf.vy = Math.abs(bf.vy);
          if (bf.y > height * 0.82) bf.vy = -Math.abs(bf.vy);
        }

        const flap = Math.abs(Math.sin(bf.wingPhase));
        fgCtx.save();
        fgCtx.translate(bf.x, bf.y);
        fgCtx.rotate(bf.vx > 0 ? 0.2 : -0.2);
        fgCtx.scale(bf.scale, bf.scale);

        fgCtx.shadowColor = 'rgba(255, 250, 210, 0.7)';
        fgCtx.shadowBlur = 8;

        fgCtx.fillStyle = bf.color;
        fgCtx.beginPath();
        fgCtx.ellipse(-4, -3, 7 * flap + 1.5, 5, -0.35, 0, Math.PI * 2);
        fgCtx.ellipse(4, -3, 7 * flap + 1.5, 5, 0.35, 0, Math.PI * 2);
        fgCtx.fill();

        fgCtx.fillStyle = bf.innerColor;
        fgCtx.beginPath();
        fgCtx.ellipse(-3, 2, 4.5 * flap + 1, 3.5, -0.2, 0, Math.PI * 2);
        fgCtx.ellipse(3, 2, 4.5 * flap + 1, 3.5, 0.2, 0, Math.PI * 2);
        fgCtx.fill();
        fgCtx.restore();
      }

      // 7. Atmospheric Particles
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

        fgCtx.save();
        fgCtx.translate(p.x, p.y);
        fgCtx.rotate(p.rotation);
        const pulse = 0.7 + 0.3 * Math.sin(t * 1.4 + i);
        fgCtx.globalAlpha = p.alpha * pulse;

        if (p.kind === 'bokeh') {
          const bokehGrad = fgCtx.createRadialGradient(0, 0, 1, 0, 0, p.size);
          bokehGrad.addColorStop(0, 'rgba(255, 253, 232, 0.85)');
          bokehGrad.addColorStop(0.7, 'rgba(255, 245, 200, 0.35)');
          bokehGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          fgCtx.fillStyle = bokehGrad;
          fgCtx.beginPath();
          fgCtx.arc(0, 0, p.size, 0, Math.PI * 2);
          fgCtx.fill();
        } else if (p.kind === 'dandelion') {
          fgCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          fgCtx.lineWidth = 0.8;
          for (let ray = 0; ray < 7; ray++) {
            const a = -Math.PI * 0.85 + (ray / 6) * Math.PI * 0.7;
            fgCtx.beginPath();
            fgCtx.moveTo(0, 3);
            fgCtx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
            fgCtx.stroke();
          }
          fgCtx.fillStyle = '#FFF6D6';
          fgCtx.beginPath();
          fgCtx.arc(0, 3.5, 1.1, 0, Math.PI * 2);
          fgCtx.fill();
        } else if (p.kind === 'petal') {
          fgCtx.fillStyle = p.color;
          fgCtx.beginPath();
          fgCtx.ellipse(0, 0, p.size * 1.8, p.size, 0, 0, Math.PI * 2);
          fgCtx.fill();
        } else {
          fgCtx.fillStyle = '#FFFDF0';
          fgCtx.shadowColor = '#FFF59E';
          fgCtx.shadowBlur = 8;
          fgCtx.beginPath();
          fgCtx.arc(0, 0, p.size * 0.75, 0, Math.PI * 2);
          fgCtx.fill();
        }
        fgCtx.restore();
      }

      // 8. 60fps Direct GPU Transform Solver for Story Flowers
      const meadowHeightPx = height * 0.45;
      const activeHoverId = hoveredStoryIdRef.current;
      const activeHighlightId = highlightedStoryIdRef.current;

      for (let i = 0; i < stories.length; i++) {
        const s = stories[i];
        const st = springStateRef.current[s.storyId];
        if (!st) continue;

        const isHovered = activeHoverId === s.storyId;
        const isHighlighted = activeHighlightId === s.storyId;

        const safePosX =
          width < 640
            ? 10 + (s.positionX / 100) * 80
            : width <= 1024
            ? 7 + (s.positionX / 100) * 86
            : s.positionX;
        const flowerX = (safePosX / 100) * width;
        const flowerY =
          height - (s.positionY * 0.72 * meadowHeightPx) / 100 - 50;

        const wind = prefersReducedMotion
          ? 0
          : Math.sin(t * st.speed + (s.positionX / 100) * 5.2 + st.phase) *
              5.2 +
            Math.cos(t * 0.7 + st.phase) * 2.4 +
            1.5;

        let push = 0;
        if (ptr.active && !prefersReducedMotion) {
          const dx = flowerX - ptr.smoothX;
          const dy = flowerY - ptr.smoothY;
          const influenceRadius = 175;
          const distSq = dx * dx + dy * dy;
          const rSq = influenceRadius * influenceRadius;
          if (distSq < rSq) {
            const falloff = Math.pow(1 - distSq / rSq, 2);
            const hoverDamping = isHovered ? 0.22 : 1.0;
            push = (dx / influenceRadius) * falloff * 38 * hoverDamping;
          }
        }

        const targetAngle = wind + push;
        const angleAccel = (targetAngle - st.angle) * 0.11;
        st.velocity = (st.velocity + angleAccel) * 0.82;
        st.angle += st.velocity;

        const targetScale =
          st.naturalScale * (isHovered ? 1.14 : isHighlighted ? 1.08 : 1.0);
        const scaleAccel = (targetScale - st.scale) * 0.14;
        st.scaleVelocity = (st.scaleVelocity + scaleAccel) * 0.76;
        st.scale += st.scaleVelocity;

        const visualEl = flowerVisualRefs.current[s.storyId];
        if (visualEl) {
          visualEl.style.transform = `scale(${st.scale.toFixed(
            3
          )}) rotate(${st.angle.toFixed(2)}deg)`;
        }

        if (
          popupCardRef.current &&
          (s.storyId === activeHoverId ||
            (!activeHoverId && s.storyId === activeHighlightId))
        ) {
          const bendOffsetPx = st.angle * 1.1;
          const minX = width < 640 ? 24 : width <= 1024 ? 16 : 12;
          const maxX = width < 640 ? 76 : width <= 1024 ? 84 : 88;
          const clampedX = Math.max(minX, Math.min(maxX, safePosX));
          const flowerTopOffsetPx = Math.round(135 * st.scale);
          popupCardRef.current.style.left = `calc(${clampedX}% + ${bendOffsetPx.toFixed(
            1
          )}px)`;
          popupCardRef.current.style.bottom = `calc(${
            s.positionY * 0.72
          }% + ${flowerTopOffsetPx}px)`;
        }
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
    pointerRef.current.x = clientX;
    pointerRef.current.y = clientY;
    pointerRef.current.active = true;
  };

  const handlePointerLeave = () => {
    pointerRef.current.active = false;
  };

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

  const activePopupStory = useMemo(() => {
    const targetId = hoveredStoryId || highlightedStoryId;
    if (!targetId) return null;
    return stories.find((s) => s.storyId === targetId) || null;
  }, [hoveredStoryId, highlightedStoryId, stories]);

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
      className="relative w-full h-[100dvh] overflow-hidden select-none bg-[#49A0DC]"
    >
      {/* LAYER 1: Aspect-Ratio Preserved Background Meadow & Midground Grass */}
      <canvas
        ref={bgCanvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ zIndex: 10 }}
      />

      {/* LAYER 2: Interactive Story Flowers Anchored in the Meadow */}
      <div
        ref={flowersLayerRef}
        className="absolute inset-x-0 bottom-0 h-[45%] pointer-events-none will-change-transform"
        style={{ zIndex: 25 }}
      >
        {sortedStories.map((story) => {
          const isHovered = hoveredStoryId === story.storyId;
          const isHighlighted = highlightedStoryId === story.storyId;
          const depthZ = isHovered
            ? 450
            : isHighlighted
            ? 400
            : Math.round(120 - story.positionY);

          const isFarHorizon = story.positionY > 56;
          const initialScale = Number(
            (story.scale * deviceScaleMultiplier).toFixed(3)
          );
          const safePosX =
            viewportSize.width < 640
              ? 10 + (story.positionX / 100) * 80
              : viewportSize.width <= 1024
              ? 7 + (story.positionX / 100) * 86
              : story.positionX;

          return (
            <div
              key={story.storyId}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto absolute origin-bottom -translate-x-1/2"
              style={{
                left: `${safePosX}%`,
                bottom: `${story.positionY * 0.72}%`,
                zIndex: depthZ,
                filter: isFarHorizon
                  ? 'brightness(1.03) saturate(0.92)'
                  : 'brightness(1.01) saturate(0.96)',
              }}
            >
              {(isHighlighted || story.isNewlyPlanted) && (
                <div className="pointer-events-none absolute -inset-4 rounded-full bg-amber-200/55 blur-xl animate-pulse-aura" />
              )}

              <button
                type="button"
                onMouseEnter={() => {
                  setHoveredStoryId(story.storyId);
                  soundscape.playHoverChime();
                }}
                onMouseLeave={() =>
                  setHoveredStoryId((prev) =>
                    prev === story.storyId ? null : prev
                  )
                }
                onFocus={() => setHoveredStoryId(story.storyId)}
                onBlur={() =>
                  setHoveredStoryId((prev) =>
                    prev === story.storyId ? null : prev
                  )
                }
                onClick={() => {
                  soundscape.playBloomChord();
                  onSelectStory(story);
                }}
                aria-label={`Read story by ${story.anonymousId}`}
                className="group relative flex items-end justify-center w-[64px] h-[132px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90 rounded-full"
              >
                <div
                  ref={(el) => {
                    flowerVisualRefs.current[story.storyId] = el;
                  }}
                  className="w-[78px] h-[150px] pointer-events-none will-change-transform"
                  style={{
                    transform: `scale(${initialScale}) rotate(0deg)`,
                    transformOrigin: '50% 92%',
                  }}
                >
                  <MeadowFlowerSvg
                    variant={story.flowerVariant}
                    isHovered={isHovered || isHighlighted}
                    bendAngle={0}
                    stemHeight={122}
                    uniqueId={story.storyId}
                  />
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* LAYER 3: Foreground Grass Blades, Sunbeams, Bokeh & Butterflies */}
      <canvas
        ref={fgCanvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ zIndex: 35 }}
      />

      {/* LAYER 4: Top-Level Unobstructed Floating "Read this story" Whisper Card */}
      {activePopupStory && (
        <div
          ref={popupLayerRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] will-change-transform"
          style={{ zIndex: 90 }}
        >
          {(() => {
            const seedInfo =
              SEED_OPTIONS.find((s) => s.id === activePopupStory.seedType) ||
              SEED_OPTIONS[0];
            const naturalScale =
              activePopupStory.scale * deviceScaleMultiplier;
            const flowerTopOffsetPx = Math.round(135 * naturalScale);
            const clampedX = Math.max(
              22,
              Math.min(78, activePopupStory.positionX)
            );
            const isHighlighted =
              highlightedStoryId === activePopupStory.storyId &&
              hoveredStoryId !== activePopupStory.storyId;

            return (
              <div
                ref={popupCardRef}
                style={{
                  left: `${clampedX}%`,
                  bottom: `calc(${activePopupStory.positionY * 0.72}% + ${flowerTopOffsetPx}px)`,
                }}
                className="absolute -translate-x-1/2 will-change-[left,bottom]"
              >
                <div className="relative px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-xl shadow-[0_10px_28px_rgba(15,23,42,0.18)] border border-white min-w-[164px] max-w-[215px] text-center">
                  <div className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-900">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>
                      {isHighlighted
                        ? 'Your newly planted flower'
                        : 'Read this story'}
                    </span>
                  </div>

                  <p className="text-[11px] font-medium text-slate-600 mt-0.5 truncate">
                    {activePopupStory.anonymousId}
                  </p>

                  <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                    <span>{seedInfo.name}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-0.5 text-rose-600 font-medium">
                      <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                      {activePopupStory.warmthCount}
                    </span>
                  </div>

                  <div className="w-2.5 h-2.5 bg-white/95 border-r border-b border-white rotate-45 mx-auto -mb-2.5 mt-1 shadow-2xs" />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Soft Optical Depth-of-Field Foreground Blur & Sunlit Vignette */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 sm:h-16"
        style={{
          zIndex: 40,
          background:
            'linear-gradient(180deg, rgba(46, 84, 29, 0) 0%, rgba(28, 56, 16, 0.38) 100%)',
        }}
      />
    </div>
  );
};
