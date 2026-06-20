"use client";

import { useEffect } from "react";
import { useModels } from "@/hooks/useModels";

const providerLabels: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const { models, grouped, loading } = useModels();

  // The default selectedModel can name a provider the user has no key for;
  // snap to the first model actually available once the list loads.
  useEffect(() => {
    if (loading || models.length === 0) return;
    const isValid = models.some((m) => `${m.providerId}/${m.id}` === value);
    if (!isValid) {
      onChange(`${models[0].providerId}/${models[0].id}`);
    }
  }, [loading, models, value, onChange]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {loading && <option>Loading models...</option>}
      {Object.entries(grouped).map(([providerId, models]) => (
        <optgroup key={providerId} label={providerLabels[providerId] || providerId}>
          {models.map((model) => (
            <option key={`${providerId}/${model.id}`} value={`${providerId}/${model.id}`}>
              {model.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
