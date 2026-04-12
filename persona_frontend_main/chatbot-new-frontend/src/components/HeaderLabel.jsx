import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import AnimatedGradientText from "@/components/ui/animated-gradient-text";

export function HeaderLabel() {
  return (
    <div className="relative z-10 flex flex-wrap items-center justify-center p-2 md:p-4">
      <AnimatedGradientText className="relative z-20 bg-black p-2 md:p-4 rounded-full">
        🎉 <hr className="mx-2 h-4 w-px shrink-0 bg-purple-600 hidden sm:block" />{" "}
        <span
          className={cn(
            `inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent font-bold text-sm sm:text-base md:text-lg`
          )}
        >
          Introducing new spiritual companions: Krishna 
        </span>
        <ChevronRight className="ml-1 text-purple-900 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
      </AnimatedGradientText>
    </div>
  );
}



