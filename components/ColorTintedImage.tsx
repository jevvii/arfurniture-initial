import React from 'react';

interface ColorTintedImageProps {
  src: string;
  color?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Displays a product image with an optional dynamic color tint.
 * When a color is provided, the image is first desaturated, then the
 * target hue is blended in. This preserves shadows/highlights while
 * showing the variant color accurately.
 */
export const ColorTintedImage: React.FC<ColorTintedImageProps> = ({
  src,
  color,
  alt,
  className = '',
  style
}) => {
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

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <img
        src={src}
        alt={alt || ''}
        className="w-full h-full object-cover"
        style={{
          filter: 'grayscale(100%) contrast(1.1) brightness(1.05)'
        }}
      />
      <div
        className="absolute inset-0 mix-blend-color"
        style={{ backgroundColor: color }}
      />
      {/* Subtle overlay to restore some warmth/saturation lost during grayscale */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-20"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};
