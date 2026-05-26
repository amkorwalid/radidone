"use client";

import { useState } from "react";
import {
  MdVisibility,
  MdVisibilityOff,
  MdTune,
  MdZoomIn,
  MdZoomOut,
  MdCenterFocusStrong,
  MdInfo,
  MdAssessment,
} from "react-icons/md";

// Constants
const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 4;

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

const DEFAULT_OPTIONS: ToolbarOptions = {
  toothPolygonsVisible: true,
  toothColorBy: "uniform",
  toothOpacity: 1,
  toothStrokeWidth: 2,
  boundingBoxesVisible: false,
  boundingBoxLabelsVisible: false,
  palateRegionsVisible: false,
  palateFilterByName: null,
  palateOpacity: 0.7,
  canvasScale: 1,
  canvasTranslateX: 0,
  canvasTranslateY: 0,
  filterByIllness: null,
  filterDimOpacity: 0.3,
  severityFilter: {
    high: true,
    moderate: true,
    low: true,
    none: true,
  },
  quadrantIsolation: null,
  quadrantDimOpacity: 0.3,
  illnessPoolVisible: false,
  tooltipsVisible: true,
  statsVisible: true,
};

interface AnnotationToolbarProps {
  onOptionsChange?: (options: Partial<ToolbarOptions>) => void;
}

