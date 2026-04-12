"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ThemeToggleWrapper() {
  const pathname = usePathname();
  const isChatPage = pathname === "/chat";

  if (isChatPage) {
    return null;
  }

  return <ThemeToggle />;
}
