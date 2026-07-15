import { Toaster } from './components/ui/sonner';
import { MeshGradientGenerator } from './components/MeshGradientGenerator';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <MeshGradientGenerator />
      <Toaster />
    </div>
  );
}
