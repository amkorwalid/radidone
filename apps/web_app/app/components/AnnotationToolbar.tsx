import {
  Pen,
  Circle,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";

interface AnnotationToolbarProps {
  onToolChange: (tool: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onToggleLayer: () => void;
  layerVisible: boolean;
  selectedTool: string;
  canUndo: boolean;
  canRedo: boolean;
}

export function AnnotationToolbar({
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  onToggleLayer,
  layerVisible,
  selectedTool,
  canUndo,
  canRedo,
}: AnnotationToolbarProps) {
  const tools = [
    { id: "polygon", icon: Pen, label: "Polygon" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "label", icon: Pen, label: "Tooth Label" },
  ];

  return (
    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">
          Annotation Tools
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                  selectedTool === tool.id
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                }`}
                title={tool.label}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs text-center">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-700">
        <h3 className="text-sm font-semibold text-white mb-3">Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg bg-zinc-700 text-gray-300 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg bg-zinc-700 text-gray-300 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleLayer}
            className="p-2 rounded-lg bg-zinc-700 text-gray-300 hover:bg-zinc-600 transition-colors"
            title={layerVisible ? "Hide layer" : "Show layer"}
          >
            {layerVisible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onClear}
            className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="Clear all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
