import React, { useMemo } from 'react';

interface ColorTintedImageProps {
  src: string;
  color?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Advanced Product Tinter
 * Uses an SVG Filter to isolate the product from a white background.
 * It applies the color tint only to the object and shadows, preserving the
 * pure white background and highlights.
 */
export const ColorTintedImage: React.FC<ColorTintedImageProps> = ({
  src,
  color,
  alt,
  className = '',
  style
}) => {
  // Generate a unique ID for the filter to avoid collisions if multiple images exist
  const filterId = useMemo(() => `tint-filter-${Math.random().toString(36).substr(2, 9)}`, [src, color]);

  if (!color) {
    return (
      <img
        src={src}
        alt={alt || ''}
        className={className}
        style={style}
      />
    );
  }

  // Convert hex to RGB for the SVG filter
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* 
        SVG Filter Definition:
        1. feColorMatrix: Desaturates and moves inverted luminosity into the Alpha channel.
           - This makes white areas (background) transparent and dark areas (object) opaque in the mask.
        2. feFlood: The wood tint color.
        3. feComposite: Clips the wood tint using the alpha mask.
      */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            {/* Create an Alpha mask based on brightness: 
                Alpha = 1.0 - (0.33R + 0.33G + 0.33B)
                White (1,1,1) -> Alpha 0 (Transparent)
                Black (0,0,0) -> Alpha 1 (Opaque)
            */}
            <feColorMatrix 
              type="matrix" 
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      -0.33 -0.33 -0.33 0 1" 
              result="mask" 
            />
            
            {/* Target Wood Color */}
            <feFlood floodColor={color} floodOpacity="1" result="tint" />
            
            {/* Mask the tint: only apply where the object is (non-white) */}
            <feComposite in="tint" in2="mask" operator="in" result="appliedTint" />
            
            {/* Blend it over the source graphic */}
            <feBlend in="appliedTint" in2="SourceGraphic" mode="multiply" />
          </filter>
        </defs>
      </svg>

      <img
        src={src}
        alt={alt || ''}
        className="w-full h-full object-cover"
        style={{
          filter: `url(#${filterId}) contrast(1.1) brightness(1.1)`
        }}
      />
    </div>
  );
};
