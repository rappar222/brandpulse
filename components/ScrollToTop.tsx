"use client";

import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { useIsPhone } from "@/lib/useIsPhone";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const isPhone = useIsPhone();

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 320) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    toggleVisibility();

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`fixed ${
        isPhone
          ? "bottom-16 right-3 w-10 h-10 shadow-md"
          : "bottom-20 right-5 w-11 h-11 shadow-xl hover:scale-110"
      } z-40 rounded-full flex items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-indigo-500/40 hover:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 active:scale-90 transition-all duration-200 animate-fadeIn group`}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <ArrowUp className={`${isPhone ? "w-4 h-4" : "w-5 h-5"} group-hover:-translate-y-0.5 transition-transform`} />
    </button>
  );
}
