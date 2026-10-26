"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import { useLanguage } from "@/lib/i18n";
import {
  MessageSquarePlus,
  X,
  Send,
  Pencil,
  Square,
  EyeOff,
  Shield,
  ShieldCheck,
  Undo2,
  Trash2,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Clipboard,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

type ToolType = "pen" | "box";
type CategoryType = "bug" | "feature" | "design" | "other";

interface DrawingAction {
  tool: ToolType;
  color: string;
  lineWidth: number;
  points?: Array<{ x: number; y: number }>;
  rect?: { x: number; y: number; width: number; height: number };
}

interface RedactionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function FeedbackWidget() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<CategoryType>("bug");
  const [userEmail, setUserEmail] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(true);

  // Drawing & Zoom states
  const [baseScreenshotUrl, setBaseScreenshotUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [currentTool, setCurrentTool] = useState<ToolType>("pen");
  const [currentColor, setCurrentColor] = useState<string>("#ef4444"); // Red default
  const [currentLineWidth, setCurrentLineWidth] = useState<number>(3);
  const [actions, setActions] = useState<DrawingAction[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Automated Company Privacy & Redaction states
  const [isRedacted, setIsRedacted] = useState(false);
  const [redactionBoxes, setRedactionBoxes] = useState<RedactionBox[]>([]);
  const candidateRedactionBoxesRef = useRef<RedactionBox[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const widgetButtonRef = useRef<HTMLDivElement | null>(null);

  // Automated redaction: scans company names, domain handles, and search inputs
  const computeRedactionBoxes = useCallback((): RedactionBox[] => {
    if (typeof window === "undefined") return [];

    const canvas = canvasRef.current;
    const pixelRatio = window.devicePixelRatio || 2;
    const captureScale = Math.max(pixelRatio, 2);
    const canvasW = canvas?.width || window.innerWidth * captureScale;
    const canvasH = canvas?.height || window.innerHeight * captureScale;
    const scaleX = canvasW / window.innerWidth;
    const scaleY = canvasH / window.innerHeight;

    const urlParams = new URLSearchParams(window.location.search);
    const q = (urlParams.get("q") || "").trim();
    const searchInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[type="text"], input[type="search"], input:not([type])'
      )
    );
    const inputQueries = searchInputs
      .map((i) => i.value.trim())
      .filter(Boolean);

    // Terms to black out: company name, searched brand, input values
    const termsToRedact = Array.from(
      new Set([q, ...inputQueries].filter((t) => t.length >= 2))
    );

    const boxes: RedactionBox[] = [];

    const addBox = (clientRect: DOMRect, padX = 4, padY = 2) => {
      if (
        clientRect.bottom < 0 ||
        clientRect.top > window.innerHeight ||
        clientRect.right < 0 ||
        clientRect.left > window.innerWidth ||
        clientRect.width === 0 ||
        clientRect.height === 0
      ) {
        return;
      }

      const x = Math.max(0, (clientRect.left - padX) * scaleX);
      const y = Math.max(0, (clientRect.top - padY) * scaleY);
      const width = Math.min(
        canvasW - x,
        (clientRect.width + padX * 2) * scaleX
      );
      const height = Math.min(
        canvasH - y,
        (clientRect.height + padY * 2) * scaleY
      );

      if (width > 2 && height > 2) {
        boxes.push({ x, y, width, height });
      }
    };

    const modalEl = document.getElementById("feedback-modal-container");

    // 1. Redact search input elements
    searchInputs.forEach((input) => {
      if (modalEl && modalEl.contains(input)) return;
      const r = input.getBoundingClientRect();
      addBox(r, 2, 2);
    });

    // 2. Scan text nodes across document.body
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (modalEl && modalEl.contains(node)) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toUpperCase();
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.id === "feedback-floating-button") {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      const text = currentNode.nodeValue || "";

      for (const term of termsToRedact) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Matches the entire word/handle containing the term (e.g. "acme.com", "acme.xyz", "acme")
        const regex = new RegExp(`\\S*${escaped}\\S*`, "gi");
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
          try {
            const range = document.createRange();
            range.setStart(currentNode, match.index);
            range.setEnd(currentNode, match.index + match[0].length);
            const rects = range.getClientRects();
            for (let i = 0; i < rects.length; i++) {
              addBox(rects[i], 4, 3);
            }
          } catch {
            // Ignore range measurement errors
          }
        }
      }

      currentNode = walker.nextNode();
    }

    return boxes;
  }, []);

  const toggleRedactAll = useCallback(() => {
    if (isRedacted) {
      setIsRedacted(false);
      setRedactionBoxes([]);
    } else {
      let boxes = candidateRedactionBoxesRef.current;
      if (!boxes || boxes.length === 0) {
        boxes = computeRedactionBoxes();
      }
      setRedactionBoxes(boxes);
      setIsRedacted(true);
    }
  }, [isRedacted, computeRedactionBoxes]);

  // Robust Screenshot capture of visible viewport
  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    setErrorMessage(null);

    if (widgetButtonRef.current) {
      widgetButtonRef.current.style.display = "none";
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollX = window.scrollX || window.pageXOffset || 0;

      const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;
      const captureScale = Math.max(pixelRatio, 2);

      let dataUrl: string | null = null;

      try {
        const canvas = await html2canvas(document.body, {
          useCORS: true,
          allowTaint: false,
          logging: false,
          x: scrollX,
          y: scrollY,
          width: window.innerWidth,
          height: window.innerHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          scale: captureScale,
          ignoreElements: (el) => {
            return (
              el.id === "feedback-floating-button" ||
              el.tagName === "IFRAME"
            );
          },
        });
        dataUrl = canvas.toDataURL("image/png");
      } catch (firstErr) {
        console.warn("First capture attempt tainted, trying safe fallback mode...", firstErr);
        const safeCanvas = await html2canvas(document.body, {
          useCORS: false,
          allowTaint: false,
          logging: false,
          x: scrollX,
          y: scrollY,
          width: window.innerWidth,
          height: window.innerHeight,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          scale: captureScale,
          ignoreElements: (el) => {
            if (el.id === "feedback-floating-button" || el.tagName === "IFRAME") return true;
            if (el.tagName === "IMG") {
              const src = (el as HTMLImageElement).src || "";
              return !src.startsWith(window.location.origin) && !src.startsWith("data:");
            }
            return false;
          },
        });
        dataUrl = safeCanvas.toDataURL("image/png");
      }

      if (dataUrl) {
        setBaseScreenshotUrl(dataUrl);
        setActions([]);
        try {
          const candidateBoxes = computeRedactionBoxes();
          candidateRedactionBoxesRef.current = candidateBoxes;
        } catch (e) {
          console.warn("Could not precompute redaction boxes", e);
        }
      }
      setIsOpen(true);
    } catch (err: any) {
      console.error("Screenshot error:", err);
      // Fallback: open modal so user can write or paste
      setIsOpen(true);
    } finally {
      if (widgetButtonRef.current) {
        widgetButtonRef.current.style.display = "";
      }
      setIsCapturing(false);
    }
  }, []);

  // Native Display Media Capture (Screen Picker)
  const captureWithDisplayMedia = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
      });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        setBaseScreenshotUrl(dataUrl);
        setActions([]);
      }
    } catch (err) {
      console.warn("Display media capture dismissed or unsupported", err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Support Ctrl+V paste of screenshot anywhere in the modal
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
              const result = loadEvent.target?.result as string;
              if (result) {
                setBaseScreenshotUrl(result);
                setActions([]);
                setIncludeScreenshot(true);
              }
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  // Redraw canvas with background image and all actions
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!baseScreenshotUrl) {
      canvas.width = 800;
      canvas.height = 450;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 800, 450);
      ctx.fillStyle = "#64748b";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Click 'Capture Screen' or paste with Ctrl+V", 400, 225);
      return;
    }

    const img = new Image();
    img.src = baseScreenshotUrl;
    img.onload = () => {
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 700;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Automated Redaction blackout bars
      if (isRedacted && redactionBoxes.length > 0) {
        ctx.save();
        ctx.fillStyle = "#000000";
        redactionBoxes.forEach((rect) => {
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        });
        ctx.restore();
      }

      actions.forEach((action) => {
        ctx.save();
        ctx.strokeStyle = action.color;
        ctx.fillStyle = action.color;
        ctx.lineWidth = action.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (action.tool === "pen" && action.points && action.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(action.points[0].x, action.points[0].y);
          for (let i = 1; i < action.points.length; i++) {
            ctx.lineTo(action.points[i].x, action.points[i].y);
          }
          ctx.stroke();
        } else if (action.tool === "box" && action.rect) {
          ctx.beginPath();
          ctx.strokeRect(action.rect.x, action.rect.y, action.rect.width, action.rect.height);
        }
        ctx.restore();
      });
    };
  }, [baseScreenshotUrl, actions, isRedacted, redactionBoxes]);

  useEffect(() => {
    if (isOpen) {
      redrawCanvas();
    }
  }, [isOpen, baseScreenshotUrl, actions, isRedacted, redactionBoxes, redrawCanvas]);

  // Coordinate scaling
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(pos);

    if (currentTool === "pen") {
      setActions((prev) => [
        ...prev,
        {
          tool: "pen",
          color: currentColor,
          lineWidth: currentLineWidth,
          points: [pos],
        },
      ]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getCanvasCoords(e);

    if (currentTool === "pen") {
      setActions((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.tool !== "pen" || !last.points) return prev;
        const updatedLast = {
          ...last,
          points: [...last.points, pos],
        };
        return [...prev.slice(0, -1), updatedLast];
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) {
      setIsDrawing(false);
      setStartPos(null);
      return;
    }

    const endPos = getCanvasCoords(e);

    if (currentTool === "box") {
      const rect = {
        x: Math.min(startPos.x, endPos.x),
        y: Math.min(startPos.y, endPos.y),
        width: Math.abs(endPos.x - startPos.x),
        height: Math.abs(endPos.y - startPos.y),
      };

      if (rect.width > 4 && rect.height > 4) {
        setActions((prev) => [
          ...prev,
          {
            tool: "box",
            color: currentColor,
            lineWidth: currentLineWidth,
            rect,
          },
        ]);
      }
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  const handleUndo = () => {
    setActions((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setActions([]);
  };

  // Submit Feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage("Please enter a description of your issue or suggestion.");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    let finalScreenshotData: string | null = null;
    if (includeScreenshot && canvasRef.current) {
      try {
        finalScreenshotData = canvasRef.current.toDataURL("image/png");
      } catch (err) {
        console.error("Failed to export canvas image", err);
      }
    }

    const payload = {
      message,
      category,
      userEmail: userEmail.trim() || undefined,
      screenshot: finalScreenshotData,
      isRedacted,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        resolution: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
        query: new URLSearchParams(window.location.search).get("q") || undefined,
      },
    };

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send feedback");
      }

      setSentSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSentSuccess(false);
        setMessage("");
        setUserEmail("");
        setActions([]);
        setIsRedacted(false);
        setRedactionBoxes([]);
        setBaseScreenshotUrl(null);
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while sending feedback.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Feedback Launcher Button */}
      <div
        id="feedback-floating-button"
        ref={widgetButtonRef}
        className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 animate-fadeIn"
      >
        <button
          type="button"
          onClick={captureScreenshot}
          disabled={isCapturing}
          className="inline-flex items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all group border-2 border-indigo-400/40"
          title="Send feedback or report a bug with a screenshot"
        >
          {isCapturing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span className="hidden sm:inline">Capturing screen...</span>
            </>
          ) : (
            <>
              <MessageSquarePlus className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Feedback</span>
            </>
          )}
        </button>
      </div>

      {/* Feedback & Annotation Modal */}
      {isOpen && (
        <div
          id="feedback-modal-container"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
          onClick={() => !isSending && setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[94vh] rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {t("sendFeedbackTitle")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Annotate the screenshot below, then submit your issue directly to development.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSending}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {sentSuccess ? (
              <div className="p-12 text-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  Thank You for Your Feedback!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Your message and annotated screenshot have been delivered to <strong>feedback@polychroms.dev</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                  {errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 1. SCREENSHOT & DRAWING SECTION (ALWAYS VISIBLE) */}
                  <div className="space-y-2.5 p-4 rounded-2xl border-2 border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          1. Draw on Screenshot
                        </span>
                        <span className="text-[11px] text-slate-500">
                          (or press Ctrl+V to paste)
                        </span>
                      </div>

                      {/* Drawing Controls Bar */}
                      <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        {/* Tool: Pen */}
                        <button
                          type="button"
                          onClick={() => setCurrentTool("pen")}
                          className={`p-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                            currentTool === "pen"
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                          title="Freehand pen"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Pen</span>
                        </button>

                        {/* Tool: Box */}
                        <button
                          type="button"
                          onClick={() => setCurrentTool("box")}
                          className={`p-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                            currentTool === "box"
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                          title="Draw highlight box"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Box</span>
                        </button>

                        <span className="text-slate-300 dark:text-slate-600">|</span>

                        {/* Automated Redact All (Company Privacy) */}
                        <button
                          type="button"
                          onClick={toggleRedactAll}
                          className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isRedacted
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-400/50"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
                          }`}
                          title={
                            isRedacted
                              ? "Company privacy active: all company names are blacked out (click to disable)"
                              : "1-Click Redact All: black out company name, domains, and search queries for company privacy"
                          }
                        >
                          {isRedacted ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-white" />
                              <span>Redacted</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Redact All</span>
                            </>
                          )}
                        </button>

                        <span className="text-slate-300 dark:text-slate-600">|</span>

                        {/* Color Selector */}
                        <div className="flex items-center gap-1 px-1">
                          {[
                            { color: "#ef4444", name: "Red" },
                            { color: "#f59e0b", name: "Amber" },
                            { color: "#10b981", name: "Green" },
                            { color: "#3b82f6", name: "Blue" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => setCurrentColor(c.color)}
                              className={`w-4 h-4 rounded-full border transition-transform ${
                                currentColor === c.color
                                  ? "scale-125 border-slate-900 dark:border-white ring-2 ring-indigo-400"
                                  : "border-transparent opacity-70 hover:opacity-100"
                              }`}
                              style={{ backgroundColor: c.color }}
                              title={c.name}
                            />
                          ))}
                        </div>

                        <span className="text-slate-300 dark:text-slate-600">|</span>

                        {/* Undo & Clear */}
                        <button
                          type="button"
                          onClick={handleUndo}
                          disabled={actions.length === 0}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30"
                          title="Undo"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={handleClear}
                          disabled={actions.length === 0}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 disabled:opacity-30"
                          title="Clear annotations"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-slate-300 dark:text-slate-600">|</span>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 px-1 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
                          <button
                            type="button"
                            onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            title="Zoom Out (-)"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>

                          <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 min-w-[36px] text-center select-none">
                            {Math.round(zoom * 100)}%
                          </span>

                          <button
                            type="button"
                            onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            title="Zoom In (+)"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setZoom(1)}
                            className="p-1 rounded text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Reset to 100%"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-slate-300 dark:text-slate-600">|</span>

                        {/* Retake / Screen Picker */}
                        <button
                          type="button"
                          onClick={captureWithDisplayMedia}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 text-[11px] font-semibold"
                          title="Pick window or browser tab to capture"
                        >
                          <Camera className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="hidden sm:inline">Screen Picker</span>
                        </button>
                      </div>
                    </div>

                    {/* Interactive Zoomable Canvas Container */}
                    <div
                      className="relative rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-950 overflow-auto min-h-[300px] max-h-[500px] flex items-start justify-center shadow-inner cursor-crosshair select-none"
                      onWheel={(e) => {
                        if (e.ctrlKey || e.metaKey || e.altKey) {
                          e.preventDefault();
                          setZoom((z) => {
                            const delta = e.deltaY < 0 ? 0.25 : -0.25;
                            return Math.min(3.5, Math.max(0.75, Number((z + delta).toFixed(2))));
                          });
                        }
                      }}
                    >
                      {isCapturing ? (
                        <div className="flex flex-col items-center gap-2 text-slate-400 my-auto py-20">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                          <span className="text-xs font-semibold">Capturing high-resolution page snapshot...</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: `${zoom * 100}%`,
                            minWidth: `${zoom * 100}%`,
                            transition: "width 0.15s ease-out",
                          }}
                          className="flex items-center justify-center p-2"
                        >
                          <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            style={{
                              width: "100%",
                              height: "auto",
                              display: "block",
                            }}
                            className="object-contain select-none touch-none rounded-lg shadow-md"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span>
                          Use <strong>+ / -</strong> buttons (or <strong>Ctrl + Scroll</strong>) to zoom in and draw precisely.
                        </span>
                        {isRedacted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Privacy Redacted</span>
                          </span>
                        )}
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeScreenshot}
                          onChange={(e) => setIncludeScreenshot(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span>Attach annotated image</span>
                      </label>
                    </div>
                  </div>

                  {/* 2. ISSUE DETAILS */}
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      2. Issue Details
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Issue Category */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Category
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "bug", label: t("bugReport") },
                            { id: "feature", label: t("featureRequest") },
                            { id: "design", label: t("uiStyle") },
                            { id: "other", label: t("otherFeedback") },
                          ].map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setCategory(c.id as CategoryType)}
                              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                                category === c.id
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-400 dark:border-indigo-600 shadow-2xs"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* User Email */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Your Email (Optional, if you want a response)
                        </label>
                        <input
                          type="email"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          placeholder="yourname@gmail.com"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Description Textarea */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Description <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Please explain what happened, what you expected, or how we can improve..."
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isSending}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    type="submit"
                    disabled={isSending || !message.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending to feedback@polychroms.dev...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{t("sendFeedbackBtn")}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
