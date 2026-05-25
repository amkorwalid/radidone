import { useState, useCallback } from "react";

interface AnnotationAction {
  type: string;
  data: unknown;
}

export function useAnnotationHistory() {
  const [history, setHistory] = useState<AnnotationAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addAction = useCallback(
    (action: AnnotationAction) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(action);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history.length]);

  const clear = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    addAction,
    undo,
    redo,
    clear,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    currentAction: historyIndex >= 0 ? history[historyIndex] : null,
  };
}
