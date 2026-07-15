import { useState, useRef } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { rgbToHex } from './mesh-utils';

interface ImageColorExtractorProps {
  onColorsExtracted: (colors: string[]) => void;
  maxColors: number;
}

export function ImageColorExtractor({ onColorsExtracted, maxColors }: ImageColorExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractColors = async (file: File) => {
    setIsExtracting(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        // Create a canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setIsExtracting(false);
          return;
        }
        
        // Set canvas size
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        
        // Draw image
        ctx.drawImage(img, 0, 0, size, size);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;
        
        // Simple color extraction using k-means-like approach
        const colors = extractDominantColors(pixels, maxColors);
        
        onColorsExtracted(colors);
        setIsExtracting(false);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  };

  const extractDominantColors = (pixels: Uint8ClampedArray, count: number): string[] => {
    // Sample pixels (every 10th pixel to speed up processing)
    const sampledColors: Array<[number, number, number]> = [];

    for (let i = 0; i < pixels.length; i += 40) { // RGBA, so we skip by 4, and sample every 10th
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Skip transparent pixels and very dark/light pixels
      if (a > 128 && (r + g + b) > 50 && (r + g + b) < 700) {
        sampledColors.push([r, g, b]);
      }
    }

    // Helper to calculate color saturation
    const getSaturation = (r: number, g: number, b: number) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return max === 0 ? 0 : (max - min) / max;
    };

    // Helper to boost saturation slightly for more vibrant colors
    const boostSaturation = (r: number, g: number, b: number, boost: number = 0.2) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);

      if (max === min) return [r, g, b]; // Gray, no saturation to boost

      const l = (max + min) / 2;
      const s = max === 0 ? 0 : (max - min) / max;

      // Boost saturation
      const newS = Math.min(1, s + boost);

      // Convert back to RGB
      const chroma = (1 - Math.abs(2 * l / 255 - 1)) * newS * 255;
      const x = chroma * (1 - Math.abs(((max === r ? (g - b) / (max - min) : max === g ? 2 + (b - r) / (max - min) : 4 + (r - g) / (max - min))) % 2) - 1);
      const m = l - chroma / 2;

      // Simple saturation boost by moving away from gray
      const gray = (r + g + b) / 3;
      const newR = Math.round(Math.min(255, r + (r - gray) * boost));
      const newG = Math.round(Math.min(255, g + (g - gray) * boost));
      const newB = Math.round(Math.min(255, b + (b - gray) * boost));

      return [
        Math.max(0, Math.min(255, newR)),
        Math.max(0, Math.min(255, newG)),
        Math.max(0, Math.min(255, newB))
      ];
    };

    // Simple clustering - divide color space and find most represented colors
    const colorBuckets = new Map<string, { colors: Array<[number, number, number]>; count: number }>();

    sampledColors.forEach(([r, g, b]) => {
      // Bucket colors by reducing precision (groups of 32)
      const bucketR = Math.floor(r / 32) * 32;
      const bucketG = Math.floor(g / 32) * 32;
      const bucketB = Math.floor(b / 32) * 32;
      const key = `${bucketR},${bucketG},${bucketB}`;

      if (!colorBuckets.has(key)) {
        colorBuckets.set(key, { colors: [], count: 0 });
      }
      const bucket = colorBuckets.get(key)!;
      bucket.colors.push([r, g, b]);
      bucket.count++;
    });

    // Helper to calculate color distance
    const colorDistance = (c1: [number, number, number], c2: [number, number, number]) => {
      const [r1, g1, b1] = c1;
      const [r2, g2, b2] = c2;
      return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
    };

    // Sort by frequency
    const sortedBuckets = Array.from(colorBuckets.values())
      .sort((a, b) => b.count - a.count);

    // Select diverse colors by ensuring minimum distance between them
    const selectedColors: Array<[number, number, number]> = [];
    const minDistance = 80; // Minimum color distance threshold for distinct colors

    for (const bucket of sortedBuckets) {
      if (selectedColors.length >= count) break;

      // Pick the most saturated color from this bucket
      let mostVibrant = bucket.colors[0];
      let maxSaturation = getSaturation(...mostVibrant);

      bucket.colors.forEach(color => {
        const sat = getSaturation(...color);
        if (sat > maxSaturation) {
          maxSaturation = sat;
          mostVibrant = color;
        }
      });

      // Check if this color is sufficiently different from already selected colors
      const isDifferent = selectedColors.length === 0 ||
        selectedColors.every(selected => colorDistance(selected, mostVibrant) >= minDistance);

      if (isDifferent) {
        selectedColors.push(mostVibrant);
      }
    }

    // Apply saturation boost and convert to hex
    const result = selectedColors.map(color => {
      const boosted = boostSaturation(...color, 0.15);
      return rgbToHex(...boosted);
    });

    // If we don't have enough colors, add some variations
    const usedColors = new Set(result);
    while (result.length < count && selectedColors.length > 0) {
      const baseIndex = result.length % selectedColors.length;
      const baseColor = selectedColors[baseIndex];
      const brightnessAdjustments = [30, -30, 50, -50, 70, -70];

      let variation = null;
      for (const adjustment of brightnessAdjustments) {
        const candidate = adjustColorBrightness(rgbToHex(...baseColor), adjustment);
        if (!usedColors.has(candidate)) {
          variation = candidate;
          break;
        }
      }

      if (!variation) {
        variation = generateRandomColor();
        let attempts = 0;
        while (usedColors.has(variation) && attempts < 10) {
          variation = generateRandomColor();
          attempts++;
        }
      }

      usedColors.add(variation);
      result.push(variation);
    }

    return result.slice(0, count);
  };

  const adjustColorBrightness = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return rgbToHex(r, g, b);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setFileName(file.name);
      extractColors(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearImage = () => {
    setFileName('');
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        Extract from Image
      </Label>
      <p className="text-[13px] text-muted-foreground leading-tight">
        Upload an image to extract its color palette
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!fileName ? (
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isExtracting}
          variant="outline"
          className="w-full h-9 text-[13px]"
        >
          {isExtracting ? (
            <>
              <Loader2 className="size-3.5 mr-1 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Upload className="size-3.5 mr-1" />
              Upload Image
            </>
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 px-3 py-2 rounded-md border border-border bg-muted text-[13px] truncate">
            {fileName}
          </div>
          <Button
            onClick={handleClearImage}
            variant="outline"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
