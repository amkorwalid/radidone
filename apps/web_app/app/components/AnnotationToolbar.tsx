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

export function AnnotationToolbar() {
  
  return (
    <>Annotation Toolbar</>
  );
}
