'use client';

import { useState } from 'react';
import { GoalType } from '@/models/goal';

const GOAL_TYPES: { value: GoalType; label: string; points: string }[] = [
  { value: 'daily',     label: 'Quotidien',    points: '±1 pt' },
  { value: 'weekly',    label: 'Hebdomadaire', points: '±5 pts' },
  { value: 'immediate', label: 'Immédiat',     points: '+2 pts' },
  { value: 'short',     label: 'Court terme',  points: '+3 pts' },
  { value: 'medium',    label: 'Moyen terme',  points: '+10 pts' },
  { value: 'long',      label: 'Long terme',   points: '+30 pts' },
  { value: 'life',      label: 'Vie',          points: '+1000 pts' },
];

interface Props {
  domainName: string;
  onAdd: (label: string, type: GoalType) => void;
  onClose: () => void;
}

export function AddGoalModal({ domainName, onAdd, onClose }: Props) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<GoalType>('daily');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    onAdd(label.trim(), type);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-semibold mb-1">Nouvel objectif</h3>
        <p className="text-sm text-gray-400 mb-4">dans {domainName}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Objectif</label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Courir 30 min..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Type</label>
            <div className="flex flex-col gap-1">
              {GOAL_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm transition-colors ${
                    type === t.value
                      ? 'bg-violet-50 ring-2 ring-violet-400 text-violet-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="text-xs text-gray-400">{t.points}</span>
                </button>
              ))}
            </div>
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
              disabled={!label.trim()}
              className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40"
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
