import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import ScoreEngineHero from "./ScoreEngineHero";

interface ScoreEngineContainerScrollProps {
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
}

export function ScoreEngineContainerScroll({ onOpenLogin, onOpenSignup }: ScoreEngineContainerScrollProps) {
  return (
    <div className="flex flex-col overflow-visible bg-black relative">
      <ContainerScroll>
        {/* Render ScoreZero AI Engine Hero inside the 3D Scroll Card */}
        <div className="w-full h-full min-h-full overflow-y-auto no-scrollbar relative bg-black flex flex-col justify-start">
          <ScoreEngineHero inPortfolio={true} onOpenLogin={onOpenLogin} onOpenSignup={onOpenSignup} />
        </div>
      </ContainerScroll>
    </div>
  );
}

export default ScoreEngineContainerScroll;
