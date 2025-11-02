# ステラソラ依頼アシスト | Stella Sora Request Assistant

A serverless web application to help players optimize character combinations for missions in Stella Sora game.

## Project Structure

```
ss-assist/
├── public/
│   └── assets/
│       └── characters/          # Character icon images
├── data/                       # Generated JSON data (do not edit manually)
│   ├── tags.json              # Tag dictionary with multi-language support
│   ├── characters.json         # Character data
│   └── missions.json          # Mission data
├── data-sources/              # Human-editable CSV files
│   ├── characters.csv
│   └── missions.csv
├── i18n/                      # Translation files
│   ├── tags.zh-Hans.json      # Simplified Chinese translations
│   └── tags.zh-Hant.json      # Traditional Chinese translations
├── scripts/                   # Data processing scripts
│   ├── csv-to-json.ts         # Convert CSV to JSON with slug generation
│   ├── validate-data.ts       # JSON schema validation
│   └── slug.ts                # Slug generation utilities
├── src/
│   ├── components/            # React components
│   │   ├── AppLayout.tsx
│   │   ├── RosterSelector.tsx
│   │   ├── LevelEditor.tsx
│   │   ├── MissionPicker.tsx
│   │   ├── ResultsView.tsx
│   │   ├── ComboCard.tsx
│   │   ├── TrainHint.tsx
│   │   ├── TrainRanking.tsx
│   │   ├── TagPill.tsx
│   │   ├── RewardChip.tsx
│   │   └── CharacterAvatar.tsx
│   ├── lib/                   # Core logic
│   │   ├── data.ts            # Data loading and initialization
│   │   ├── combos.ts          # Combination search algorithm
│   │   ├── scoring.ts         # Training priority scoring
│   │   └── bitmask.ts         # Bitmask utilities
│   ├── pages/                 # Page components
│   │   ├── Home.tsx
│   │   ├── RosterManagement.tsx
│   │   ├── MissionSelection.tsx
│   │   └── Results.tsx
│   ├── store/                 # Zustand state management
│   │   ├── useAppStore.ts
│   │   └── useLanguageStore.ts
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .github/
│   └── workflows/
│       └── pages.yml          # GitHub Actions for deployment
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate JSON from CSV
npm run build:data

# Validate JSON schema
npm run validate:data

# Type checking
npm run type-check

# Lint code
npm run lint

# Release (push commits and tags)
npm run release
```

## Data Management

- **Human-editable**: `data/tags.src.json`, `data-sources/*.csv`, `i18n/*.json`
- **Auto-generated**: `data/*.json` (do not edit manually)

## Deployment

The app is automatically deployed to GitHub Pages when a new version is released.

### Release Process

1. **Update version and create tag**
   ```bash
   npm version patch  # For bug fixes (0.1.0 -> 0.1.1)
   npm version minor  # For new features (0.1.0 -> 0.2.0)
   npm version major  # For breaking changes (0.1.0 -> 1.0.0)
   ```
   This automatically creates a git commit and tag.

2. **Push to trigger deployment**
   ```bash
   npm run release
   ```

3. **GitHub Actions will automatically:**
   - Build data from CSV sources
   - Validate data schemas
   - Build the application
   - Deploy to GitHub Pages

**Note:** The workflow only triggers on version tags (e.g., `v0.1.0`), ensuring controlled, versioned deployments.

### Manual Deployment

You can also trigger deployment manually from the GitHub Actions tab without creating a new version tag.

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Deployment**: GitHub Pages
