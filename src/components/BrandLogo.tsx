import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 32,
  showText = false,
  textClassName = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Bill Roulette Aperture / Wheel Insignia */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 group-hover:rotate-45"
      >
        {/* Outer Dark Carbon Base */}
        <circle cx="24" cy="24" r="23" fill="#0B0F0D" stroke="#1F2922" strokeWidth="2" />
        
        {/* Segmented Roulette Ring Track */}
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="#C8FF3D"
          strokeWidth="2.5"
          strokeDasharray="4 2.5"
          className="opacity-90"
        />

        {/* Crosshair / Wheel Spokes */}
        <line x1="24" y1="4" x2="24" y2="12" stroke="#C8FF3D" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="36" x2="24" y2="44" stroke="#C8FF3D" strokeWidth="2" strokeLinecap="round" />
        <line x1="4" y1="24" x2="12" y2="24" stroke="#C8FF3D" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="24" x2="44" y2="24" stroke="#C8FF3D" strokeWidth="2" strokeLinecap="round" />

        {/* Inner Hub Ring */}
        <circle cx="24" cy="24" r="9" fill="#131915" stroke="#C8FF3D" strokeWidth="1.5" />
        
        {/* Center Target Core */}
        <circle cx="24" cy="24" r="4" fill="#C8FF3D" />
      </svg>

      {showText && (
        <span
          className={`font-display font-extrabold tracking-tight text-white uppercase ${
            textClassName || 'text-lg sm:text-xl'
          }`}
        >
          Bill <span className="text-[#C8FF3D]">Roulette</span>
        </span>
      )}
    </div>
  );
};
