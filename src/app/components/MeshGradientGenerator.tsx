import { useState } from 'react';
import { Shuffle, Copy, Download, Sparkles, Layers } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { ColorPicker } from './ColorPicker';
import { ImageColorExtractor } from './ImageColorExtractor';
import { MeshGradient } from './MeshGradient';
import { SVGTemplateUploader } from './SVGTemplateUploader';
import { 
  generateRandomMesh, 
  meshTemplates, 
  MeshPoint,
  generateRandomColor 
} from './mesh-utils';

export function MeshGradientGenerator() {
  const [colors, setColors] = useState<string[]>([
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
  ]);
  const [meshPoints, setMeshPoints] = useState<MeshPoint[]>(() =>
    generateRandomMesh(colors)
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>('random');
  const [customTemplateStructure, setCustomTemplateStructure] = useState<Array<{
    x: number;
    y: number;
    blurAmount?: number;
    shapeData?: string;
    shapeType?: 'circle' | 'ellipse' | 'path';
    shapeAttrs?: Record<string, any>;
  }> | null>(null);

  const handleGenerateRandom = () => {
    setMeshPoints(generateRandomMesh(colors));
    setSelectedTemplate('random');
    setCustomTemplateStructure(null);
    toast.success('Generated random mesh gradient');
  };

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName);
    setCustomTemplateStructure(null);

    if (templateName === 'random') {
      setMeshPoints(generateRandomMesh(colors));
    } else if (templateName === 'custom') {
      // Don't change anything, keep custom template
      return;
    } else {
      const template = meshTemplates.find(t => t.name === templateName);
      if (template) {
        setMeshPoints(template.getPoints(colors));
        toast.success(`Applied ${template.name} template`);
      }
    }
  };

  const handleRandomizeColors = () => {
    const newColors = colors.map(() => generateRandomColor());
    setColors(newColors);

    // ALWAYS preserve structure, just swap colors
    if (customTemplateStructure) {
      // Apply new colors to custom template structure, preserving blur and shape data
      const newPoints = customTemplateStructure.map((pos, index) => ({
        x: pos.x,
        y: pos.y,
        color: newColors[index % newColors.length],
        blurAmount: pos.blurAmount,
        shapeData: pos.shapeData,
        shapeType: pos.shapeType,
        shapeAttrs: pos.shapeAttrs,
      }));
      setMeshPoints(newPoints);
    } else {
      // For any template (including random), preserve existing structure by updating colors only
      const newPoints = meshPoints.map((point, index) => ({
        ...point,
        color: newColors[index % newColors.length],
      }));
      setMeshPoints(newPoints);
    }

    toast.success('Randomized colors');
  };

  const handleColorsChange = (newColors: string[]) => {
    setColors(newColors);

    // ALWAYS preserve structure, just update colors
    if (customTemplateStructure) {
      // Apply new colors to custom template structure, preserving blur and shape data
      const newPoints = customTemplateStructure.map((pos, index) => ({
        x: pos.x,
        y: pos.y,
        color: newColors[index % newColors.length],
        blurAmount: pos.blurAmount,
        shapeData: pos.shapeData,
        shapeType: pos.shapeType,
        shapeAttrs: pos.shapeAttrs,
      }));
      setMeshPoints(newPoints);
    } else {
      // For any template, preserve existing structure by updating colors only
      const newPoints = meshPoints.map((point, index) => ({
        ...point,
        color: newColors[index % newColors.length],
      }));
      setMeshPoints(newPoints);
    }
  };

  const handleColorsExtracted = (extractedColors: string[]) => {
    setColors(extractedColors);

    // ALWAYS preserve structure, just update colors
    if (customTemplateStructure) {
      // Apply new colors to custom template structure, preserving blur and shape data
      const newPoints = customTemplateStructure.map((pos, index) => ({
        x: pos.x,
        y: pos.y,
        color: extractedColors[index % extractedColors.length],
        blurAmount: pos.blurAmount,
        shapeData: pos.shapeData,
      }));
      setMeshPoints(newPoints);
    } else {
      // For any template, preserve existing structure by updating colors only
      const newPoints = meshPoints.map((point, index) => ({
        ...point,
        color: extractedColors[index % extractedColors.length],
      }));
      setMeshPoints(newPoints);
    }

    toast.success(`Extracted ${extractedColors.length} colors from image`);
  };

  const handleTemplateLoaded = (points: MeshPoint[], extractedColorCount: number) => {
    if (!points || points.length === 0 || extractedColorCount === 0) {
      toast.error('No valid gradient elements found in SVG');
      return;
    }

    // Adjust colors to match the number of gradients in the uploaded SVG
    const adjustedColors = colors.slice(0, extractedColorCount);
    if (adjustedColors.length < extractedColorCount) {
      // Need more colors, add some
      while (adjustedColors.length < extractedColorCount) {
        adjustedColors.push(generateRandomColor());
      }
    }
    setColors(adjustedColors);

    setMeshPoints(points);
    setSelectedTemplate('custom');
    // Store the structure (positions, blur, shape type and attributes) separately
    setCustomTemplateStructure(points.map(p => ({
      x: p.x,
      y: p.y,
      blurAmount: p.blurAmount,
      shapeData: p.shapeData,
      shapeType: p.shapeType,
      shapeAttrs: p.shapeAttrs
    })));
  };

  const handleTemplateClear = () => {
    setCustomTemplateStructure(null);
    setSelectedTemplate('random');
    setMeshPoints(generateRandomMesh(colors));
  };

  const handleCopySVG = async () => {
    const svgElement = document.querySelector('.mesh-gradient-preview svg');
    if (svgElement) {
      // Clone the SVG to clean it up
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // Remove all data attributes that are Figma/React specific
      const allElements = clonedSvg.querySelectorAll('*');
      allElements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('data-')) {
            el.removeAttribute(attr.name);
          }
        });
      });

      const svgString = new XMLSerializer().serializeToString(clonedSvg);

      // Try modern Clipboard API first, fallback to textarea method
      try {
        await navigator.clipboard.writeText(svgString);
        toast.success('SVG copied to clipboard');
      } catch (error) {
        // Fallback for environments where Clipboard API is blocked
        const textarea = document.createElement('textarea');
        textarea.value = svgString;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          toast.success('SVG copied to clipboard');
        } catch (err) {
          toast.error('Failed to copy SVG. Please try downloading instead.');
        }
        document.body.removeChild(textarea);
      }
    }
  };

  const handleDownload = () => {
    const svgElement = document.querySelector('.mesh-gradient-preview svg');
    if (svgElement) {
      // Clone the SVG to clean it up
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // Remove all data attributes that are Figma/React specific
      const allElements = clonedSvg.querySelectorAll('*');
      allElements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('data-')) {
            el.removeAttribute(attr.name);
          }
        });
      });

      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mesh-gradient.svg';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded mesh gradient');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-3 flex gap-3 items-start">
        <div className="flex-shrink-0 mt-1">
          <Layers className="size-8 text-accent-foreground" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="mb-1 font-bold text-2xl">SVG Mesh Gradient Generator</h1>
          <p className="text-muted-foreground text-sm">
            Create beautiful mesh gradients with 3-8 colors using templates or random generation
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Controls Panel */}
        <div className="space-y-3 flex flex-col">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>
                Add colors manually or extract from an image
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ColorPicker
                colors={colors}
                onColorsChange={handleColorsChange}
                minColors={3}
                maxColors={8}
              />

              <Button
                onClick={handleRandomizeColors}
                variant="outline"
                className="w-full h-8 text-xs"
              >
                <Sparkles className="size-3 mr-1" />
                Randomize Colors
              </Button>

              <ImageColorExtractor
                onColorsExtracted={handleColorsExtracted}
                maxColors={8}
              />
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardHeader>
              <CardTitle>Gradient Template</CardTitle>
              <CardDescription>
                Choose a pattern for your mesh gradient
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Template</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger size="sm" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random</SelectItem>
                    {meshTemplates.map((template) => (
                      <SelectItem key={template.name} value={template.name}>
                        {template.name} - {template.description}
                      </SelectItem>
                    ))}
                    {selectedTemplate === 'custom' && (
                      <SelectItem value="custom">Custom SVG Template</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleGenerateRandom} className="w-full h-8 text-xs">
                <Shuffle className="size-3 mr-1" />
                Generate Random
              </Button>

              <SVGTemplateUploader
                onTemplateLoaded={handleTemplateLoaded}
                onTemplateClear={handleTemplateClear}
                colors={colors}
                hasTemplate={selectedTemplate === 'custom'}
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-4 space-y-3 flex flex-col h-fit w-full">
          <Card className="w-full border-0">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Your mesh gradient in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="w-full">
              <div className="mesh-gradient-preview aspect-square rounded-lg overflow-hidden bg-white max-h-[46vh] w-full">
                <MeshGradient points={meshPoints} width={1080} height={1080} />
              </div>
            </CardContent>
          </Card>

          <Card className="w-full border-0">
            <CardHeader>
              <CardTitle>Export</CardTitle>
              <CardDescription>
                Download or copy your gradient
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2 w-full">
              <Button onClick={handleCopySVG} variant="outline" className="flex-1 h-8 text-xs">
                <Copy className="size-3 mr-1" />
                Copy SVG
              </Button>
              <Button onClick={handleDownload} variant="outline" className="flex-1 h-8 text-xs">
                <Download className="size-3 mr-1" />
                Download
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
