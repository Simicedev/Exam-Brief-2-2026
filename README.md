# Exam Brief 2

Holidaze front-end project built with a modern React + TypeScript stack focused on routing, server-state handling, component consistency, and testability.

Website - https://vaycay.netlify.app/homeRoute

## Tech Stack

- React
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Zod
- Vitest
- Tabler Icons
- DayPicker

## Why This Stack

### React
React gives a component-driven architecture that makes UI reusable and easy to scale as the app grows (venues list, profile pages, booking flows, etc.).

### TanStack Router
TanStack Router provides type-safe routing with strong support for nested routes and route-based data loading, which is ideal for a multi-page app with clear route structure.

### TanStack Query
TanStack Query is used for server state management: caching, background refetching, loading/error states, and mutation flows. This reduces manual fetch/state boilerplate and keeps UI data in sync.

### Tailwind CSS
Tailwind speeds up UI implementation with utility-first styling while still allowing consistent design tokens and predictable responsive layouts.

### shadcn/ui
shadcn/ui provides accessible, composable UI primitives you own in your codebase. It helps build a consistent interface faster without locking you into a rigid component library.

### Zod
Zod adds runtime validation and typed schemas for API payloads/forms, reducing bugs from malformed data and improving confidence in request/response handling.

### Vitest
Vitest is a fast testing framework that works naturally in Vite projects. It is used for unit and integration-style tests of components and utility logic.

### Tabler Icons
Tabler Icons gives a broad, clean icon set that integrates nicely with React components and keeps iconography consistent across the UI.

### DayPicker
DayPicker gives me the touch I need for a venue site, it is used to remove already booked calender days, find available calender days, and an easy to navigate calender all in all.
## Getting Started

### 1. Install dependencies

```bash
npm install @base-ui/react @fontsource-variable/geist @headlessui/react @tabler/icons @tailwindcss/vite @tanstack/react-query @tanstack/react-query-devtools @tanstack/react-router class-variance-authority clsx lucide-react next-themes react react-day-picker react-dom shadcn sonner tailwind-merge tailwindcss tw-animate-css zod
npm install -D @eslint/js @tanstack/eslint-plugin-query @tanstack/router-vite-plugin @types/node @types/react @types/react-dom @vitejs/plugin-react eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals typescript typescript-eslint vite vitest
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and set your values:

```env
VITE_API_BASE_URL=https://v2.api.noroff.dev
VITE_API_KEY=your-api-key-here
```

### 3. Run the dev server

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start local development server
- `npm run build` - Type-check and create production build
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint

## Testing

Run tests with Vitest:

```bash
npx vitest
```

For watch mode:

```bash
npx vitest --watch
```

## GitHub

https://github.com/Simicedev

@Simicedev
