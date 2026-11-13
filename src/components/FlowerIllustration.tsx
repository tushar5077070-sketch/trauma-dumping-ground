import React from 'react';
import { FlowerVariant, SeedType } from '../types/garden';

interface FlowerSvgProps {
  variant: FlowerVariant;
  className?: string;
  isHovered?: boolean;
  stemHeight?: number;
  bendAngle?: number;
  uniqueId?: string;
}

/**
 * High-craft botanical illustration rendered from a natural 3/4 low-meadow camera angle.
 * Uses pure SVG geometry without conflicting CSS transitions on dynamic SVG transform groups
 * so cursor and wind animations run at a glitch-free 60fps.
 */
export const MeadowFlowerSvg: React.FC<FlowerSvgProps> = ({
  variant,
  className = '',
  isHovered = false,
  stemHeight = 128,
  bendAngle = 0,
  uniqueId = 'flw',
}) => {
  const clampedBend = Math.max(-22, Math.min(22, bendAngle));
  const tipOffsetX = clampedBend * 1.25;
  const controlX = clampedBend * 0.55;

  const totalHeight = stemHeight + 70;
  const baseX = 60;
  const baseY = totalHeight;
  const headX = baseX + tipOffsetX;
  const headY = 52 + Math.abs(clampedBend) * 0.2;

  const stemPath = `M ${baseX} ${baseY} C ${baseX + controlX * 0.3} ${
    baseY - stemHeight * 0.35
  }, ${baseX + controlX * 0.85} ${baseY - stemHeight * 0.7}, ${headX} ${headY}`;

  return (
    <svg
      viewBox={`0 0 120 ${totalHeight}`}
      className={`overflow-visible select-none pointer-events-none ${className}`}
      style={{
        filter: isHovered
          ? 'drop-shadow(0 0 14px rgba(255, 250, 224, 0.9)) drop-shadow(0 4px 10px rgba(25, 50, 25, 0.22))'
          : 'drop-shadow(0 2px 6px rgba(30, 58, 28, 0.18))',
      }}
    >
      <defs>
        {/* Root-into-Grass Seamless Fade Mask */}
        <linearGradient
          id={`rootMaskGrad-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="92%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
        <mask id={`rootMask-${uniqueId}`}>
          <rect
            x="-40"
            y="-40"
            width="200"
            height={totalHeight + 60}
            fill={`url(#rootMaskGrad-${uniqueId})`}
          />
        </mask>

        {/* Soft Subsurface Sunlight Halo */}
        <radialGradient id={`halo-${uniqueId}`} cx="50%" cy="55%" r="50%">
          <stop
            offset="0%"
            stopColor="#FFFDE8"
            stopOpacity={isHovered ? '0.82' : '0.45'}
          />
          <stop
            offset="55%"
            stopColor="#FFF6C2"
            stopOpacity={isHovered ? '0.36' : '0.15'}
          />
          <stop offset="100%" stopColor="#FFF6C2" stopOpacity="0" />
        </radialGradient>

        {/* Painterly Backlit Pink Tulip Gradients */}
        <linearGradient
          id={`pBack-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFF7FA" />
          <stop offset="40%" stopColor="#F8D2E0" />
          <stop offset="85%" stopColor="#E59BB5" />
          <stop offset="100%" stopColor="#B86884" />
        </linearGradient>
        <linearGradient
          id={`pFrontLeft-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="80%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFF9FB" />
          <stop offset="28%" stopColor="#FCDCE8" />
          <stop offset="68%" stopColor="#F0ABC3" />
          <stop offset="92%" stopColor="#D67A9A" />
          <stop offset="100%" stopColor="#9E576E" />
        </linearGradient>
        <linearGradient
          id={`pFrontRight-${uniqueId}`}
          x1="100%"
          y1="0%"
          x2="20%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFF2F6" />
          <stop offset="35%" stopColor="#F7C6D8" />
          <stop offset="75%" stopColor="#E38FAD" />
          <stop offset="100%" stopColor="#AC5B78" />
        </linearGradient>
        <linearGradient
          id={`pCenter-${uniqueId}`}
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#FDE5EE" />
          <stop offset="78%" stopColor="#F2B3C9" />
          <stop offset="100%" stopColor="#C97692" />
        </linearGradient>

        {/* Painterly Golden-Butter Yellow Tulip Gradients */}
        <linearGradient
          id={`yLeft-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="80%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFFDF5" />
          <stop offset="30%" stopColor="#FFF099" />
          <stop offset="72%" stopColor="#F7C942" />
          <stop offset="100%" stopColor="#C98818" />
        </linearGradient>
        <linearGradient
          id={`yCenter-${uniqueId}`}
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="38%" stopColor="#FFF6B3" />
          <stop offset="82%" stopColor="#F9D452" />
          <stop offset="100%" stopColor="#D4951C" />
        </linearGradient>

        {/* Painterly Tangerine-Coral Tulip Gradients */}
        <linearGradient
          id={`oLeft-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="80%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFF6E0" />
          <stop offset="28%" stopColor="#FFC078" />
          <stop offset="68%" stopColor="#F5763D" />
          <stop offset="100%" stopColor="#AD3815" />
        </linearGradient>
        <linearGradient
          id={`oCenter-${uniqueId}`}
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFF9E6" />
          <stop offset="35%" stopColor="#FFD08A" />
          <stop offset="78%" stopColor="#F78548" />
          <stop offset="100%" stopColor="#C2461D" />
        </linearGradient>

        {/* 3/4 Perspective White & Blush Cosmos / Daisy Petals */}
        <linearGradient
          id={`daisyPetal-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#FFF7FA" />
          <stop offset="92%" stopColor="#F7D5E2" />
          <stop offset="100%" stopColor="#E6ABC0" />
        </linearGradient>
        <radialGradient id={`daisyCore-${uniqueId}`} cx="45%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#FFF49C" />
          <stop offset="55%" stopColor="#F5C338" />
          <stop offset="85%" stopColor="#D98A16" />
          <stop offset="100%" stopColor="#9E5608" />
        </radialGradient>

        {/* 3/4 Perspective Golden Sunflower Gradients */}
        <linearGradient
          id={`sunRay-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#FFF9B8" />
          <stop offset="45%" stopColor="#FDE054" />
          <stop offset="85%" stopColor="#F0A824" />
          <stop offset="100%" stopColor="#C4710E" />
        </linearGradient>
        <radialGradient id={`sunDisk-${uniqueId}`} cx="45%" cy="40%" r="58%">
          <stop offset="0%" stopColor="#8C5127" />
          <stop offset="45%" stopColor="#5C3014" />
          <stop offset="85%" stopColor="#381A08" />
          <stop offset="100%" stopColor="#240F03" />
        </radialGradient>

        {/* Delphinium / Lavender Larkspur Florets */}
        <radialGradient id={`larkspur-${uniqueId}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFF7FF" />
          <stop offset="45%" stopColor="#ECC4F9" />
          <stop offset="82%" stopColor="#C788E6" />
          <stop offset="100%" stopColor="#8E4EB5" />
        </radialGradient>

        {/* Natural Sunlit Meadow Stem & Wrapping Leaf */}
        <linearGradient
          id={`stem-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#B8E089" />
          <stop offset="45%" stopColor="#7AB052" />
          <stop offset="100%" stopColor="#46782B" />
        </linearGradient>
        <linearGradient
          id={`leafBack-${uniqueId}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#9EC973" />
          <stop offset="60%" stopColor="#5F943C" />
          <stop offset="100%" stopColor="#396620" />
        </linearGradient>
      </defs>

      <g mask={`url(#rootMask-${uniqueId})`}>
        {/* Back Wrapping Leaf Blade emerging from base */}
        <path
          d={`M ${baseX - 2} ${baseY} C ${baseX - 18 + controlX * 0.4} ${
            baseY - stemHeight * 0.38
          }, ${baseX - 24 + controlX * 0.65} ${
            baseY - stemHeight * 0.68
          }, ${baseX - 9 + controlX * 0.7} ${baseY - stemHeight * 0.84} C ${
            baseX - 12 + controlX * 0.5
          } ${baseY - stemHeight * 0.56}, ${baseX - 4 + controlX * 0.25} ${
            baseY - stemHeight * 0.3
          }, ${baseX + 2} ${baseY} Z`}
          fill={`url(#leafBack-${uniqueId})`}
          opacity="0.88"
        />

        {/* Organic Curved Stem with Sunlit Edge */}
        <path
          d={stemPath}
          fill="none"
          stroke="#3E6E24"
          strokeWidth={
            variant === 'purple-wildflower' || variant === 'lavender' ? 2.8 : 3.8
          }
          strokeLinecap="round"
        />
        <path
          d={stemPath}
          fill="none"
          stroke={`url(#stem-${uniqueId})`}
          strokeWidth={
            variant === 'purple-wildflower' || variant === 'lavender' ? 1.9 : 2.6
          }
          strokeLinecap="round"
        />

        {/* Front Sheathing Leaf Wrapping Stem Base */}
        <path
          d={`M ${baseX + 1} ${baseY} C ${baseX + 19 + controlX * 0.45} ${
            baseY - stemHeight * 0.34
          }, ${baseX + 22 + controlX * 0.75} ${
            baseY - stemHeight * 0.62
          }, ${baseX + 11 + controlX * 0.8} ${baseY - stemHeight * 0.78} C ${
            baseX + 10 + controlX * 0.55
          } ${baseY - stemHeight * 0.5}, ${baseX + 4 + controlX * 0.3} ${
            baseY - stemHeight * 0.25
          }, ${baseX - 1} ${baseY} Z`}
          fill={`url(#stem-${uniqueId})`}
          opacity="0.94"
        />

        {/* Flower Head Group — Pure SVG transform without conflicting CSS transition */}
        <g
          transform={`translate(${headX}, ${headY}) rotate(${
            clampedBend * 0.8
          })`}
        >
          {/* Warm Backlit Atmospheric Glow */}
          <circle cx="0" cy="-18" r="28" fill={`url(#halo-${uniqueId})`} />

          {/* 1. PAINTERLY BACKLIT PINK TULIP */}
          {variant === 'pink-tulip' && (
            <g>
              <path
                d="M -6 -38 C -1 -41, 6 -40, 10 -35 C 14 -24, 11 -6, 3 1 C -4 4, -11 -2, -13 -14 C -15 -26, -12 -35, -6 -38 Z"
                fill={`url(#pBack-${uniqueId})`}
              />
              <path
                d="M 0 4 C -15 3, -23 -9, -20 -26 C -18 -34, -13 -38, -8 -36 C -3 -34, 1 -18, 3 2 Z"
                fill={`url(#pFrontLeft-${uniqueId})`}
              />
              <path
                d="M 0 4 C 15 3, 23 -10, 19 -27 C 17 -35, 12 -38, 7 -35 C 2 -32, -1 -17, -2 2 Z"
                fill={`url(#pFrontRight-${uniqueId})`}
              />
              <path
                d="M -9 -33 C -4 -37, -1 -35, 0 -36 C 2 -35, 5 -37, 9 -33 C 15 -24, 13 -5, 0 5 C -13 -5, -15 -24, -9 -33 Z"
                fill={`url(#pCenter-${uniqueId})`}
                opacity="0.94"
              />
              <ellipse
                cx="0"
                cy="-3"
                rx="6.5"
                ry="4.5"
                fill="#FFF4B8"
                opacity="0.48"
              />
              <path
                d="M -4 3 Q 0 7 4 3"
                fill="none"
                stroke="#76A84C"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 2. PAINTERLY GOLDEN-BUTTER YELLOW TULIP */}
          {variant === 'yellow-tulip' && (
            <g>
              <path
                d="M -5 -39 C 1 -42, 8 -40, 12 -34 C 15 -22, 11 -5, 2 2 C -6 4, -12 -4, -13 -16 C -14 -28, -11 -36, -5 -39 Z"
                fill="#FFF8C4"
              />
              <path
                d="M 0 4 C -16 3, -23 -10, -19 -28 C -17 -35, -12 -38, -7 -35 C -2 -32, 2 -16, 3 3 Z"
                fill={`url(#yLeft-${uniqueId})`}
              />
              <path
                d="M 0 4 C 16 3, 23 -11, 18 -29 C 16 -36, 11 -38, 6 -35 C 1 -32, -2 -16, -3 3 Z"
                fill={`url(#yLeft-${uniqueId})`}
              />
              <path
                d="M -8 -34 C -3 -38, 3 -38, 8 -34 C 14 -24, 12 -5, 0 5 C -12 -5, -14 -24, -8 -34 Z"
                fill={`url(#yCenter-${uniqueId})`}
                opacity="0.93"
              />
              <path
                d="M -3.5 3.5 Q 0 7 3.5 3.5"
                fill="none"
                stroke="#75A84B"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 3. PAINTERLY TANGERINE-CORAL TULIP */}
          {variant === 'orange-tulip' && (
            <g>
              <path
                d="M -5 -37 C 2 -40, 9 -38, 12 -32 C 15 -20, 11 -4, 2 2 C -6 4, -12 -4, -13 -16 C -14 -26, -10 -34, -5 -37 Z"
                fill="#FFE0A3"
              />
              <path
                d="M 0 4 C -16 2, -24 -11, -19 -29 C -16 -35, -11 -37, -6 -33 C -1 -29, 2 -15, 3 3 Z"
                fill={`url(#oLeft-${uniqueId})`}
              />
              <path
                d="M 0 4 C 16 2, 24 -12, 19 -29 C 16 -35, 11 -37, 6 -33 C 1 -29, -2 -15, -3 3 Z"
                fill={`url(#oLeft-${uniqueId})`}
              />
              <path
                d="M -8 -32 C -3 -36, 3 -36, 8 -32 C 13 -22, 12 -4, 0 5 C -12 -4, -13 -22, -8 -32 Z"
                fill={`url(#oCenter-${uniqueId})`}
                opacity="0.92"
              />
              <ellipse
                cx="0"
                cy="-6"
                rx="7"
                ry="5"
                fill="#FFF2A6"
                opacity="0.45"
              />
            </g>
          )}

          {/* 4. DELICATE LARKSPUR / LAVENDER WILDFLOWER RACEME */}
          {(variant === 'purple-wildflower' || variant === 'lavender') && (
            <g>
              <path
                d="M 0 4 C -2 -16, 2 -34, 0 -54"
                stroke="#76AA50"
                strokeWidth="1.8"
                fill="none"
              />
              {[
                { x: -7, y: -4, s: 1.05, r: -18 },
                { x: 8, y: -10, s: 1.0, r: 22 },
                { x: -6, y: -18, s: 0.92, r: -14 },
                { x: 6, y: -25, s: 0.86, r: 18 },
                { x: -5, y: -33, s: 0.78, r: -12 },
                { x: 4, y: -40, s: 0.7, r: 15 },
                { x: -2, y: -47, s: 0.58, r: -8 },
                { x: 1, y: -53, s: 0.45, r: 5 },
              ].map((f, i) => (
                <g
                  key={i}
                  transform={`translate(${f.x}, ${f.y}) rotate(${f.r}) scale(${f.s})`}
                >
                  <path
                    d={`M ${f.x > 0 ? -5 : 5} 4 L 0 0`}
                    stroke="#76AA50"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M 0 -7 C 3 -7, 4 -2, 1 0 C -2 -2, -3 -7, 0 -7 Z"
                    fill={`url(#larkspur-${uniqueId})`}
                  />
                  <path
                    d="M -6 -2 C -4 -5, 0 -3, 0 0 C -2 2, -7 1, -6 -2 Z"
                    fill={`url(#larkspur-${uniqueId})`}
                  />
                  <path
                    d="M 6 -2 C 4 -5, 0 -3, 0 0 C 2 2, 7 1, 6 -2 Z"
                    fill={`url(#larkspur-${uniqueId})`}
                  />
                  <path
                    d="M -4 5 C -6 2, -2 -1, 0 0 C 1 3, -2 7, -4 5 Z"
                    fill={`url(#larkspur-${uniqueId})`}
                  />
                  <path
                    d="M 4 5 C 6 2, 2 -1, 0 0 C -1 3, 2 7, 4 5 Z"
                    fill={`url(#larkspur-${uniqueId})`}
                  />
                  <circle cx="0" cy="0" r="1.6" fill="#FFF7B2" />
                </g>
              ))}
            </g>
          )}

          {/* 5. 3/4 PERSPECTIVE MEADOW COSMOS / DAISY */}
          {variant === 'daisy' && (
            <g transform="translate(0, -16)">
              {[-48, -24, 0, 24, 48].map((deg, idx) => (
                <path
                  key={`b-${idx}`}
                  d="M 0 -2 C -4 -10, -5 -18, 0 -21 C 5 -18, 4 -10, 0 -2 Z"
                  transform={`rotate(${deg}) scale(1, 0.72)`}
                  fill={`url(#daisyPetal-${uniqueId})`}
                  opacity="0.92"
                />
              ))}
              {[-82, -62, 62, 82].map((deg, idx) => (
                <path
                  key={`s-${idx}`}
                  d="M 0 0 C -4.5 -9, -5.5 -20, 0 -24 C 5.5 -20, 4.5 -9, 0 0 Z"
                  transform={`rotate(${deg}) scale(1, 0.88)`}
                  fill={`url(#daisyPetal-${uniqueId})`}
                />
              ))}
              <ellipse
                cx="0"
                cy="-1"
                rx="8.5"
                ry="5.5"
                fill={`url(#daisyCore-${uniqueId})`}
              />
              <ellipse
                cx="-1.5"
                cy="-2.2"
                rx="4.5"
                ry="2.5"
                fill="#FFF9C4"
                opacity="0.65"
              />
              {[-135, -160, 180, 160, 135].map((deg, idx) => (
                <path
                  key={`f-${idx}`}
                  d="M 0 2 C -4.2 -6, -5 -15, 0 -19 C 5 -15, 4.2 -6, 0 2 Z"
                  transform={`rotate(${deg}) scale(1, 0.76)`}
                  fill={`url(#daisyPetal-${uniqueId})`}
                  opacity="0.96"
                />
              ))}
            </g>
          )}

          {/* 6. 3/4 PERSPECTIVE SUNLIT MEADOW SUNFLOWER */}
          {variant === 'sunflower' && (
            <g transform="translate(0, -18)">
              {[-55, -32, -10, 12, 34, 56].map((deg, idx) => (
                <path
                  key={`sb-${idx}`}
                  d="M 0 -3 C -4 -12, -4.5 -21, 0 -26 C 4.5 -21, 4 -12, 0 -3 Z"
                  transform={`rotate(${deg}) scale(1, 0.76)`}
                  fill={`url(#sunRay-${uniqueId})`}
                />
              ))}
              {[-88, -70, 70, 88].map((deg, idx) => (
                <path
                  key={`sl-${idx}`}
                  d="M 0 -1 C -4.5 -11, -5 -22, 0 -28 C 5 -22, 4.5 -11, 0 -1 Z"
                  transform={`rotate(${deg}) scale(1, 0.9)`}
                  fill={`url(#sunRay-${uniqueId})`}
                />
              ))}
              <ellipse
                cx="0"
                cy="-1"
                rx="10.5"
                ry="7"
                fill={`url(#sunDisk-${uniqueId})`}
              />
              <ellipse
                cx="0"
                cy="-1"
                rx="8.2"
                ry="5.2"
                fill="none"
                stroke="#F5B82E"
                strokeWidth="1.2"
                strokeDasharray="1.5 2.5"
                opacity="0.85"
              />
              {[-125, -150, 175, 150, 125].map((deg, idx) => (
                <path
                  key={`sf-${idx}`}
                  d="M 0 3 C -4 -6, -4.5 -16, 0 -21 C 4.5 -16, 4 -6, 0 3 Z"
                  transform={`rotate(${deg}) scale(1, 0.78)`}
                  fill={`url(#sunRay-${uniqueId})`}
                  opacity="0.96"
                />
              ))}
            </g>
          )}
        </g>
      </g>
    </svg>
  );
};

/**
 * Miniature custom seed & botanical badge illustration for the "Choose your seed" dropdown
 * and the Write Story sanctuary.
 */
export const SeedIconIllustration: React.FC<{
  seedType: SeedType;
  size?: number;
  className?: string;
}> = ({ seedType, size = 44, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      className={`overflow-visible shrink-0 ${className}`}
    >
      {seedType === 'daisy' && (
        <g>
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="#FDF2F6"
            stroke="#F4B8CC"
            strokeWidth="1.2"
          />
          <path
            d="M 28 45 Q 28 35 28 27"
            stroke="#73A857"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M 28 38 Q 20 34 22 30 Q 27 32 28 38" fill="#89BC6E" />
          <g transform="translate(28, 22)">
            {Array.from({ length: 10 }).map((_, i) => (
              <ellipse
                key={i}
                cx="0"
                cy="-8.5"
                rx="3.2"
                ry="6.8"
                transform={`rotate(${i * 36})`}
                fill="#FFFFFF"
                stroke="#F4B8CC"
                strokeWidth="0.8"
              />
            ))}
            <circle cx="0" cy="0" r="5" fill="#F7D77D" />
          </g>
        </g>
      )}

      {seedType === 'sunflower' && (
        <g>
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="#FFFBEB"
            stroke="#F7D77D"
            strokeWidth="1.2"
          />
          <path
            d="M 28 45 Q 28 35 28 27"
            stroke="#6C9E4F"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path d="M 28 39 Q 36 35 34 30 Q 29 32 28 39" fill="#86B86A" />
          <g transform="translate(28, 22)">
            {Array.from({ length: 12 }).map((_, i) => (
              <ellipse
                key={i}
                cx="0"
                cy="-9"
                rx="3.4"
                ry="7"
                transform={`rotate(${i * 30})`}
                fill={i % 2 === 0 ? '#F9DC5C' : '#F4BE37'}
              />
            ))}
            <circle cx="0" cy="0" r="6" fill="#6B3E23" />
            <circle cx="-1.5" cy="-1.5" r="2" fill="#D99B38" opacity="0.6" />
          </g>
        </g>
      )}

      {seedType === 'lavender' && (
        <g>
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="#F7F3FC"
            stroke="#C9B6E4"
            strokeWidth="1.2"
          />
          <path
            d="M 28 46 Q 28 30 28 14"
            stroke="#6E9D58"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d="M 28 41 Q 20 36 22 32 Q 26 35 28 41" fill="#88B572" />
          <path d="M 28 41 Q 36 36 34 32 Q 30 35 28 41" fill="#88B572" />
          {[
            { x: 24, y: 28 },
            { x: 32, y: 26 },
            { x: 24, y: 22 },
            { x: 32, y: 20 },
            { x: 25, y: 16 },
            { x: 31, y: 15 },
            { x: 28, y: 11 },
          ].map((bud, idx) => (
            <ellipse
              key={idx}
              cx={bud.x}
              cy={bud.y}
              rx="3.4"
              ry="2.5"
              transform={`rotate(${idx % 2 === 0 ? -25 : 25} ${bud.x} ${bud.y})`}
              fill={idx % 2 === 0 ? '#C9A5E8' : '#B388EB'}
            />
          ))}
        </g>
      )}
    </svg>
  );
};