export function AnnotationToolbar({ onOptionsChange }: AnnotationToolbarProps) {
  const [options, setOptions] = useState<ToolbarOptions>(DEFAULT_OPTIONS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleOptionChange = <K extends keyof ToolbarOptions>(key: K, value: ToolbarOptions[K]): void => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions);
    onOptionsChange?.(newOptions);
  };

  const handleSeverityFilterChange = (level: keyof typeof options.severityFilter) => {
    const newFilter = {
      ...options.severityFilter,
      [level]: !options.severityFilter[level],
    };
    handleOptionChange("severityFilter", newFilter);
  };

  const handleQuadrantSelect = (quad: "UR" | "UL" | "LL" | "LR" | null) => {
    handleOptionChange("quadrantIsolation", quad);
  };

  const handleZoom = (delta: number) => {
    const newScale = Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, options.canvasScale + delta));
    handleOptionChange("canvasScale", newScale);
  };

  const handleReset = () => {
    setOptions(DEFAULT_OPTIONS);
    onOptionsChange?.(DEFAULT_OPTIONS);
  };

  return (
    <div className="bg-zinc-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Main toolbar */}
      <div className="flex items-center gap-2 p-3 flex-wrap">
        {/* Rendering Controls Group */}
        <div className="flex items-center gap-1 border-r border-gray-700 pr-3">
          <button
            onClick={() => handleOptionChange("toothPolygonsVisible", !options.toothPolygonsVisible)}
            title="Toggle tooth outlines"
            className={`p-2 rounded transition-colors ${
              options.toothPolygonsVisible
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <MdVisibility className="h-4 w-4" />
          </button>
          <select
            value={options.toothColorBy}
            onChange={(e) => handleOptionChange("toothColorBy", e.target.value as "severity" | "illness" | "uniform")}
            title="Tooth color scheme"
            className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <option value="uniform">Color: Uniform</option>
            <option value="severity">Color: Severity</option>
            <option value="illness">Color: Illness</option>
          </select>
        </div>

        {/* Bounding Boxes Group */}
        <div className="flex items-center gap-1 border-r border-gray-700 pr-3">
          <button
            onClick={() => handleOptionChange("boundingBoxesVisible", !options.boundingBoxesVisible)}
            title="Toggle bounding boxes"
            className={`p-2 rounded transition-colors ${
              options.boundingBoxesVisible
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <div className="h-4 w-4 border border-current rounded" />
          </button>
          <button
            onClick={() => handleOptionChange("boundingBoxLabelsVisible", !options.boundingBoxLabelsVisible)}
            title="Toggle bounding box labels"
            className={`p-2 rounded transition-colors text-xs font-bold ${
              options.boundingBoxLabelsVisible
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            A
          </button>
        </div>

        {/* Palate Regions Group */}
        <div className="flex items-center gap-1 border-r border-gray-700 pr-3">
          <button
            onClick={() => handleOptionChange("palateRegionsVisible", !options.palateRegionsVisible)}
            title="Toggle palate regions"
            className={`p-2 rounded transition-colors ${
              options.palateRegionsVisible
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <MdInfo className="h-4 w-4" />
          </button>
        </div>

        {/* Canvas Controls Group */}
        <div className="flex items-center gap-1 border-r border-gray-700 pr-3">
          <button
            onClick={() => handleZoom(0.2)}
            title="Zoom in"
            className="p-2 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          >
            <MdZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            title="Zoom out"
            className="p-2 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          >
            <MdZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleOptionChange("canvasScale", MIN_ZOOM_SCALE)}
            title="Reset zoom"
            className="p-2 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors text-xs font-bold"
          >
            {Math.round(options.canvasScale * 100)}%
          </button>
          <button
            onClick={() => handleReset()}
            title="Reset all"
            className="p-2 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
          >
            <MdCenterFocusStrong className="h-4 w-4" />
          </button>
        </div>

        {/* Visibility Toggles Group */}
        <div className="flex items-center gap-1 border-r border-gray-700 pr-3">
          <button
            onClick={() => handleOptionChange("tooltipsVisible", !options.tooltipsVisible)}
            title="Toggle tooltips"
            className={`p-2 rounded transition-colors ${
              options.tooltipsVisible
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <span className="text-xs font-bold">?</span>
          </button>
          <button
            onClick={() => handleOptionChange("statsVisible", !options.statsVisible)}
            title="Toggle stats"
            className={`p-2 rounded transition-colors ${
              options.statsVisible
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <MdAssessment className="h-4 w-4" />
          </button>
        </div>

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Advanced options"
          className="p-2 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors ml-auto"
        >
          <MdTune className="h-4 w-4" />
        </button>
      </div>

      {/* Advanced Options Panel */}
      {showAdvanced && (
        <div className="border-t border-gray-700 bg-black bg-opacity-30 p-4 space-y-4">
          {/* Quadrant Controls */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Isolate Quadrant
            </label>
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => handleQuadrantSelect(null)}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  options.quadrantIsolation === null
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleQuadrantSelect("UR")}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  options.quadrantIsolation === "UR"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                UR
              </button>
              <button
                onClick={() => handleQuadrantSelect("UL")}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  options.quadrantIsolation === "UL"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                UL
              </button>
              <button
                onClick={() => handleQuadrantSelect("LL")}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  options.quadrantIsolation === "LL"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                LL
              </button>
              <button
                onClick={() => handleQuadrantSelect("LR")}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  options.quadrantIsolation === "LR"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                LR
              </button>
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Severity Levels
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                ["high", "moderate", "low", "none"] as Array<keyof typeof options.severityFilter>
              ).map((level) => (
                <button
                  key={level}
                  onClick={() => handleSeverityFilterChange(level)}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-colors capitalize ${
                    options.severityFilter[level]
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Tooth Opacity: {Math.round(options.toothOpacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={options.toothOpacity}
                onChange={(e) => handleOptionChange("toothOpacity", parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Palate Opacity: {Math.round(options.palateOpacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={options.palateOpacity}
                onChange={(e) => handleOptionChange("palateOpacity", parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Tooth Outline Width: {options.toothStrokeWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={options.toothStrokeWidth}
              onChange={(e) => handleOptionChange("toothStrokeWidth", parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Illness Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              Filter by Illness
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter illness name..."
                value={options.filterByIllness || ""}
                onChange={(e) =>
                  handleOptionChange("filterByIllness", e.target.value || null)
                }
                className="flex-1 px-2 py-1.5 bg-gray-800 text-white rounded text-xs border border-gray-700 focus:border-gray-600 outline-none"
              />
              <button
                onClick={() => handleOptionChange("filterByIllness", null)}
                className="px-3 py-1.5 bg-gray-800 text-gray-400 hover:bg-gray-700 rounded text-xs transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Illness Pool Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300">
              Show Unassigned Findings
            </label>
            <button
              onClick={() => handleOptionChange("illnessPoolVisible", !options.illnessPoolVisible)}
              className={`p-2 rounded transition-colors ${
                options.illnessPoolVisible
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {options.illnessPoolVisible ? (
                <MdVisibility className="h-4 w-4" />
              ) : (
                <MdVisibilityOff className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Dim Opacity for filters */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Filter Dim Opacity: {Math.round(options.filterDimOpacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.filterDimOpacity}
              onChange={(e) => handleOptionChange("filterDimOpacity", parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
