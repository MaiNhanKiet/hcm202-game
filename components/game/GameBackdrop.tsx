"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function GameBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden text-foreground">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,#f3b56a_0%,#f7d7a4_18%,#b9e0f4_42%,#1f7a88_42.2%,#0c4554_72%,#061820_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-[38%] h-16 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.45),transparent_72%)]"
      />
      <motion.div
        aria-hidden
        className="absolute top-[8%] left-[8%] h-16 w-28 rounded-full bg-white/45 blur-[1px]"
        animate={{ x: [0, 18, 0], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute top-[14%] right-[14%] h-12 w-40 rounded-full bg-white/35"
        animate={{ x: [0, -22, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        aria-hidden
        className="absolute top-[36%] left-0 h-8 w-36 bg-[#6b3f22] shadow-[0_8px_0_#4d2b16]"
      />
      <div
        aria-hidden
        className="absolute top-[34%] left-3 h-10 w-3 rounded-sm bg-[#8a542c]"
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[18%] left-[18%] h-3 w-10 rounded-full bg-[#3aa6d8]/55"
        animate={{ x: [0, 40, 0], y: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[12%] right-[22%] h-3 w-12 rounded-full bg-[#c48ad9]/45"
        animate={{ x: [0, -36, 0], y: [0, 8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.18),transparent_45%)]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
