import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Participant } from '../types';
import { sound } from '../utils/audio';

interface RouletteWheelProps {
  participants: Participant[];
  isSpinning: boolean;
  targetWinnerIndex: number | null;
  onSpinComplete: (winnerIndex: number) => void;
}

// Curated palette for wheel sectors
const SECTOR_COLORS = [
  '#18191f',
  '#23262f',
  '#1b1c22',
  '#2a2d37',
  '#1f2128',
  '#272a33',
];

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  participants,
  isSpinning,
  targetWinnerIndex,
  onSpinComplete,
}) => {
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const lastTickSectorRef = useRef<number>(-1);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startRotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const spinDurationRef = useRef<number>(5500); // 5.5 seconds of suspense

  const numSectors = Math.max(1, participants.length);
  const sectorAngleDeg = 360 / numSectors;

  // Memoize sector definitions
  const sectors = useMemo(() => {
    return participants.map((p, idx) => {
      const startAngle = idx * sectorAngleDeg;
      const endAngle = (idx + 1) * sectorAngleDeg;
      const midAngle = startAngle + sectorAngleDeg / 2;
      const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
      return {
        participant: p,
        index: idx,
        startAngle,
        endAngle,
        midAngle,
        color,
      };
    });
  }, [participants, sectorAngleDeg]);

  // When a spin starts with an authoritative targetWinnerIndex
  useEffect(() => {
    if (isSpinning && targetWinnerIndex !== null) {
      sound.playSpinStart();

      // Check for prefers-reduced-motion
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const duration = prefersReducedMotion ? 600 : 5500;
      spinDurationRef.current = duration;

      startRotationRef.current = currentRotation % 360;

      // Pointer is fixed at 270 degrees (the top of the wheel)
      // Sector i spans [i * sectorAngleDeg, (i + 1) * sectorAngleDeg]
      // To align sector W with the top needle (270 deg):
      // (270 - midAngle) modulo 360 gives the resting wheel angle
      const targetMidAngle = targetWinnerIndex * sectorAngleDeg + sectorAngleDeg / 2;
      const restingAngle = (270 - targetMidAngle + 360) % 360;

      // Add 6 to 8 full revolutions for dramatic suspense
      const fullRotations = prefersReducedMotion ? 1 : 6;
      const totalDelta = fullRotations * 360 + ((restingAngle - (startRotationRef.current % 360) + 360) % 360);

      targetRotationRef.current = startRotationRef.current + totalDelta;
      startTimeRef.current = null;
      lastTickSectorRef.current = -1;

      // Custom easing: cubic-bezier deceleration curve
      // easeOutCubic: f(t) = 1 - (1 - t)^3
      // easeOutQuint: f(t) = 1 - (1 - t)^4
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(1, elapsed / duration);

        // Quintic deceleration curve for genuine roulette slowing
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const rotationNow = startRotationRef.current + (targetRotationRef.current - startRotationRef.current) * easeOut;

        setCurrentRotation(rotationNow);

        // Trigger tick sound as pointer crosses sector dividers
        const normalizedAngle = (270 - (rotationNow % 360) + 360) % 360;
        const currentSectorIndex = Math.floor(normalizedAngle / sectorAngleDeg);

        if (currentSectorIndex !== lastTickSectorRef.current) {
          lastTickSectorRef.current = currentSectorIndex;
          // Audio pitch increases with speed
          const speed = 1 - progress;
          sound.playTick(0.8 + speed * 0.6);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentRotation(targetRotationRef.current);
          sound.playWinnerFanfare();
          onSpinComplete(targetWinnerIndex);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpinning, targetWinnerIndex]);

  // SVG Helper: Calculate point on circle
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // SVG Helper: Describe arc path
  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', x, y,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z',
    ].join(' ');
  };

  const wheelSize = 340;
  const center = wheelSize / 2;
  const radius = wheelSize / 2 - 12;

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      {/* Top pointer marker (Top Needle) */}
      <div className="absolute top-0 z-30 flex flex-col items-center -translate-y-1">
        <div className="w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[20px] border-t-[#ccff00] drop-shadow-[0_4px_8px_rgba(204,255,0,0.5)]" />
        <div className="w-2.5 h-2.5 rounded-full bg-black border-2 border-[#ccff00] -mt-1" />
      </div>

      {/* Wheel outer ring & ambient glow */}
      <div className="relative p-2 rounded-full bg-gradient-to-b from-zinc-700/60 via-zinc-900 to-black border border-zinc-700/50 shadow-2xl shadow-black/80">
        <svg
          viewBox={`0 0 ${wheelSize} ${wheelSize}`}
          className="w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] max-w-[calc(100vw-3rem)] max-h-[calc(100vw-3rem)] transition-transform will-change-transform"
          style={{
            transform: `rotate(${currentRotation}deg)`,
            transformOrigin: '50% 50%',
          }}
        >
          {/* Outer bezel */}
          <circle
            cx={center}
            cy={center}
            r={radius + 6}
            fill="#121318"
            stroke="#27272a"
            strokeWidth="3"
          />

          {/* Wheel Sectors */}
          {sectors.map((sec) => {
            const arcPath = describeArc(center, center, radius, sec.startAngle, sec.endAngle);
            const textPos = polarToCartesian(center, center, radius * 0.65, sec.midAngle);
            const textAngle = sec.midAngle + 90;

            return (
              <g key={sec.participant.id + '_' + sec.index}>
                <path
                  d={arcPath}
                  fill={sec.color}
                  stroke="#333742"
                  strokeWidth="1.2"
                />

                {/* Sector divider peg */}
                {(() => {
                  const peg = polarToCartesian(center, center, radius - 2, sec.startAngle);
                  return (
                    <circle
                      cx={peg.x}
                      cy={peg.y}
                      r="2.5"
                      fill="#ccff00"
                      opacity="0.7"
                    />
                  );
                })()}

                {/* Participant Label */}
                <text
                  x={textPos.x}
                  y={textPos.y}
                  fill="#f4f4f6"
                  fontSize={numSectors > 6 ? '11' : '13'}
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${textAngle}, ${textPos.x}, ${textPos.y})`}
                  className="font-display tracking-tight pointer-events-none select-none"
                >
                  {sec.participant.name.length > 10
                    ? sec.participant.name.slice(0, 9) + '…'
                    : sec.participant.name}
                </text>
              </g>
            );
          })}

          {/* Central Hub */}
          <circle
            cx={center}
            cy={center}
            r="38"
            fill="#0d0e12"
            stroke="#3f3f46"
            strokeWidth="2.5"
          />
          <circle
            cx={center}
            cy={center}
            r="28"
            fill="#181920"
            stroke="#ccff00"
            strokeWidth="1.5"
          />
          <text
            x={center}
            y={center}
            fill="#ccff00"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
            className="tracking-wider uppercase select-none font-mono"
          >
            VRF
          </text>
        </svg>
      </div>

      {/* Decorative Floor Shadow */}
      <div className="w-56 h-3 bg-black/60 blur-md rounded-full mt-2" />
    </div>
  );
};
