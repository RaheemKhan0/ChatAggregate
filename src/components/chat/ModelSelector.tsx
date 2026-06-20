"use client";

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
  const { grouped, loading } = useModels();

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
