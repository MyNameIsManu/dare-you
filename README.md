# DareYou

An app for challenging yourself and your friends. Create a "dare" with a deadline, and let friends follow your progress.

> 🚧 Early development. Only sign-up and sign-in work so far.

## Tech stack

- [Expo](https://expo.dev) / React Native with Expo Router (iOS first, then Android and web)
- [Supabase](https://supabase.com) for auth and the Postgres database

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` in the project root:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

3. Start the dev server and open the app in Expo Go, the iOS Simulator (`i`) or the browser (`w`):

   ```bash
   npx expo start
   ```

## Database

The schema lives in `supabase/migrations/`. To apply new migrations and refresh the TypeScript types:

```bash
npx supabase db push --remote
npx supabase gen types typescript --linked > src/lib/database.types.ts
```
