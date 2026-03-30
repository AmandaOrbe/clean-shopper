import { useState, useCallback } from "react";
import { researchProduct } from "../services/claude";
import type { SearchState } from "../types";

export function useProductResearch() {
  const [state, setState] = useState<SearchState>({
    query: "",
    isLoading: false,
    result: "",
    error: null,
  });

  const research = useCallback(async (productName: string) => {
    if (!productName.trim()) return;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      result: "",
      error: null,
      query: productName,
    }));

    try {
      await researchProduct(productName, (chunk) => {
        setState((prev) => ({ ...prev, result: prev.result + chunk }));
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error ? err.message : "An unexpected error occurred.",
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ query: "", isLoading: false, result: "", error: null });
  }, []);

  return { ...state, research, reset };
}
