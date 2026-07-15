import { X, Plus, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useRef } from 'react';

interface ColorPickerProps {
  colors: string[];
  onColorsChange: (colors: string[]) => void;
  minColors?: number;
  maxColors?: number;
}

export function ColorPicker({ 
  colors, 
  onColorsChange, 
  minColors = 3, 
  maxColors = 8 
}: ColorPickerProps) {
  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    onColorsChange(newColors);
  };

  const handleRemoveColor = (index: number) => {
    if (colors.length > minColors) {
      const newColors = colors.filter((_, i) => i !== index);
      onColorsChange(newColors);
    }
  };

  const handleAddColor = () => {
    if (colors.length < maxColors) {
      onColorsChange([...colors, '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')]);
    }
  };

  const moveColor = (fromIndex: number, toIndex: number) => {
    const newColors = [...colors];
    const [movedColor] = newColors.splice(fromIndex, 1);
    newColors.splice(toIndex, 0, movedColor);
    onColorsChange(newColors);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Colors ({colors.length}/{maxColors})</Label>
        <Button
          onClick={handleAddColor}
          disabled={colors.length >= maxColors}
          size="sm"
          variant="outline"
          className="h-8 text-xs"
        >
          <Plus className="size-3 mr-1" />
          Add Color
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {colors.map((color, index) => (
          <ColorItem
            key={index}
            color={color}
            index={index}
            moveColor={moveColor}
            handleColorChange={handleColorChange}
            handleRemoveColor={handleRemoveColor}
            canRemove={colors.length > minColors}
          />
        ))}
      </div>
    </div>
    </DndProvider>
  );
}

interface ColorItemProps {
  color: string;
  index: number;
  moveColor: (fromIndex: number, toIndex: number) => void;
  handleColorChange: (index: number, newColor: string) => void;
  handleRemoveColor: (index: number) => void;
  canRemove: boolean;
}

const ColorItem = ({ color, index, moveColor, handleColorChange, handleRemoveColor, canRemove }: ColorItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'COLOR',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'COLOR',
    hover: (item: { index: number }) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveColor(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  preview(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center gap-1.5 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div ref={drag} className="cursor-move flex-shrink-0">
        <GripVertical className="size-3 text-muted-foreground" />
      </div>
      <div className="relative flex-shrink-0">
        <input
          type="color"
          value={color}
          onChange={(e) => handleColorChange(index, e.target.value)}
          className="w-8 h-8 rounded-md cursor-pointer border-2 border-input"
          style={{
            padding: 0,
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none'
          }}
        />
      </div>
      <input
        type="text"
        value={color}
        onChange={(e) => handleColorChange(index, e.target.value)}
        className="flex-1 min-w-0 h-8 px-2 rounded-md border border-input bg-background text-xs"
        placeholder="#000000"
      />
      <Button
        onClick={() => handleRemoveColor(index)}
        disabled={!canRemove}
        size="icon"
        variant="ghost"
        className="flex-shrink-0 h-8 w-8"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
