import { Upload, X } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { MeshPoint } from './mesh-utils';
import { useRef, useState } from 'react';

interface SVGTemplateUploaderProps {
  onTemplateLoaded: (points: MeshPoint[], extractedColorCount: number) => void;
  onTemplateClear: () => void;
  colors: string[];
  hasTemplate: boolean;
}

export function SVGTemplateUploader({ onTemplateLoaded, onTemplateClear, colors, hasTemplate }: SVGTemplateUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');

  const parseSVGToMeshPoints = (svgContent: string, userColors: string[]): MeshPoint[] => {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = svgDoc.querySelector('svg');

    if (!svg) {
      throw new Error('Invalid SVG file');
    }

    // Get viewBox or width/height to normalize coordinates
    const viewBox = svg.getAttribute('viewBox');
    let width = 1080;
    let height = 1080;

    if (viewBox) {
      const [, , w, h] = viewBox.split(' ').map(Number);
      width = w;
      height = h;
    } else {
      width = Number(svg.getAttribute('width')) || 1080;
      height = Number(svg.getAttribute('height')) || 1080;
    }

    const points: MeshPoint[] = [];

    // Extract filter blur amounts
    const filters = svgDoc.querySelectorAll('filter');
    const blurAmounts: number[] = [];
    filters.forEach(filter => {
      const blur = filter.querySelector('feGaussianBlur');
      if (blur) {
        const stdDev = blur.getAttribute('stdDeviation');
        blurAmounts.push(Number(stdDev) || 100);
      }
    });

    // Look for groups with filters (the actual gradient blobs)
    const groups = svgDoc.querySelectorAll('g[filter]');

    groups.forEach((group, index) => {
      if (index >= userColors.length) return;

      const pathEl = group.querySelector('path, circle, ellipse');
      if (!pathEl) return;

      let x = 50;
      let y = 50;
      const shapeAttrs: Record<string, any> = {};
      let shapeType: 'circle' | 'ellipse' | 'path' = 'path';

      // Extract ALL attributes from the shape element
      Array.from(pathEl.attributes).forEach(attr => {
        if (attr.name !== 'fill') { // Don't copy fill, we'll replace it
          shapeAttrs[attr.name] = attr.value;
        }
      });

      // Extract position based on element type
      if (pathEl.tagName === 'circle') {
        shapeType = 'circle';
        const cx = Number(pathEl.getAttribute('cx')) || 0;
        const cy = Number(pathEl.getAttribute('cy')) || 0;
        x = (cx / width) * 100;
        y = (cy / height) * 100;
      } else if (pathEl.tagName === 'ellipse') {
        shapeType = 'ellipse';
        const cx = Number(pathEl.getAttribute('cx')) || 0;
        const cy = Number(pathEl.getAttribute('cy')) || 0;
        x = (cx / width) * 100;
        y = (cy / height) * 100;
      } else if (pathEl.tagName === 'path') {
        shapeType = 'path';
        const d = pathEl.getAttribute('d') || '';
        // Try to extract first coordinate from path for positioning
        const match = d.match(/M?\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
        if (match) {
          x = (Number(match[1]) / width) * 100;
          y = (Number(match[2]) / height) * 100;
        }
      }

      // Clamp values to 0-100
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));

      points.push({
        x,
        y,
        color: userColors[index] || userColors[0],
        blurAmount: blurAmounts[index] || 100,
        shapeType,
        shapeAttrs,
      });
    });

    // Fallback: if no groups found, try direct paths/circles/ellipses
    if (points.length === 0) {
      const elements = svgDoc.querySelectorAll('path, circle, ellipse, rect');

      elements.forEach((el, index) => {
        if (index >= userColors.length) return;

        let x = 50;
        let y = 50;

        // Extract position based on element type
        if (el.tagName === 'circle' || el.tagName === 'ellipse') {
          const cx = Number(el.getAttribute('cx')) || 0;
          const cy = Number(el.getAttribute('cy')) || 0;
          x = (cx / width) * 100;
          y = (cy / height) * 100;
        } else if (el.tagName === 'rect') {
          const rx = Number(el.getAttribute('x')) || 0;
          const ry = Number(el.getAttribute('y')) || 0;
          const rw = Number(el.getAttribute('width')) || 0;
          const rh = Number(el.getAttribute('height')) || 0;
          x = ((rx + rw / 2) / width) * 100;
          y = ((ry + rh / 2) / height) * 100;
        } else if (el.tagName === 'path') {
          // Try to extract first coordinate from path
          const d = el.getAttribute('d') || '';
          const match = d.match(/M?\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
          if (match) {
            x = (Number(match[1]) / width) * 100;
            y = (Number(match[2]) / height) * 100;
          }
        }

        // Clamp values to 0-100
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));

        points.push({
          x,
          y,
          color: userColors[index] || userColors[0],
        });
      });
    }

    // Don't add extra points - return only what we found in the SVG
    // The calling code will adjust colors to match
    console.log('Extracted points:', points);
    console.log('Total points with shapes:', points.filter(p => p.shapeType).length);
    return points;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.svg')) {
      toast.error('Please upload a valid SVG file');
      return;
    }

    try {
      const content = await file.text();
      const points = parseSVGToMeshPoints(content, colors);

      if (points.length === 0) {
        toast.error('No gradient elements found in SVG. Please upload an SVG with gradient paths or shapes.');
        return;
      }

      // Tell the parent how many gradient elements we actually found
      const extractedCount = points.filter(p => p.shapeData || p.blurAmount).length;

      if (extractedCount === 0) {
        toast.error('No gradient elements found in SVG. Please upload an SVG with gradient paths or shapes.');
        return;
      }

      onTemplateLoaded(points, extractedCount);
      setFileName(file.name);
      toast.success(`SVG template loaded with ${extractedCount} gradient${extractedCount !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error parsing SVG:', error);
      toast.error('Failed to parse SVG file');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearTemplate = () => {
    setFileName('');
    onTemplateClear();
    toast.success('Custom template cleared');
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Upload SVG Template</Label>
      <p className="text-xs text-muted-foreground">
        Upload an existing SVG to use its structure with your colors
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg"
        onChange={handleFileUpload}
        className="hidden"
        id="svg-upload"
      />
      {!hasTemplate ? (
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full h-8 text-xs"
        >
          <Upload className="size-3 mr-1" />
          Upload SVG Template
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-2 py-1.5 rounded-md border border-input bg-muted text-xs truncate">
            {fileName || 'Custom template loaded'}
          </div>
          <Button
            onClick={handleClearTemplate}
            variant="outline"
            size="icon"
            className="h-8 w-8"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
