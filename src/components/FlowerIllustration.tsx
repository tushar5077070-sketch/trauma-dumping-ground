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
 * Renders a richly detailed, subsurface-scattered backlit meadow flower
 * with realistic translucent petals, botanical veins, dewdrops, and curved stems.
 */
export const MeadowFlowerSvg: React.FC<FlowerSvgProps> = ({
  variant,
  className = '',
  isHovered = false,
  stemHeight = 140,
  bendAngle = 0,
  uniqueId = 'flw',
}) => {
  const clampedBend = Math.max(-28, Math.min(28, bendAngle));
  const tipOffsetX = clampedBend * 1.5;
  const controlX = clampedBend * 0.68;

  const totalHeight = stemHeight + 74;
  const baseX = 60;
  const baseY = totalHeight;
  const headX = baseX + tipOffsetX;
  const headY = 54 + Math.abs(clampedBend) * 0.25;

  const stemPath = `M ${baseX} ${baseY} Q ${baseX + controlX} ${
    baseY - stemHeight * 0.55
  } ${headX} ${headY}`;

  return (
    <svg
      viewBox={`0 0 120 ${totalHeight}`}
      className={`overflow-visible select-none ${className}`}
      style={{
        filter: isHovered
          ? 'drop-shadow(0 0 18px rgba(255, 250, 220, 0.95)) drop-shadow(0 6px 14px rgba(25, 55, 30, 0.28))'
          : 'drop-shadow(0 4px 10px rgba(28, 58, 32, 0.24))',
      }}
    >
      <defs>
        {/* Subsurface Backlit Pink Tulip */}
        <linearGradient id={`pinkOuter-${uniqueId}`} x1="0%" y1="0%" x2="15%" y2="100%">
          <stop offset="0%" stopColor="#FFF5F9" />
          <stop offset="32%" stopColor="#FAD2E0" />
          <stop offset="72%" stopColor="#EE9BB7" />
          <stop offset="100%" stopColor="#C85A82" />
        </linearGradient>
        <linearGradient id={`pinkInner-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#FDE2EC" />
          <stop offset="85%" stopColor="#F2A9C3" />
          <stop offset="100%" stopColor="#D96B92" />
        </linearGradient>
        <radialGradient id={`sunCore-${uniqueId}`} cx="50%" cy="65%" r="55%">
          <stop offset="0%" stopColor="#FFF9C4" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#FFE082" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFE082" stopOpacity="0" />
        </radialGradient>

        {/* Subsurface Backlit Golden Yellow Tulip */}
        <linearGradient id={`yellowOuter-${uniqueId}`} x1="0%" y1="0%" x2="10%" y2="100%">
          <stop offset="0%" stopColor="#FFFDF2" />
          <stop offset="35%" stopColor="#FFF08A" />
          <stop offset="75%" stopColor="#F9C835" />
          <stop offset="100%" stopColor="#D98A12" />
        </linearGradient>
        <linearGradient id={`yellowInner-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#FFF5A8" />
          <stop offset="100%" stopColor="#F2B718" />
        </linearGradient>

        {/* Subsurface Backlit Tangerine-Coral Tulip */}
        <linearGradient id={`orangeOuter-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF3D6" />
          <stop offset="35%" stopColor="#FFB070" />
          <stop offset="75%" stopColor="#F26A36" />
          <stop offset="100%" stopColor="#B83314" />
        </linearGradient>

        {/* Delphinium / Lavender Wildflower Spike */}
        <radialGradient id={`lavFloret-${uniqueId}`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FDF7FF" />
          <stop offset="48%" stopColor="#E2B8F7" />
          <stop offset="85%" stopColor="#B87CE0" />
          <stop offset="100%" stopColor="#8648B5" />
        </radialGradient>

        {/* Sunlit Stem & Leaf Gradients */}
        <linearGradient id={`stemGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BCE691" />
          <stop offset="40%" stopColor="#82B859" />
          <stop offset="85%" stopColor="#4F8736" />
          <stop offset="100%" stopColor="#315E1E" />
        </linearGradient>
        <linearGradient id={`leafLit-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8EE9B" />
          <stop offset="55%" stopColor="#77AF4F" />
          <stop offset="100%" stopColor="#3E7027" />
        </linearGradient>
      </defs>

      {/* Main Stem Shadow & Sunlit Core */}
      <path
        d={stemPath}
        fill="none"
        stroke="#2E591C"
        strokeWidth={variant === 'purple-wildflower' || variant === 'lavender' ? 3.4 : 4.6}
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d={stemPath}
        fill="none"
        stroke={`url(#stemGrad-${uniqueId})`}
        strokeWidth={variant === 'purple-wildflower' || variant === 'lavender' ? 2.6 : 3.6}
        strokeLinecap="round"
      />

      {/* Left Gracefully Arching Tulip/Meadow Leaf */}
      <path
        d={`M ${baseX + controlX * 0.3} ${baseY - stemHeight * 0.18} C ${
          baseX - 28 + controlX * 0.45
        } ${baseY - stemHeight * 0.48}, ${baseX - 26 + controlX * 0.65} ${
          baseY - stemHeight * 0.72
        }, ${baseX - 11 + controlX * 0.75} ${baseY - stemHeight * 0.82} C ${
          baseX - 8 + controlX * 0.55
        } ${baseY - stemHeight * 0.56}, ${baseX - 4 + controlX * 0.35} ${
          baseY - stemHeight * 0.36
        }, ${baseX + controlX * 0.3} ${baseY - stemHeight * 0.18} Z`}
        fill={`url(#leafLit-${uniqueId})`}
        opacity="0.95"
      />

      {/* Right Sunlit Leaf */}
      <path
        d={`M ${baseX + controlX * 0.42} ${baseY - stemHeight * 0.28} C ${
          baseX + 28 + controlX * 0.55
        } ${baseY - stemHeight * 0.54}, ${baseX + 25 + controlX * 0.75} ${
          baseY - stemHeight * 0.76
        }, ${baseX + 12 + controlX * 0.85} ${baseY - stemHeight * 0.86} C ${
          baseX + 9 + controlX * 0.6
        } ${baseY - stemHeight * 0.58}, ${baseX + 4 + controlX * 0.45} ${
          baseY - stemHeight * 0.42
        }, ${baseX + controlX * 0.42} ${baseY - stemHeight * 0.28} Z`}
        fill={`url(#stemGrad-${uniqueId})`}
        opacity="0.92"
      />

      {/* Flower Head Group */}
      <g
        transform={`translate(${headX}, ${headY}) rotate(${clampedBend * 0.88}) scale(${
          isHovered ? 1.18 : 1
        })`}
        className="transition-transform duration-200 ease-out"
      >
        {/* Subtle Backlit Sun Halo Behind Every Story Flower */}
        <circle
          cx="0"
          cy="-18"
          r={isHovered ? 32 : 24}
          fill={`url(#sunCore-${uniqueId})`}
        />

        {variant === 'pink-tulip' && (
          <g className="animate-petal-breathe">
            {/* Far back center-left & center-right petals */}
            <path
              d="M -5 -41 C 6 -43, 14 -22, 8 2 C 2 8, -9 7, -12 0 C -17 -16, -15 -39, -5 -41 Z"
              fill={`url(#pinkInner-${uniqueId})`}
              opacity="0.92"
            />
            <path
              d="M 6 -40 C 16 -38, 18 -16, 12 1 C 7 8, -2 8, -7 1 C -12 -18, -4 -42, 6 -40 Z"
              fill={`url(#pinkInner-${uniqueId})`}
              opacity="0.92"
            />
            {/* Left outer wrapping cup petal */}
            <path
              d="M -1 5 C -21 4, -29 -15, -20 -37 C -12 -35, -3 -20, 3 3 Z"
              fill={`url(#pinkOuter-${uniqueId})`}
            />
            {/* Right outer wrapping cup petal */}
            <path
              d="M 1 5 C 21 4, 29 -15, 20 -37 C 12 -35, 3 -20, -3 3 Z"
              fill={`url(#pinkOuter-${uniqueId})`}
            />
            {/* Central translucent sunlit front petal */}
            <path
              d="M 0 -38 C 14 -33, 17 -9, 0 6 C -17 -9, -14 -33, 0 -38 Z"
              fill={`url(#pinkInner-${uniqueId})`}
              opacity="0.93"
            />
            {/* Delicate petal veins & subsurface inner glow */}
            <path
              d="M 0 4 Q 0 -16 0 -35 M -5 2 Q -8 -14 -6 -30 M 5 2 Q 8 -14 6 -30"
              stroke="#FFF8FA"
              strokeWidth="0.65"
              fill="none"
              opacity="0.55"
            />
            <ellipse cx="0" cy="-6" rx="9" ry="6" fill="#FFF7C2" opacity="0.55" />
            {/* Tiny sunlit dewdrop on petal */}
            <circle cx="-8" cy="-18" r="1.4" fill="#FFFFFF" opacity="0.85" />
          </g>
        )}

        {variant === 'yellow-tulip' && (
          <g className="animate-petal-breathe">
            <path
              d="M 0 -42 C 16 -40, 21 -14, 12 3 C 5 10, -5 10, -12 3 C -21 -14, -16 -40, 0 -42 Z"
              fill={`url(#yellowInner-${uniqueId})`}
            />
            <path
              d="M -2 5 C -21 4, -27 -16, -18 -38 C -10 -32, -2 -17, 2 4 Z"
              fill={`url(#yellowOuter-${uniqueId})`}
              opacity="0.96"
            />
            <path
              d="M 2 5 C 21 4, 27 -16, 18 -38 C 10 -32, 2 -17, -2 4 Z"
              fill={`url(#yellowOuter-${uniqueId})`}
              opacity="0.96"
            />
            <path
              d="M 0 -38 C 13 -31, 15 -8, 0 5 C -15 -8, -13 -31, 0 -38 Z"
              fill={`url(#yellowInner-${uniqueId})`}
              opacity="0.88"
            />
            <path
              d="M 0 4 Q 0 -15 0 -34 M -5 2 Q -7 -14 -5 -28 M 5 2 Q 7 -14 5 -28"
              stroke="#FFFFFF"
              strokeWidth="0.7"
              fill="none"
              opacity="0.6"
            />
            <circle cx="7" cy="-21" r="1.3" fill="#FFFFFF" opacity="0.9" />
          </g>
        )}

        {variant === 'orange-tulip' && (
          <g className="animate-petal-breathe">
            <path
              d="M 0 -40 C 17 -38, 23 -13, 13 3 C 5 10, -5 10, -13 3 C -23 -13, -17 -38, 0 -40 Z"
              fill="#FFD59E"
            />
            <path
              d="M -2 5 C -22 3, -29 -17, -20 -36 C -11 -30, -2 -15, 2 4 Z"
              fill={`url(#orangeOuter-${uniqueId})`}
              opacity="0.95"
            />
            <path
              d="M 2 5 C 22 3, 29 -17, 20 -36 C 11 -30, 2 -15, -2 4 Z"
              fill={`url(#orangeOuter-${uniqueId})`}
              opacity="0.95"
            />
            <path
              d="M 0 -36 C 12 -30, 15 -8, 0 5 C -15 -8, -12 -30, 0 -36 Z"
              fill={`url(#orangeOuter-${uniqueId})`}
              opacity="0.82"
            />
            <ellipse cx="0" cy="-9" rx="9" ry="8" fill="#FFF0A8" opacity="0.55" />
          </g>
        )}

        {(variant === 'purple-wildflower' || variant === 'lavender') && (
          <g className="animate-petal-breathe">
            {/* Tall larkspur / delphinium blossom spike */}
            <path
              d="M 0 4 Q -1 -24 0 -54"
              stroke="#6DA651"
              strokeWidth="2"
              fill="none"
            />
            {[
              { x: -8, y: -5, s: 1.05 },
              { x: 8, y: -11, s: 1.0 },
              { x: -7, y: -19, s: 0.94 },
              { x: 7, y: -26, s: 0.88 },
              { x: -5, y: -34, s: 0.8 },
              { x: 5, y: -41, s: 0.72 },
              { x: -2, y: -48, s: 0.62 },
              { x: 1, y: -54, s: 0.5 },
            ].map((floret, i) => (
              <g
                key={i}
                transform={`translate(${floret.x}, ${floret.y}) scale(${floret.s})`}
              >
                {[0, 72, 144, 216, 288].map((deg) => (
                  <ellipse
                    key={deg}
                    cx="0"
                    cy="-4.2"
                    rx="3.2"
                    ry="5.2"
                    transform={`rotate(${deg})`}
                    fill={`url(#lavFloret-${uniqueId})`}
                  />
                ))}
                <circle cx="0" cy="0" r="2.1" fill="#FFF6B3" />
              </g>
            ))}
          </g>
        )}

        {variant === 'daisy' && (
          <g className="animate-petal-breathe" transform="translate(0, -18)">
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = i * (360 / 16);
              return (
                <ellipse
                  key={i}
                  cx="0"
                  cy="-15"
                  rx="4.2"
                  ry="12"
                  transform={`rotate(${angle})`}
                  fill={i % 2 === 0 ? '#FFFFFF' : '#FFF4F8'}
                  stroke="#F4C2D3"
                  strokeWidth="0.5"
                />
              );
            })}
            <circle cx="0" cy="0" r="8.5" fill="#F5B82E" />
            <circle cx="0" cy="0" r="6.8" fill="#FCE068" />
            <circle cx="-2.2" cy="-2.2" r="3.5" fill="#FFF9C4" opacity="0.75" />
          </g>
        )}

        {variant === 'sunflower' && (
          <g className="animate-petal-breathe" transform="translate(0, -20)">
            {Array.from({ length: 18 }).map((_, i) => {
              const angle = i * (360 / 18);
              return (
                <path
                  key={i}
                  d="M 0 -7 C 3.5 -14, 3.8 -22, 0 -27 C -3.8 -22, -3.5 -14, 0 -7 Z"
                  transform={`rotate(${angle})`}
                  fill={i % 2 === 0 ? `url(#yellowOuter-${uniqueId})` : '#F5B526'}
                />
              );
            })}
            <circle cx="0" cy="0" r="10.5" fill="#5E3319" />
            <circle cx="0" cy="0" r="8.2" fill="#3D1F0D" />
            <circle
              cx="0"
              cy="0"
              r="9.2"
              fill="none"
              stroke="#E69F32"
              strokeWidth="1.1"
              strokeDasharray="1.5 2.2"
            />
          </g>
        )}
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
          <circle cx="28" cy="28" r="24" fill="#FDF2F6" stroke="#F4B8CC" strokeWidth="1.2" />
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
          <circle cx="28" cy="28" r="24" fill="#FFFBEB" stroke="#F7D77D" strokeWidth="1.2" />
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
          <circle cx="28" cy="28" r="24" fill="#F7F3FC" stroke="#C9B6E4" strokeWidth="1.2" />
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
