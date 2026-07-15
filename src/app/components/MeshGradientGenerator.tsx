import { useState } from 'react';
import { RefreshCw, Copy, Download, Sparkles, Layers } from 'lucide-react';
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
    <div className="max-w-[1180px] mx-auto">
      <div className="flex gap-4 items-center pb-3 mb-3 border-b border-black/[0.08]">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#4ECDC4] to-[#FF6B6B] shadow-sm flex items-center justify-center">
          <Layers className="size-6 text-white" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="mb-1.5 text-3xl font-bold tracking-[-0.01em] text-foreground">
            SVG Mesh Gradient Generator
          </h1>
          <p className="text-[15px] text-muted-foreground leading-normal">
            Create beautiful mesh gradients with 3–8 colors using templates or random generation
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Controls Panel */}
        <div className="flex flex-col gap-2.5 min-w-0">
          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 gap-3">
            <CardHeader className="p-0">
              <CardTitle className="text-[17px] font-semibold leading-tight">Color Palette</CardTitle>
              <CardDescription className="text-[13px]">
                Add colors manually or extract from an image
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-2.5">
              <ColorPicker
                colors={colors}
                onColorsChange={handleColorsChange}
                minColors={3}
                maxColors={8}
              />

              <Button
                onClick={handleRandomizeColors}
                variant="outline"
                className="w-full h-8 text-[13px]"
              >
                <Sparkles className="size-3.5 mr-1" />
                Randomize Colors
              </Button>

              <ImageColorExtractor
                onColorsExtracted={handleColorsExtracted}
                maxColors={8}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 gap-3">
            <CardHeader className="p-0">
              <CardTitle className="text-[17px] font-semibold leading-tight">Gradient Template</CardTitle>
              <CardDescription className="text-[13px]">
                Choose a pattern for your mesh gradient
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Template
                </Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="h-8 text-[13px] bg-background border-border w-full">
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

              <Button onClick={handleGenerateRandom} className="w-full h-8 text-[13px]">
                <RefreshCw className="size-3.5 mr-1" />
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
        <div className="lg:sticky lg:top-6 flex flex-col gap-2.5 h-fit w-full min-w-0">
          <Card className="w-full rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 gap-3">
            <CardHeader className="p-0">
              <CardTitle className="text-[17px] font-semibold leading-tight">Preview</CardTitle>
              <CardDescription className="text-[13px]">
                Your mesh gradient in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 w-full">
              <div className="bg-input-background rounded-xl p-3">
                <div className="mesh-gradient-preview aspect-square rounded-lg overflow-hidden bg-white max-h-[44vh] w-full border border-black/[0.06]">
                  <MeshGradient points={meshPoints} width={1080} height={1080} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 gap-3">
            <CardHeader className="p-0">
              <CardTitle className="text-[17px] font-semibold leading-tight">Export</CardTitle>
              <CardDescription className="text-[13px]">
                Download or copy your gradient
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex gap-2.5 w-full">
              <Button onClick={handleCopySVG} variant="outline" className="flex-1 h-9 text-[13px]">
                <Copy className="size-3.5 mr-1" />
                Copy SVG
              </Button>
              <Button onClick={handleDownload} variant="outline" className="flex-1 h-9 text-[13px]">
                <Download className="size-3.5 mr-1" />
                Download
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
