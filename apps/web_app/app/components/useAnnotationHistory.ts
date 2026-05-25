import { useState, useCallback } from "react";

interface AnnotationAction {
  type: string;
  data: unknown;
}

interface HistoryState {
  history: AnnotationAction[];
  index: number;
}

export function useAnnotationHistory() {
  const [state, setState] = useState<HistoryState>({
    history: [],
    index: -1,
  });

  const addAction = useCallback((action: AnnotationAction) => {
    setState((prevState) => {
      const newHistory = prevState.history.slice(0, prevState.index + 1);
      newHistory.push(action);
      return {
        history: newHistory,
        index: newHistory.length - 1,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      index: Math.max(-1, prevState.index - 1),
    }));
  }, []);

  const redo = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      index: Math.min(prevState.history.length - 1, prevState.index + 1),
    }));
  }, []);

  const clear = useCallback(() => {
    setState({ history: [], index: -1 });
  }, []);

  return {
    addAction,
    undo,
    redo,
    clear,
    canUndo: state.index >= 0,
    canRedo: state.index < state.history.length - 1,
    currentAction: state.index >= 0 ? state.history[state.index] : null,
  };
}
