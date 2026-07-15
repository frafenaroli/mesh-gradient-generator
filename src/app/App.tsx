import { Toaster } from './components/ui/sonner';
import { MeshGradientGenerator } from './components/MeshGradientGenerator';

export default function App() {
  return (
    <div className="min-h-screen bg-[#f7f7f8] px-6 pt-12 pb-16">
      <MeshGradientGenerator />
      <Toaster />
    </div>
  );
}
