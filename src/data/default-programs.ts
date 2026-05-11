import { Program } from '@/models/program';

function id() { return Math.random().toString(36).slice(2, 9); }

export function createDefaultPrograms(): Program[] {
  return [

    // ── BJJ ────────────────────────────────────────────────────────────
    {
      id: 'default-bjj', name: 'BJJ', icon: '🥊', category: 'sport', color: '#3fffc0',
      createdAt: new Date().toISOString(),
      blocks: [
        {
          id: id(), title: 'Échauffement',
          items: [{
            id: id(), name: 'Échauffement SNC · Mobilité', trackingType: 'checkbox',
            description: 'Shrimping ×4 · Roulades ×3 · Hip escape ×10 · Granby roll ×5',
          }],
        },
        {
          id: id(), title: 'Drilling technique',
          items: [{
            id: id(), name: 'Drilling technique', trackingType: 'checkbox',
            description: 'Répéter le mouvement du jour ×20-50 de chaque côté.',
            tip: 'Lent et précis > rapide et approximatif.',
          }],
        },
        {
          id: id(), title: 'Sparring',
          items: [{
            id: id(), name: 'Sparring', trackingType: 'checkbox',
            description: '3-5 rounds ×5min · 1min repos. Note 1 point à améliorer.',
            tip: 'Focus débutant : position > soumission.',
          }],
        },
      ],
    },

    // ── PUSH ───────────────────────────────────────────────────────────
    {
      id: 'default-push', name: 'Push', icon: '💪', category: 'sport', color: '#d4f53c',
      createdAt: new Date().toISOString(),
      blocks: [{
        id: id(), title: 'Exercices',
        items: [
          { id: id(), name: 'Développé couché', trackingType: 'sets', defaultSets: 4, description: 'Progression +1.25-2.5kg/semaine', tip: 'Descente contrôlée 2sec, explosif montée.' },
          { id: id(), name: 'Dips lestés', trackingType: 'sets', defaultSets: 4, description: '+2.5kg quand 4×6 propre.' },
          { id: id(), name: 'Développé militaire', trackingType: 'sets', defaultSets: 3 },
          { id: id(), name: 'HSPU Progressions', trackingType: 'checkbox', description: 'Pike push-up → HSPU mur → HSPU libre', tip: "Ne passe pas à l'étape suivante avant 5×3 propre." },
          { id: id(), name: 'Planche Progressions', trackingType: 'checkbox', description: 'Tuck → Adv. tuck → Straddle → Full', tip: 'Chaque palier = 4-8 semaines.' },
          { id: id(), name: 'Lateral raises', trackingType: 'sets', defaultSets: 3 },
        ],
      }],
    },

    // ── PULL ───────────────────────────────────────────────────────────
    {
      id: 'default-pull', name: 'Pull', icon: '🏋️', category: 'sport', color: '#d4f53c',
      createdAt: new Date().toISOString(),
      blocks: [{
        id: id(), title: 'Exercices',
        items: [
          { id: id(), name: 'Traction lestée', trackingType: 'sets', defaultSets: 5, description: '+2.5kg quand 5×5 propre.', tip: 'Si <3 reps : reste au même poids.' },
          { id: id(), name: 'Rowing barre', trackingType: 'sets', defaultSets: 4, description: 'Penché 45°. Tire vers le nombril.' },
          { id: id(), name: 'Front Lever Progressions', trackingType: 'checkbox', description: 'Tuck → Adv. tuck → 1 jambe → Straddle → Full', tip: 'Base : scapular pull-ups 3×10 d\'abord.' },
          { id: id(), name: 'Traction lente (4s)', trackingType: 'sets', defaultSets: 3, description: '4sec descente, 2sec montée.' },
          { id: id(), name: 'Curl barre', trackingType: 'sets', defaultSets: 3 },
          { id: id(), name: 'Face pulls', trackingType: 'checkbox' },
        ],
      }],
    },

    // ── LEGS ───────────────────────────────────────────────────────────
    {
      id: 'default-legs', name: 'Legs', icon: '🦵', category: 'sport', color: '#d4f53c',
      createdAt: new Date().toISOString(),
      blocks: [{
        id: id(), title: 'Exercices',
        items: [
          { id: id(), name: 'Squat barre', trackingType: 'sets', defaultSets: 4, description: '+2.5kg/semaine. Full depth.', tip: 'Amplitude complète > poids.' },
          { id: id(), name: 'Romanian Deadlift', trackingType: 'sets', defaultSets: 3 },
          { id: id(), name: 'Pistol Squat Progressions', trackingType: 'checkbox', description: 'TRX → Box haute → Box basse → Full pistol', tip: '8-12 semaines pour le premier pistol propre.' },
          { id: id(), name: 'Goblet squat', trackingType: 'sets', defaultSets: 3, description: 'Mobilité hanches' },
          { id: id(), name: 'Nordic curl', trackingType: 'checkbox', description: 'Prévention blessure BJJ.' },
        ],
      }],
    },

    // ── COURSE ─────────────────────────────────────────────────────────
    {
      id: 'default-run', name: 'Course', icon: '🏃', category: 'sport', color: '#ff8c2a',
      createdAt: new Date().toISOString(),
      blocks: [
        {
          id: id(), title: 'Séance',
          items: [
            { id: id(), name: '5 km', trackingType: 'duration', defaultDuration: 30, description: 'Allure 6-7 min/km. Au réveil.', tip: 'Ne cours pas si fatigue BJJ excessive.' },
            { id: id(), name: 'Progression', trackingType: 'checkbox', description: 'S1-4: easy · S5-8: fartlek · S8+: 6-7km' },
          ],
        },
      ],
    },

    // ── STRETCH A ──────────────────────────────────────────────────────
    {
      id: 'default-strA', name: 'Stretch A', icon: '🧘', category: 'wellbeing', color: '#a855f7',
      createdAt: new Date().toISOString(),
      blocks: [{
        id: id(), title: 'Étirements passifs & actifs',
        items: [
          { id: id(), name: 'Papillon gravitaire', trackingType: 'duration', defaultDuration: 3, description: 'Plantes jointes, genoux descendent seuls.', tip: 'Gravité + relâchement suffisent.' },
          { id: id(), name: 'Ischio allongé (serviette)', trackingType: 'duration', defaultDuration: 3, description: 'Allongé, serviette au pied, tire avec les bras.', tip: "Stop à l'inconfort." },
          { id: id(), name: 'Papillon actif', trackingType: 'checkbox', description: 'Sans les mains. 3sec au plus bas.', tip: 'Effort dans les fessiers.' },
          { id: id(), name: 'Flexion avant active', trackingType: 'checkbox', description: 'Dos droit, mouvement des hanches. 3sec hold.' },
          { id: id(), name: 'Papillon résisté PIR', trackingType: 'checkbox', description: 'Poings sur cuisses. 5sec isométrie puis relâche.', tip: 'PIR : contracter → relâcher → nouveau range.' },
          { id: id(), name: 'Ischio PNF', trackingType: 'checkbox', description: 'Pousse jambe contre serviette 5sec. Puis tire plus haut.', tip: '50-60% force max.' },
        ],
      }],
    },

    // ── STRETCH B ──────────────────────────────────────────────────────
    {
      id: 'default-strB', name: 'Stretch B', icon: '🧘', category: 'wellbeing', color: '#a855f7',
      createdAt: new Date().toISOString(),
      blocks: [{
        id: id(), title: 'Mobilité hanches & psoas',
        items: [
          { id: id(), name: 'Fente basse assistée', trackingType: 'duration', defaultDuration: 2, description: 'Genou au sol (coussin). Bassin vers avant-bas.', tip: 'Psoas = muscle #1 à ouvrir en BJJ.' },
          { id: id(), name: 'Pigeon passif (Figure 4)', trackingType: 'duration', defaultDuration: 2, description: 'Allongé, cheville sur cuisse, attire vers toi.', tip: 'Idéal garde fermée BJJ.' },
          { id: id(), name: 'Deep squat hold', trackingType: 'duration', defaultDuration: 1, description: 'Coudes écartent les genoux. 45sec.' },
          { id: id(), name: 'Tailleur + coudes', trackingType: 'checkbox', description: 'Coudes poussent genoux 5sec. Relâche, rapproche.' },
          { id: id(), name: 'Fente résistée PIR', trackingType: 'checkbox', description: 'Contracte fessier, essaie de relever genou 5sec.', tip: 'Poids sur jambe avant. Coussin obligatoire.' },
          { id: id(), name: 'Clamshell isométrique', trackingType: 'checkbox', description: 'Sur le côté, pousse genou contre main 5sec.', tip: 'Essentiel pour la garde ouverte BJJ.' },
        ],
      }],
    },

    // ── NUTRITION : JOUR POULET ────────────────────────────────────────
    {
      id: 'default-nut-poulet', name: 'Nutrition · Poulet', icon: '🍗', category: 'nutrition', color: '#ff8c2a',
      createdAt: new Date().toISOString(),
      blocks: [
        {
          id: id(), title: '🥞 Pancakes',
          items: [
            { id: id(), name: 'Flocons d\'avoine 80g', trackingType: 'checkbox', description: '310 kcal · 11P · 54G · 6L' },
            { id: id(), name: 'Banane ×1 + Œufs ×2', trackingType: 'checkbox', description: '245 kcal · 13P · 27G · 10L' },
            { id: id(), name: 'Beurre de cacahuètes 20g + Miel 10g', trackingType: 'checkbox', description: '150 kcal · 5P · 11G · 10L' },
          ],
        },
        {
          id: id(), title: '⚡ Goûter',
          items: [
            { id: id(), name: 'Pain 70g + Beurre de cacahuètes 25g + Miel 15g', trackingType: 'checkbox', description: '365 kcal · 12P · 49G · 14L' },
            { id: id(), name: 'Yaourt grec 0% 125g', trackingType: 'checkbox', description: '65 kcal · 10P · 5G' },
          ],
        },
        {
          id: id(), title: '🍽 Midi + Soir (×2)',
          items: [
            { id: id(), name: 'Blanc de poulet 250g (cru)', trackingType: 'checkbox', description: '265 kcal · 58P · 3L — Progression protéines' },
            { id: id(), name: 'Riz étuvé 70g (cru) + Légumes 150g', trackingType: 'checkbox', description: '305 kcal · 8P · 65G · 1L' },
            { id: id(), name: 'Huile d\'olive 1 c.s.', trackingType: 'checkbox', description: '90 kcal · 10L' },
          ],
        },
        {
          id: id(), title: '🍓 Dessert (×2)',
          items: [
            { id: id(), name: 'Yaourt grec 0% 125g + Fruit', trackingType: 'checkbox', description: '145 kcal · 10P · 25G' },
          ],
        },
      ],
    },

    // ── NUTRITION : JOUR SAUMON ────────────────────────────────────────
    {
      id: 'default-nut-saumon', name: 'Nutrition · Saumon', icon: '🐟', category: 'nutrition', color: '#4aaeff',
      createdAt: new Date().toISOString(),
      blocks: [
        {
          id: id(), title: '🥞 Pancakes',
          items: [
            { id: id(), name: 'Flocons d\'avoine 80g + Banane + Œufs ×2', trackingType: 'checkbox', description: '555 kcal · 24P · 81G · 16L' },
            { id: id(), name: 'Beurre de cacahuètes 20g + Miel 10g', trackingType: 'checkbox' },
          ],
        },
        {
          id: id(), title: '🍽 Midi + Soir (×2)',
          items: [
            { id: id(), name: 'Saumon surgelé 125g', trackingType: 'checkbox', description: '195 kcal · 25P · 10L — Oméga-3 ++' },
            { id: id(), name: 'Patate douce cuite 215g + Légumes', trackingType: 'checkbox', description: '240 kcal · 6P · 53G' },
            { id: id(), name: 'Huile d\'olive 1 c.s.', trackingType: 'checkbox', description: '90 kcal · 10L' },
          ],
        },
        {
          id: id(), title: '🍓 Dessert (×2)',
          items: [
            { id: id(), name: 'Yaourt grec 0% 125g + Fruit', trackingType: 'checkbox', description: '145 kcal · 10P · 25G' },
          ],
        },
      ],
    },

    // ── NUTRITION : JOUR STEAK ─────────────────────────────────────────
    {
      id: 'default-nut-steak', name: 'Nutrition · Steak', icon: '🥩', category: 'nutrition', color: '#ff3f5e',
      createdAt: new Date().toISOString(),
      blocks: [
        {
          id: id(), title: '🥞 Pancakes',
          items: [
            { id: id(), name: 'Flocons d\'avoine 80g + Banane + Œufs ×2', trackingType: 'checkbox', description: '555 kcal · 24P · 81G · 16L' },
            { id: id(), name: 'Beurre de cacahuètes 20g + Miel 10g', trackingType: 'checkbox' },
          ],
        },
        {
          id: id(), title: '🍽 Midi + Soir (×2)',
          items: [
            { id: id(), name: 'Steak haché 5% 100g', trackingType: 'checkbox', description: '125 kcal · 20P · 5L' },
            { id: id(), name: '+2 Œufs (1 repas sur 2)', trackingType: 'checkbox', description: '140 kcal · 12P · 10L' },
            { id: id(), name: 'Riz étuvé 70g + Légumes 150g', trackingType: 'checkbox', description: '305 kcal · 8P · 65G' },
            { id: id(), name: 'Huile d\'olive 1 c.s.', trackingType: 'checkbox', description: '90 kcal · 10L' },
          ],
        },
        {
          id: id(), title: '🍓 Dessert (×2)',
          items: [
            { id: id(), name: 'Yaourt grec 0% 125g + Fruit', trackingType: 'checkbox', description: '145 kcal · 10P · 25G' },
          ],
        },
      ],
    },

  ];
}
