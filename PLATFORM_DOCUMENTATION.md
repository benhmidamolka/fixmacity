# 🏛️ FixMaCity — Documentation de la Plateforme

FixMaCity est une plateforme civique innovante conçue pour moderniser la gestion urbaine et renforcer le lien entre les citoyens et la municipalité de Sousse, Tunisie. Elle combine l'intelligence artificielle, la cartographie interactive et des outils de gestion administrative pour transformer les signalements citoyens en actions concrètes.

---

## 🚀 Fonctionnalités Clés

### 1. Signalement Intelligent (IA Vision)
Le cœur de la plateforme permet aux citoyens de signaler des problèmes urbains (trous, lampadaires cassés, déchets) en quelques secondes.
- **Analyse Automatique** : L'IA (Gemini 3.1 Flash) analyse les photos téléchargées pour générer automatiquement un titre, une description, une catégorie et un niveau d'urgence.
- **Détection des Risques** : L'IA identifie les dangers immédiats (fils électriques exposés, trous profonds) et alerte les services municipaux.
- **Localisation Précise** : Intégration avec Leaflet/OpenStreetMap pour épingler le problème sur la carte ou utiliser le GPS.

### 2. Assistant Municipal (Chatbot "Baladia")
Un assistant IA multilingue (Français, Anglais, Arabe/Darija) disponible 24h/24.
- **Support Utilisateur** : Aide les citoyens à naviguer sur la plateforme et à comprendre les procédures.
- **Suivi Contextuel** : Capable de répondre à des questions spécifiques sur l'état d'avancement des signalements de l'utilisateur.
- **Contextualisation Municipale** : Formé sur les spécificités de la ville de Sousse.

### 3. Gestion Administrative (Workflows)
Un système de gestion rigoureux pour assurer la résolution des problèmes.
- **Cycle de Vie** : `Soumise` ➔ `Assignée Chef` ➔ `Assignée Agent` ➔ `En cours` ➔ `Résolue` ➔ `Clôturée`.
- **Détection de Doublons** : Empêche la multiplication des signalements pour un même problème dans une zone proche.
- **Preuves de Résolution** : Les agents terrain doivent télécharger une photo "Après" pour valider la résolution.

### 4. Tableaux de Bord Analytiques
- **Président de la Commune** : Vue d'ensemble stratégique, KPIs de performance globale, et cartes de chaleur (Heatmaps) des problèmes.
- **Chef de Service** : Gestion opérationnelle, assignation des tâches aux agents, et validation technique.

---

## 🛠️ Architecture Technique

### Frontend
- **Framework** : React + TypeScript + Vite.
- **Styling** : Tailwind CSS (Design System : Editorial Architecturalism).
- **Cartographie** : React-Leaflet + Nominatim (Géocodage).
- **Gestion d'État** : React Hooks (useState, useEffect, useContext).

### Backend
- **Serveur** : Node.js + Express.
- **Base de Données** : Supabase (PostgreSQL) avec Row Level Security (RLS).
- **Authentification** : JWT (JSON Web Tokens) avec hachage bcrypt pour les mots de passe.
- **Services IA** : Intégration directe de l'API Google Gemini (Vision & Chat).

### Base de Données (Schéma Principal)
- `users` : Citoyens, Agents, Chefs, Président.
- `declarations` : Données des signalements, géolocalisation, photos, et notes d'IA.
- `propositions` : Suggestions citoyennes pour l'amélioration de la ville.
- `chatbot_sessions` : Historique des conversations avec l'IA.

---

## 👥 Rôles et Parcours Utilisateurs

### 🏙️ Le Citoyen
1. **Explore la carte** pour voir les problèmes existants.
2. **Signale un problème** via une photo (IA) ou manuellement.
3. **Vote** pour des propositions ou appuie des signalements existants.
4. **Dialogue avec Baladia** pour obtenir de l'aide.
5. **Évalue l'intervention** une fois le problème résolu.

### 👨‍💼 Le Chef de Service
1. **Reçoit les nouveaux signalements** de son arrondissement.
2. **Vérifie la validité** (peut rejeter avec motif).
3. **Assigne un Agent** spécifique à l'intervention.
4. **Supervise** les délais et la qualité du travail.

### 👷 L'Agent de Terrain
1. **Reçoit ses missions** sur son interface mobile.
2. **Se rend sur place** grâce aux coordonnées GPS.
3. **Change le statut** en "En cours" lors de l'intervention.
4. **Soumet une photo finale** pour prouver la résolution.

### 🏛️ Le Président de la Commune
1. **Analyse les statistiques** (temps moyen de résolution, arrondissements les plus actifs).
2. **Consulte la Heatmap** pour identifier les zones critiques.
3. **Prend des décisions budgétaires** basées sur les données réelles de la plateforme.

---

## 🔒 Sécurité et Gouvernance
- **Confidentialité** : Les données personnelles des citoyens sont protégées et non affichées publiquement sur la carte.
- **Gouvernance IA** : L'IA est bridée pour ne répondre qu'aux questions municipales (système de prompt strict).
- **Auditabilité** : Chaque changement de statut est horodaté et associé à un utilisateur responsable.

---
*Document généré le 30 Avril 2026 pour l'équipe technique FixMaCity.*
