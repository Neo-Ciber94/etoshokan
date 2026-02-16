# Project Overview

This is a ebook reader that support translations from english to japanese with offline support, and uses tauri for deploying on android

- **SvelteKit 2.0** with **Svelte 5** (runes) and **TypeScript strict mode**
- **Tailwind CSS 4.0** with **shadcn-svelte** UI components
- **bun** as package manager

## Code Standards & Preferences

### Code Style

- **No semicolons** (configured in Prettier)
- **2 spaces indentation** (not tabs)
- **TypeScript strict mode** - always maintain type safety
- **SIMPLE solutions** - avoid overengineering
- **Only minimal comments** unless explicitly requested
- **No Emojis**
- Use brackets, even on simple returns

### Package Management

- **Always use `bun`** instead of npm or yarn
- **Never use `npx`** - use `bunx` instead

### File Organization

- Keep components in `src/components/`
- Keep utilities in `src/lib/utils`
- Server related code on `src/lib/server`

## Development Workflow

## Technology-Specific Guidelines

### SvelteKit & Svelte 5

- Use **runes** (`$state`, `$derived`, `$effect`) instead of legacy reactive declarations
- Prefer `let { children } = $props()` over `$$slots`
- Use `{@render children?.()}` for slot rendering

### Tailwind CSS

- Use **Tailwind CSS 4.0** features
- Configure for production optimization
- Use utility classes, avoid custom CSS when possible
- Dark mode is implemented, should he take in account when adding styles

### shadcn-svelte

- Components are in `src/lib/components/ui/`
- Use tree-shakeable imports
- Customize components as needed

### TypeScript

- **Strict mode always enabled**
- Use proper typing for all functions and components
- No `any` types - use proper interfaces
- Type all $props
