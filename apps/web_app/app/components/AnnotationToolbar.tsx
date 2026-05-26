import {
  MdEdit,
  MdCircle,
  MdUndo,
  MdRedo,
  MdDelete,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";

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
  const toolClass = (tool: string) =>
    `p-2 rounded-lg transition-colors ${
      selectedTool === tool ? "bg-white text-black" : "bg-zinc-800 text-white"
    }`;

  return (
    <div className="flex items-center gap-2 bg-black border border-gray-800 rounded-lg p-2">
      <button
        className={toolClass("polygon")}
        onClick={() => onToolChange("polygon")}
        title="Polygon tool"
      >
        <MdEdit className="h-4 w-4" />
      </button>
      <button
        className={toolClass("circle")}
        onClick={() => onToolChange("circle")}
        title="Circle tool"
      >
        <MdCircle className="h-4 w-4" />
      </button>
      <button
        className="p-2 rounded-lg bg-zinc-800 text-white disabled:opacity-50"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
      >
        <MdUndo className="h-4 w-4" />
      </button>
      <button
        className="p-2 rounded-lg bg-zinc-800 text-white disabled:opacity-50"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
      >
        <MdRedo className="h-4 w-4" />
      </button>
      <button
        className="p-2 rounded-lg bg-zinc-800 text-white"
        onClick={onClear}
        title="Clear annotations"
      >
        <MdDelete className="h-4 w-4" />
      </button>
      <button
        className="p-2 rounded-lg bg-zinc-800 text-white"
        onClick={onToggleLayer}
        title={layerVisible ? "Hide annotations" : "Show annotations"}
      >
        {layerVisible ? <MdVisibility className="h-4 w-4" /> : <MdVisibilityOff className="h-4 w-4" />}
      </button>
    </div>
  );
}
