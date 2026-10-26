"use client";

import { useState, useEffect } from "react";

/**
 * useIsPhone detects client mobile/phone environment via:
 * 1. Mobile User-Agent matching (iOS, Android, etc.)
 * 2. Touch capability
 * 3. Viewport width check (<= 768px)
 * 4. Syncs the '.is-phone' class on document.documentElement for phone-only CSS
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
    return (isMobileUA && window.innerWidth <= 768) || window.innerWidth <= 768;
  });

  useEffect(() => {
    const checkPhone = () => {
      const ua = navigator.userAgent || "";
      const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
      const isNarrowScreen = window.innerWidth <= 768;
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

      const phoneDetected = (isMobileUA && isNarrowScreen) || (isNarrowScreen && (hasTouch || window.matchMedia("(max-width: 768px)").matches));

      setIsPhone(phoneDetected);

      if (phoneDetected) {
        document.documentElement.classList.add("is-phone");
      } else {
        document.documentElement.classList.remove("is-phone");
      }
    };

    checkPhone();

    window.addEventListener("resize", checkPhone);
    window.addEventListener("orientationchange", checkPhone);

    const mql = window.matchMedia("(max-width: 768px)");
    if (mql.addEventListener) {
      mql.addEventListener("change", checkPhone);
    }

    return () => {
      window.removeEventListener("resize", checkPhone);
      window.removeEventListener("orientationchange", checkPhone);
      if (mql.removeEventListener) {
        mql.removeEventListener("change", checkPhone);
      }
    };
  }, []);

  return isPhone;
}
