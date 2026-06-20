"use client";

import { useState, useEffect } from "react";
import type { ModelInfo } from "@/lib/llm/types";

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => setModels(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const grouped = models.reduce(
    (acc, model) => {
      if (!acc[model.providerId]) acc[model.providerId] = [];
      acc[model.providerId].push(model);
      return acc;
    },
    {} as Record<string, ModelInfo[]>
  );

  return { models, grouped, loading };
}
