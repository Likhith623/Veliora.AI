import React from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import { IconUser, IconRobot, IconNotebook, IconBrain } from "@tabler/icons-react";
import Profile from "./screens/Profile";
import AddBot from "./screens/AddBot";
import History from "@/app/chat-history/page";
import DashboardPage from "@/app/dashboard/page";

export function FloatingDockDemo() {
  const links = [
    // {
    //   title: "Chat",
    //   icon: (
    //     <IconBrandLine className="h-full w-full text-neutral-500 dark:text-neutral-300" />
    //   ),
    //   href: "#",
    //   action : "chat",
    //   component : <Chat/>
    // },

    {
      title: "Add Friends",
      icon: (
        <IconRobot className="h-full w-full text-black/80 dark:text-black/80" />
      ),
      href: "/details",
      action: "add",
      component: <AddBot />,
    },
    {
      title: "Go to chat history",
      icon: (
        <IconNotebook className="h-full w-full text-black/80 dark:text-black/80" />
      ),
      href: "/chat-history", //render chat-history
      action: "profile",
      component: <History />,
    },
    {
      title: "Mental Health",
      icon: (
        <IconBrain className="h-full w-full text-black/80 dark:text-black/80" />
      ),
      href: "/dashboard",
      action: "dashboard",
      component: <DashboardPage />,
    },
    {
      title: "Profile",
      icon: (
        <IconUser className="h-full w-full text-black/80 dark:text-black/80" />
      ),
      href: "#",
      action: "profile",
      component: <Profile />,
    },
  ];
  return (
    <div className="flex items-center justify-center mt-4">
      <FloatingDock
        // only for demo, remove for production
        // mobileClassName="translate-y-20"
        items={links}
      />
    </div>
  );
}
