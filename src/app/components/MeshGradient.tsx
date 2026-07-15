import { MeshPoint } from './mesh-utils';

interface MeshGradientProps {
  points: MeshPoint[];
  width?: number;
  height?: number;
}

export function MeshGradient({ points, width = 1080, height = 1080 }: MeshGradientProps) {
  // Generate unique IDs for filters
  const uniqueId = Math.random().toString(36).substring(7);

  // Seeded random function for deterministic randomness based on position
  const seededRandom = (x: number, y: number, seed: number) => {
    const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
    return value - Math.floor(value);
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        {points.map((point, index) => {
          // Use custom blur amount if available (from uploaded SVG), otherwise use seeded random
          const blurAmount = point.blurAmount !== undefined
            ? point.blurAmount
            : 60 + seededRandom(point.x, point.y, 1) * 60;
          return (
            <filter
              key={index}
              id={`blur-${uniqueId}-${index}`}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation={blurAmount} result="effect1_foregroundBlur"/>
            </filter>
          );
        })}
      </defs>

      <g clipPath={`url(#clip-${uniqueId})`}>
        {/* Base background color */}
        <rect width={width} height={height} fill={points[0]?.color || '#000000'} />

        {/* Create organic blob shapes with heavy blur for each color */}
        {points.map((point, index) => {
          console.log(`Point ${index}:`, { shapeType: point.shapeType, hasAttrs: !!point.shapeAttrs, color: point.color });

          const centerX = (point.x / 100) * width;
          const centerY = (point.y / 100) * height;

          // If point has custom shape from uploaded SVG, render it exactly
          if (point.shapeType && point.shapeAttrs) {
            console.log(`Rendering ${point.shapeType} with attrs:`, point.shapeAttrs);
            return (
              <g key={index} filter={`url(#blur-${uniqueId}-${index})`}>
                {point.shapeType === 'circle' && (
                  <circle {...point.shapeAttrs} fill={point.color} />
                )}
                {point.shapeType === 'ellipse' && (
                  <ellipse {...point.shapeAttrs} fill={point.color} />
                )}
                {point.shapeType === 'path' && (
                  <path {...point.shapeAttrs} fill={point.color} />
                )}
              </g>
            );
          }

          console.log(`Falling back to blob for point ${index}`);

          // Otherwise generate blob shape
          const size = 400 + seededRandom(point.x, point.y, 2) * 400;

          // Generate organic blob path
          const numPoints = 8 + Math.floor(seededRandom(point.x, point.y, 3) * 4);
          const pathPoints: string[] = [];

          for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const radiusVariation = 0.6 + seededRandom(point.x, point.y, i + 4) * 0.8;
            const radius = size * radiusVariation;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            pathPoints.push(`${x},${y}`);
          }

          return (
            <g key={index} filter={`url(#blur-${uniqueId}-${index})`}>
              <path
                d={`M ${pathPoints[0]} ${pathPoints.slice(1).map(p => `L ${p}`).join(' ')} Z`}
                fill={point.color}
              />
            </g>
          );
        })}
      </g>

      <defs>
        <clipPath id={`clip-${uniqueId}`}>
          <rect width={width} height={height} />
        </clipPath>
      </defs>
    </svg>
  );
}
