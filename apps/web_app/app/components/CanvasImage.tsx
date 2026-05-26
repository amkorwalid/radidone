"use client";

import { useEffect, useRef } from "react";

interface ToolbarOptions {
  // Rendering controls
  toothPolygonsVisible: boolean;
  toothColorBy: "severity" | "illness" | "uniform";
  toothOpacity: number;
  toothStrokeWidth: number;

  boundingBoxesVisible: boolean;
  boundingBoxLabelsVisible: boolean;

  palateRegionsVisible: boolean;
  palateFilterByName: string | null;
  palateOpacity: number;

  // Canvas transform
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;

  // Filtering
  filterByIllness: string | null;
  filterDimOpacity: number;

  severityFilter: {
    high: boolean;
    moderate: boolean;
    low: boolean;
    none: boolean;
  };

  quadrantIsolation: "UR" | "UL" | "LL" | "LR" | null;
  quadrantDimOpacity: number;

  // UI state
  illnessPoolVisible: boolean;
  tooltipsVisible: boolean;
  statsVisible: boolean;
}

interface CanvasImageProps {
  imageSrc: string;
  options: Partial<ToolbarOptions>;
}

export function CanvasImage({ imageSrc, options }: CanvasImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Apply scale to canvas styling while keeping resolution
      const scale = options.canvasScale || 1;
      const translateX = options.canvasTranslateX || 0;
      const translateY = options.canvasTranslateY || 0;

      ctx.save();

      // Clear canvas
      ctx.fillStyle = "transparent";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply transformations
      ctx.translate(translateX, translateY);
      ctx.scale(scale, scale);

      // Draw image with opacity if needed
      ctx.globalAlpha = 1;
      ctx.drawImage(img, 0, 0);

      // Apply quadrant dimming if isolation is active
      if (options.quadrantIsolation) {
        const dimOpacity = options.quadrantDimOpacity || 0.3;
        const quadrant = options.quadrantIsolation;
        const w = img.width;
        const h = img.height;

        ctx.globalAlpha = dimOpacity;
        ctx.fillStyle = "rgba(0, 0, 0, 1)";

        // Dim all quadrants except the selected one
        if (quadrant !== "UR") {
          ctx.fillRect(w / 2, 0, w / 2, h / 2); // Upper right
        }
        if (quadrant !== "UL") {
          ctx.fillRect(0, 0, w / 2, h / 2); // Upper left
        }
        if (quadrant !== "LR") {
          ctx.fillRect(w / 2, h / 2, w / 2, h / 2); // Lower right
        }
        if (quadrant !== "LL") {
          ctx.fillRect(0, h / 2, w / 2, h / 2); // Lower left
        }
      }

      ctx.restore();
    };
  }, [imageSrc, options]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full"
        style={{
          transform: `scale(${options.canvasScale || 1})`,
          transformOrigin: "center",
          transition: "transform 0.2s ease-out",
        }}
      />
    </div>
  );
}
