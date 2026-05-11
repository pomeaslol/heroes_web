'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { signOutUser } from '@/lib/firebase/auth';
import { computeDomainScore, Domain } from '@/models/domain';
import { Goal, GoalType, computeCurrentDone } from '@/models/goal';
import { AddDomainModal } from './AddDomainModal';
import { AddGoalModal } from './AddGoalModal';

export function Dashboard() {
  const user = useAppStore((s) => s.user);
  const appData = useAppStore((s) => s.appData);
  const syncError = useAppStore((s) => s.syncError);
  const updateAppData = useAppStore((s) => s.updateAppData);

  const [showAddDomain, setShowAddDomain] = useState(false);
  const [addingGoalToDomain, setAddingGoalToDomain] = useState<string | null>(null);

  const domains = appData?.domains ?? [];

  function handleAddDomain(name: string, emoji: string) {
    const newDomain: Domain = {
      id: crypto.randomUUID(),
      name,
      emoji,
      goals: [],
      createdAt: new Date().toISOString(),
    };
    updateAppData({ domains: [...domains, newDomain] });
  }

  function handleAddGoal(domainId: string, label: string, type: GoalType) {
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      label,
      type,
      done: false,
      history: [],
      createdAt: new Date().toISOString(),
    };
    const updated = domains.map((d) =>
      d.id === domainId ? { ...d, goals: [...d.goals, newGoal] } : d
    );
    updateAppData({ domains: updated });
  }

  function handleToggleGoal(domainId: string, goalId: string) {
    const today = new Date().toISOString().split('T')[0];
    const updated = domains.map((d) => {
      if (d.id !== domainId) return d;
      return {
        ...d,
        goals: d.goals.map((g) => {
          if (g.id !== goalId) return g;
          if (g.type === 'daily' || g.type === 'weekly') {
            const newDone = !computeCurrentDone(g);
            const history = g.history.filter((h) => h.date !== today);
            return { ...g, history: [...history, { date: today, done: newDone }] };
          }
          return { ...g, done: !g.done };
        }),
      };
    });
    updateAppData({ domains: updated });
  }

  function handleDeleteGoal(domainId: string, goalId: string) {
    const updated = domains.map((d) =>
      d.id === domainId ? { ...d, goals: d.goals.filter((g) => g.id !== goalId) } : d
    );
    updateAppData({ domains: updated });
  }

  function handleDeleteDomain(domainId: string) {
    updateAppData({ domains: domains.filter((d) => d.id !== domainId) });
  }

  const addingGoalDomain = domains.find((d) => d.id === addingGoalToDomain);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
        <h1 className="text-xl font-bold text-violet-700">Hero</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.displayName}</span>
          <button
            onClick={signOutUser}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {syncError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            Erreur de synchronisation : {syncError}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Mes domaines</h2>
          <button
            onClick={() => setShowAddDomain(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            + Domaine
          </button>
        </div>

        {domains.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-lg font-medium mb-1">Aucun domaine pour l'instant</p>
            <p className="text-sm">Créez votre premier domaine pour commencer à suivre vos objectifs</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {domains.map((domain) => (
              <li key={domain.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{domain.emoji}</span>
                    <span className="font-semibold text-gray-800">{domain.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-violet-600 font-bold text-lg">
                      {computeDomainScore(domain)} pts
                    </span>
                    <button
                      onClick={() => handleDeleteDomain(domain.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                      title="Supprimer le domaine"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {domain.goals.length > 0 && (
                  <ul className="flex flex-col gap-1 mb-3">
                    {domain.goals.map((goal) => (
                      <li key={goal.id} className="flex items-center gap-2 text-sm text-gray-600 group">
                        <button
                          onClick={() => handleToggleGoal(domain.id, goal.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            computeCurrentDone(goal)
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-violet-400'
                          }`}
                        >
                          {computeCurrentDone(goal) && <span className="text-xs">✓</span>}
                        </button>
                        <span className={computeCurrentDone(goal) ? 'line-through text-gray-400' : ''}>{goal.label}</span>
                        <span className="ml-auto text-xs text-gray-300 capitalize">{goal.type}</span>
                        <button
                          onClick={() => handleDeleteGoal(domain.id, goal.id)}
                          className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => setAddingGoalToDomain(domain.id)}
                  className="text-sm text-violet-500 hover:text-violet-700 transition-colors"
                >
                  + Ajouter un objectif
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {showAddDomain && (
        <AddDomainModal
          onAdd={handleAddDomain}
          onClose={() => setShowAddDomain(false)}
        />
      )}

      {addingGoalDomain && (
        <AddGoalModal
          domainName={`${addingGoalDomain.emoji} ${addingGoalDomain.name}`}
          onAdd={(label, type) => handleAddGoal(addingGoalDomain.id, label, type)}
          onClose={() => setAddingGoalToDomain(null)}
        />
      )}
    </div>
  );
}
