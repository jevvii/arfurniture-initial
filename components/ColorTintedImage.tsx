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
        1. feColorMatrix (type="matrix"): Desaturates the image and converts it to a grayscale luminosity map.
        2. feComponentTransfer: Adjusts the threshold so white backgrounds become transparent.
        3. feFlood: Creates a solid color layer of our target wood tint.
        4. feComposite: Masks the solid color with the luminosity map.
      */}
      <svg className="absolute w-0 h-0 invisible">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            {/* Convert to grayscale to use as a mask */}
            <feColorMatrix 
              type="matrix" 
              values="0.33 0.33 0.33 0 0 
                      0.33 0.33 0.33 0 0 
                      0.33 0.33 0.33 0 0 
                      0 0 0 1 0" 
              result="grayscale" 
            />
            
            {/* Extract luminosity and invert it for masking (darker areas get more tint) */}
            <feComponentTransfer in="grayscale" result="mask">
              <feFuncA type="table" tableValues="1 1 1 0.8 0" /> {/* This drops off at the white peak (background) */}
            </feComponentTransfer>

            {/* The wood tint color */}
            <feFlood floodColor={color} floodOpacity="0.85" result="tintColor" />
            
            {/* Blend the tint onto the original image's shadows/midtones */}
            <feComposite in="tintColor" in2="mask" operator="in" result="maskedTint" />
            
            {/* Layer the tint over the original desaturated image */}
            <feBlend in="maskedTint" in2="SourceGraphic" mode="multiply" />
          </filter>
        </defs>
      </svg>

      <img
        src={src}
        alt={alt || ''}
        className="w-full h-full object-cover"
        style={{
          filter: `url(#${filterId}) brightness(1.05) contrast(1.1)`
        }}
      />
    </div>
  );
};
