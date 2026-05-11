import { Domain } from '@/models/domain';
import { Note } from '@/models/note';

function uid() { return Math.random().toString(36).slice(2, 9); }
function today() { return new Date().toISOString().split('T')[0]; }
function now() { return new Date().toISOString(); }

export function createDefaultDomains(): Domain[] {
  return [
    {
      id: 'dom-bjj',
      name: 'BJJ',
      emoji: '🥊',
      createdAt: now(),
      goals: [
        { id: uid(), label: 'Séance BJJ', type: 'daily', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Passer la ceinture bleue', type: 'long', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Apprendre 1 nouvelle soumission', type: 'weekly', done: false, history: [], createdAt: now() },
      ],
    },
    {
      id: 'dom-force',
      name: 'Force',
      emoji: '💪',
      createdAt: now(),
      goals: [
        { id: uid(), label: 'Séance Push / Pull / Legs', type: 'daily', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Bench press 100kg', type: 'long', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Première traction lestée +20kg', type: 'medium', done: false, history: [], createdAt: now() },
      ],
    },
    {
      id: 'dom-cardio',
      name: 'Cardio',
      emoji: '🏃',
      createdAt: now(),
      goals: [
        { id: uid(), label: 'Course 5km', type: 'weekly', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Courir un 10km', type: 'medium', done: false, history: [], createdAt: now() },
      ],
    },
    {
      id: 'dom-souplesse',
      name: 'Souplesse',
      emoji: '🧘',
      createdAt: now(),
      goals: [
        { id: uid(), label: 'Stretch A ou B', type: 'daily', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Grand écart complet', type: 'life', done: false, history: [], createdAt: now() },
      ],
    },
    {
      id: 'dom-nutrition',
      name: 'Nutrition',
      emoji: '🥗',
      createdAt: now(),
      goals: [
        { id: uid(), label: 'Suivre le plan nutrition', type: 'daily', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Préparer les repas de la semaine', type: 'weekly', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Atteindre l\'objectif protéines', type: 'daily', done: false, history: [], createdAt: now() },
      ],
    },
    {
      id: 'dom-mental',
      name: 'Mental',
      emoji: '🧠',
      createdAt: now(),
      goals: [
        { id: uid(), label: 'Méditation 10 min', type: 'daily', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Lire 20 pages', type: 'daily', done: false, history: [], createdAt: now() },
        { id: uid(), label: 'Finir un livre', type: 'short', done: false, history: [], createdAt: now() },
      ],
    },
  ];
}

export function createDefaultNotes(): Note[] {
  return [
    {
      id: 'note-welcome',
      date: today(),
      domainId: 'dom-mental',
      title: '👋 Bienvenue sur Hero',
      createdAt: now(),
      body: `Hero est une app de suivi de progression personnelle. Voici comment elle fonctionne :

──────────────────────
🎯 ONGLET PROFIL
──────────────────────
→ Crée tes domaines de vie (Sport, Mental, Nutrition…)
→ Ajoute des objectifs à chaque domaine avec un type :
   • Quotidien / Hebdo : objectifs récurrents (±1 ou ±5 pts)
   • Court / Moyen / Long terme : objectifs progressifs
   • Vie : objectif ultime (+1000 pts)
→ Coche tes objectifs chaque jour pour accumuler des points
→ Le radar affiche ton profil de progression en temps réel

──────────────────────
⚡ ONGLET SÉANCES
──────────────────────
→ Des programmes sont déjà prêts : BJJ, Push, Pull, Legs, Course, Stretch, Nutrition
→ Appuie sur ▶ Démarrer pour logger une séance
→ Pour les exercices de force : note le kg, les reps et le RPE
→ Crée tes propres programmes — sport, lecture, philosophie, routine matinale…
→ Structure libre : blocs (ex: Échauffement) → items (ex: Squat barre)

──────────────────────
📅 ONGLET CALENDRIER
──────────────────────
→ Visualise tes séances jour par jour
→ Le heatmap montre ton activité sur 6 mois
→ Tes stats mensuelles : séances, variété, streak

──────────────────────
📓 ONGLET CARNET
──────────────────────
→ Prends des notes liées à tes domaines
→ Observations de séances, réflexions, apprentissages
→ Filtre par domaine pour retrouver tes notes rapidement

──────────────────────
☁️ SYNCHRONISATION
──────────────────────
→ Toutes tes données sont sauvegardées automatiquement sur Firebase
→ Connecte-toi avec le même compte Google sur n'importe quel appareil
→ Seul ton profil public (optionnel) est visible par les autres

Bonne progression ! 💪`,
    },
  ];
}
