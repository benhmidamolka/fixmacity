# React + TypeScript + Vite
# FixMaCity 🏛️

Citizen request management platform for the Municipality of Sousse, Tunisia.

## Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL + PostGIS)
- **AI**: Google Gemini API (primary) + G4F (backup)
- **Map**: Leaflet.js + OpenStreetMap

## Quick Start

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 16 + PostGIS (for local dev)
- Python 3.10+ (only if using G4F backup)

### 2. Clone & Install
```bash
git clone https://github.com/benhmidamolka/fixmacity.git
cd fixmacity
npm run install:all
```

### 3. Set up environment variables
```bash
cp fixmacity-backend/.env.example fixmacity-backend/.env
# Fill in your values
```

### 4. Set up local database
- Open pgAdmin → create database `fixmacity`
- Open Query Tool → run `docs/local_database_setup.sql`

### 5. (Optional) Start G4F backup server
```bash
pip install -U g4f
python -m g4f.api
```

### 6. Start development
```bash
npm run dev:backend   # Terminal 1 — runs on port 5005
npm run dev:frontend  # Terminal 2 — runs on port 5173
```

## Roles
| Role | Access |
|------|--------|
| `citizen` | Submit, track, vote, rate |
| `agent` | Receive tasks, upload proof, resolve |
| `chef` | Accept/refuse, assign agents, dashboard |
| `president` | Route all requests, global KPIs, publish proposals |

## Documentation
- [Platform Overview](docs/PLATFORM_DOCUMENTATION.md)
- [G4F Backup Setup](docs/g4f/G4F_SETUP.md)
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
