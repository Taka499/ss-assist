# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in _docs/PLANS.md) from design to implementation.

## Project Overview

**ステラソラ依頼アシスト (Stella Sora Request Assistant)** is a serverless web application designed to help players of the Stella Sora game optimize character combinations for missions.

### Tech Stack

- **Frontend**: Vite + React 18 + TypeScript 5
- **Styling**: Tailwind CSS with PostCSS and Autoprefixer
- **State Management**: Zustand
- **Build Tool**: Vite
- **Testing**: Vitest
- **Deployment**: GitHub Pages (automated via GitHub Actions)

### Project Structure

- `src/` - React application source code
  - `components/` - Reusable React components
  - `lib/` - Core logic (data loading, combination algorithms, scoring)
  - `pages/` - Page components
  - `store/` - Zustand state management
  - `types/` - TypeScript type definitions
- `data-sources/` - Human-editable CSV files (characters.csv, missions.csv)
- `data/` - Auto-generated JSON files (do not edit manually)
- `i18n/` - Translation files for multi-language support (Japanese, Simplified Chinese, Traditional Chinese)
- `scripts/` - Data processing utilities (CSV to JSON conversion, validation, slug generation)
- `public/assets/characters/` - Character icon images
- `_docs/` - Design documents and ExecPlans

## COMMIT DISCIPLINE
- Follow Git-flow workflow to manage the branches
- Use small, frequent commits rather than large, infrequent ones
- Only add and commit affected files. Keep untracked other files as are
- Never add Claude Code attribution in commit

## Setup and Development

### Initial Setup

```bash
# Install dependencies
npm install
```

### Development Workflow

```bash
# Run development server (with hot reload)
npm run dev

# Type checking (without emitting files)
npm run type-check

# Lint code
npm run lint
```

### Data Management

**Human-editable files:**
- `data/tags.src.json` - Tag dictionary source
- `data-sources/*.csv` - Character and mission data
- `i18n/*.json` - Translation files

**Auto-generated files (do not edit manually):**
- `data/*.json` - Generated from CSV sources

```bash
# Generate JSON from CSV sources
npm run build:data

# Validate generated JSON against schema
npm run validate:data
```

### Building and Preview

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Deployment

The app deploys automatically to GitHub Pages when version tags are pushed:

```bash
# Create version tag and commit
npm version patch  # Bug fixes (0.1.0 -> 0.1.1)
npm version minor  # New features (0.1.0 -> 0.2.0)
npm version major  # Breaking changes (0.1.0 -> 1.0.0)

# Push to trigger GitHub Actions deployment
npm run release
```

GitHub Actions will automatically build data, validate schemas, build the app, and deploy to GitHub Pages.

### Key Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:data` - Generate JSON from CSV
- `npm run validate:data` - Validate data schemas
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Lint code with ESLint
- `npm run release` - Push commits and tags to trigger deployment

