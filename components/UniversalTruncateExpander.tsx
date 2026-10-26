"use client";

import { useEffect } from "react";

/**
 * UniversalTruncateExpander enables one-click expansion on ANY truncated ("...")
 * text, line-clamped description, or overflow-shortened element across the site.
 */
export function UniversalTruncateExpander() {
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Find closest truncated or line-clamped element or element with data-expandable
      const expandableEl = target.closest(
        ".truncate, [class*='line-clamp-'], [data-expandable='true']"
      ) as HTMLElement | null;

      if (!expandableEl) return;

      // Don't hijack raw action buttons or form inputs
      if (
        expandableEl.tagName === "BUTTON" ||
        expandableEl.tagName === "INPUT" ||
        expandableEl.tagName === "SELECT" ||
        expandableEl.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Check if this truncated element is inside a link or action
      const parentLink = expandableEl.closest("a");

      // Toggle expansion
      const isExpanded =
        expandableEl.classList.contains("is-expanded") ||
        expandableEl.getAttribute("data-expanded") === "true";

      if (isExpanded) {
        expandableEl.classList.remove("is-expanded");
        expandableEl.removeAttribute("data-expanded");
      } else {
        // Prevent accidental link navigation when clicking truncated text inside a link card
        if (parentLink) {
          e.preventDefault();
          e.stopPropagation();
        }
        expandableEl.classList.add("is-expanded");
        expandableEl.setAttribute("data-expanded", "true");
      }
    };

    // Auto-add tooltip to truncated elements on mouseenter
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest(
        ".truncate, [class*='line-clamp-'], [data-expandable='true']"
      ) as HTMLElement | null;
      if (el && !el.getAttribute("title")) {
        // If element is actually overflowing or clamped
        if (
          el.scrollWidth > el.clientWidth ||
          el.scrollHeight > el.clientHeight ||
          el.textContent?.includes("...")
        ) {
          el.setAttribute("title", "Click ... to expand / collapse full text");
        }
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    document.addEventListener("mouseover", handleMouseOver, { passive: true });

    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return null;
}
