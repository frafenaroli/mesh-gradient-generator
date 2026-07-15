export interface MeshPoint {
  x: number;
  y: number;
  color: string;
  blurAmount?: number;
  size?: number;
  shapeData?: string;
  shapeType?: 'circle' | 'ellipse' | 'path';
  shapeAttrs?: Record<string, any>;
}

export interface MeshTemplate {
  name: string;
  description: string;
  getPoints: (colors: string[]) => MeshPoint[];
}

// Generate random mesh points
export function generateRandomMesh(colors: string[]): MeshPoint[] {
  const points: MeshPoint[] = [];
  
  colors.forEach((color) => {
    points.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      color,
    });
  });
  
  return points;
}

// Mesh templates
export const meshTemplates: MeshTemplate[] = [
  {
    name: 'Grid',
    description: 'Evenly distributed grid pattern',
    getPoints: (colors: string[]) => {
      const points: MeshPoint[] = [];
      const cols = Math.ceil(Math.sqrt(colors.length));
      const rows = Math.ceil(colors.length / cols);
      
      colors.forEach((color, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        points.push({
          x: (col / (cols - 1)) * 100 || 50,
          y: (row / (rows - 1)) * 100 || 50,
          color,
        });
      });
      
      return points;
    },
  },
  {
    name: 'Diagonal',
    description: 'Colors arranged diagonally',
    getPoints: (colors: string[]) => {
      return colors.map((color, i) => {
        const progress = i / (colors.length - 1);
        return {
          x: progress * 100,
          y: progress * 100,
          color,
        };
      });
    },
  },
  {
    name: 'Radial',
    description: 'Colors radiating from center',
    getPoints: (colors: string[]) => {
      return colors.map((color, i) => {
        const angle = (i / colors.length) * Math.PI * 2;
        const radius = 40;
        return {
          x: 50 + Math.cos(angle) * radius,
          y: 50 + Math.sin(angle) * radius,
          color,
        };
      });
    },
  },
  {
    name: 'Corners',
    description: 'Colors placed in corners and edges',
    getPoints: (colors: string[]) => {
      const positions = [
        { x: 0, y: 0 },     // top-left
        { x: 100, y: 0 },   // top-right
        { x: 100, y: 100 }, // bottom-right
        { x: 0, y: 100 },   // bottom-left
        { x: 50, y: 0 },    // top-center
        { x: 100, y: 50 },  // right-center
        { x: 50, y: 100 },  // bottom-center
        { x: 0, y: 50 },    // left-center
      ];
      
      return colors.map((color, i) => ({
        ...positions[i % positions.length],
        color,
      }));
    },
  },
  {
    name: 'Wave',
    description: 'Flowing wave pattern',
    getPoints: (colors: string[]) => {
      return colors.map((color, i) => {
        const progress = i / (colors.length - 1);
        const x = progress * 100;
        const y = 50 + Math.sin(progress * Math.PI * 2) * 30;
        return { x, y, color };
      });
    },
  },
  {
    name: 'Spiral',
    description: 'Spiral arrangement from center',
    getPoints: (colors: string[]) => {
      return colors.map((color, i) => {
        const progress = i / colors.length;
        const angle = progress * Math.PI * 4;
        const radius = progress * 45;
        return {
          x: 50 + Math.cos(angle) * radius,
          y: 50 + Math.sin(angle) * radius,
          color,
        };
      });
    },
  },
];

// Convert RGB array to hex
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Generate random color
export function generateRandomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}
