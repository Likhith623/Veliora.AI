import FlickeringGrid from "@/components/ui/flickering-grid";

export function FlickeringGridRoundedDemo() {
  return (
    <div className="relative ">
      <FlickeringGrid
        className="z-0 relative inset-0 [mask-image:radial-gradient(850px_circle_at_center,white,transparent)] h-screen w-screen"
        squareSize={4}
        gridGap={6}
        color="#673ee580"
        maxOpacity={0.8}
        flickerChance={0.1}
        flickerSpeed={0.5}
      />
    </div>
  );
}
