'use client';

import { useState } from 'react';

const EMOJI_SUGGESTIONS = ['💪', '🧠', '💼', '📚', '❤️', '💰', '🎨', '🏠', '🌱', '🙏', '🎯', '✈️', '🎵'];

interface Props {
  onAdd: (name: string, emoji: string) => void;
  onClose: () => void;
}

export function AddDomainModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), emoji);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Nouveau domaine</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_SUGGESTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-xl p-2 rounded-lg transition-colors ${emoji === e ? 'bg-violet-100 ring-2 ring-violet-400' : 'hover:bg-gray-100'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Nom</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Santé, Carrière..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
