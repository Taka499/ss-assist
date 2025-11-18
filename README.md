# ステラソラ依頼アシスト | Stella Sora Request Assistant

A serverless web application to help players optimize character combinations for commissions in Stella Sora game.

## Live Demo

🚀 **Live at:** https://taka499.github.io/ss-assist/

## Project Structure

```
ss-assist/
├── public/
│   └── assets/
│       ├── characters/          # Character icon images
│       └── items/               # Item icon images
├── data/                       # Generated JSON data (do not edit manually)
│   ├── tags.json              # Tag dictionary with multi-language support
│   ├── tags.src.json          # Tag dictionary source (committed)
│   ├── characters.json         # Character data
│   ├── commissions.json       # Commission data
│   └── items.json             # Item/reward data
├── data-sources/              # Human-editable CSV files
│   ├── stellasora - characters.csv
│   ├── stellasora - commissions.csv
│   └── stellasora - items.csv
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
│   │   ├── CharacterAvatar.tsx
│   │   ├── ComboCard.tsx
│   │   ├── LevelEditor.tsx
│   │   ├── CommissionAssignmentCard.tsx
│   │   ├── CommissionCoverageIndicator.tsx
│   │   ├── CommissionPicker.tsx
│   │   ├── ResultsView.tsx
│   │   ├── RewardChip.tsx
│   │   ├── RosterSelector.tsx
│   │   ├── TagPill.tsx
│   │   ├── TrainHint.tsx
│   │   ├── TrainingRecommendationList.tsx
│   │   └── TrainRanking.tsx
│   ├── lib/                   # Core logic (with co-located tests)
│   │   ├── data.ts            # Data loading and initialization
│   │   ├── data.test.ts
│   │   ├── combos.ts          # Combination search algorithm
│   │   ├── combos.test.ts
│   │   ├── scoring.ts         # Training priority scoring
│   │   ├── scoring.test.ts
│   │   ├── bitmask.ts         # Bitmask utilities
│   │   ├── bitmask.test.ts
│   │   └── analytics.ts       # Privacy-friendly analytics (Umami)
│   ├── pages/                 # Page components
│   │   ├── Home.tsx
│   │   ├── RosterManagement.tsx
│   │   ├── LevelManagement.tsx
│   │   ├── CommissionSelection.tsx
│   │   └── Results.tsx
│   ├── store/                 # Zustand state management (with tests)
│   │   ├── useAppStore.ts
│   │   ├── useAppStore.test.ts
│   │   ├── useLanguageStore.ts
│   │   └── useLanguageStore.test.ts
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts
│   ├── _examples/             # Example components for testing
│   │   ├── ComponentTest.tsx
│   │   ├── FeatureTest.tsx
│   │   └── README.md
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── tests/                     # Additional test files
│   ├── test-combos.ts
│   └── test-scoring.ts
├── tools/                     # Development utilities
│   ├── icon-cropper/          # Python tool for cropping character icons
│   └── README.md
├── _docs/                     # Design documents and ExecPlans
│   ├── PLANS.md              # ExecPlan methodology
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── execplans/            # ExecPlan archives
│   └── execplan-*.md         # Phase-by-phase implementation plans
├── .github/
│   └── workflows/
│       └── pages.yml          # GitHub Actions for deployment
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── CLAUDE.md                  # AI assistant instructions
├── LICENSE
└── README.md
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

### Source Files (Committed to Git)
- `data/tags.src.json` - Tag dictionary source
- `data-sources/*.csv` - Character and mission data
- `i18n/*.json` - Translation files

### Generated Files (Gitignored)
- `data/tags.json` - Generated from tags.src.json
- `data/characters.json` - Generated from CSV sources
- `data/commissions.json` - Generated from CSV sources

**Important**: The `data/*.json` files are **gitignored** as they are build artifacts. They are automatically generated:
- **During local development**: Run `npm run build:data` when CSV sources change
- **During CI/CD**: GitHub Actions automatically runs `build:data` before deployment

This approach treats generated data like compiled code (similar to `dist/`), keeping CSV files as the single source of truth and preventing duplication/sync issues.

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
