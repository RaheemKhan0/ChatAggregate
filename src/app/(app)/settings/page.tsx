"use client";

import { useState, useEffect } from "react";

const PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models (Sonnet, Haiku, Opus)",
    placeholder: "sk-ant-...",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models (GPT-4o, GPT-4 Turbo)",
    placeholder: "sk-...",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini models (2.0 Flash, 2.0 Pro)",
    placeholder: "AIza...",
  },
];

interface ConfiguredKey {
  provider: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [configuredKeys, setConfiguredKeys] = useState<ConfiguredKey[]>([]);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    const res = await fetch("/api/keys");
    if (res.ok) {
      setConfiguredKeys(await res.json());
    }
  }

  async function saveKey(provider: string) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: keyInput }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `${provider} key saved successfully` });
        setEditingProvider(null);
        setKeyInput("");
        fetchKeys();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save key" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save key" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteKey(provider: string) {
    setMessage(null);
    const res = await fetch("/api/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: `${provider} key removed` });
      fetchKeys();
    }
  }

  function isConfigured(providerId: string) {
    return configuredKeys.some((k) => k.provider === providerId);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Settings</h1>
        <p className="text-zinc-400 mb-8">
          Add your API keys to start chatting. Keys are encrypted and stored
          securely. Only you can use your keys.
        </p>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-900/50 text-green-300 border border-green-800"
                : "bg-red-900/50 text-red-300 border border-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {PROVIDERS.map((provider) => {
            const configured = isConfigured(provider.id);
            const isEditing = editingProvider === provider.id;

            return (
              <div
                key={provider.id}
                className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-zinc-100">
                        {provider.name}
                      </h3>
                      {configured && (
                        <span className="px-2 py-0.5 text-xs bg-green-900/50 text-green-400 border border-green-800 rounded-full">
                          Configured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                      {provider.description}
                    </p>
                  </div>

                  {!isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingProvider(provider.id);
                          setKeyInput("");
                          setMessage(null);
                        }}
                        className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                      >
                        {configured ? "Update" : "Add Key"}
                      </button>
                      {configured && (
                        <button
                          onClick={() => deleteKey(provider.id)}
                          className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-4 space-y-3">
                    <input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder={provider.placeholder}
                      className="w-full bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-600"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveKey(provider.id)}
                        disabled={!keyInput.trim() || saving}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingProvider(null);
                          setKeyInput("");
                        }}
                        className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
