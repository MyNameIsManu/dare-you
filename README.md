# DareYou

I dare you! You dare? Web and mobile app for challenging your friends and proving you did it.

## The idea

Most challenges die quietly: someone says "I really have to do …", everybody nods, nobody follows up. DareYou makes a dare something you can't just forget:

- **A dare is a promise.** And a promise is a promise. Duh!
- **Proof, not talk.** (At the moment) You finish a dare by uploading a photo. If a friend dared you, they decide whether it counts.
- **Saying no is allowed.** A dare from a friend is an invitation. You can accept or decline it, and if you don't answer before the deadline it expires.
- **Small and personal.** (At the moment) Dares are only exchanged between friends, not posted for the public. You can also dare yourself.

## Current status

🧪 **Private testing with friends.** The web version is live, and the native apps run in development builds only. Nothing is in the App Store or Play Store yet.

**Working**

- Sign-up and sign-in with email and password
- Friends: search by username, send, accept and remove friend requests, view profiles
- Dares for yourself or a friend, each with a title, description and deadline
- Accept or decline dare invitations. Invitations nobody answers expire automatically.
- Photo proof from the camera or the photo library, which the friend who sent the dare accepts or rejects
- Automatic failure when the deadline passes without proof
- Home overview with deadline rings and progress bars for your open dares
- Live updates and a badge for new invitations
- Settings sidebar with a German / English language switch

## Tech stack

| Area           | Technology                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| App            | [Expo](https://expo.dev) SDK 58, React Native, React 19, TypeScript                                                                                  |
| Navigation     | Expo Router (file-based, native tabs on iOS and Android)                                                                                             |
| Web            | react-native-web, exported as a single-page app                                                                                                      |
| UI             | react-native-reanimated, react-native-svg, expo-image, expo-symbols                                                                                  |
| Backend        | [Supabase](https://supabase.com): Auth, Postgres with row-level security, Storage for proof photos, Realtime, pg_cron for expiring and failing dares |
| Languages      | Own typed i18n (German / English) in `src/i18n/`, with expo-localization for the default language                                                    |
| Hosting and CI | GitHub Actions builds the web app and uploads it over SFTP                                                                                           |

## Project structure

```
src/app/            screens and navigation (Expo Router, every file is a route)
src/components/     shared UI components
src/i18n/           translations: de.ts is the reference, en.ts must match it
utils/              Supabase client, data access, auth and dares context
supabase/migrations database schema, policies and functions
docs/               documentation (dare lifecycle)
.github/workflows/  web deployment
```

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

3. Start the dev server and open the app in a development build, the iOS Simulator (`i`) or the browser (`w`):

   ```bash
   npx expo start
   ```

Before committing, run:

```bash
npx expo lint
npx tsc --noEmit
```

## Database

The schema lives in `supabase/migrations/`. To apply new migrations and refresh the TypeScript types:

```bash
npx supabase db push --remote
npx supabase gen types typescript --linked > utils/database.types.ts
```

## Translations

All UI text lives in `src/i18n/de.ts` and `src/i18n/en.ts`. To add a phrase, add the key to `de.ts`. TypeScript then reports an error until the same key also exists in `en.ts`. In components, use it like this:

```tsx
const { t } = useI18n();
t("common.from", { name }); // "Von Max" / "From Max"
```

## Colours and theme

All colours are defined in `src/constants/theme.ts`. To re-brand, change the values in `BASE` (accent, ink, background ...). Glow, soft fills and urgency tones are derived from them. Components read tokens through `useTheme()`; they contain no hex values. The app is light-only for now (`userInterfaceStyle` in `app.json`). Frosted surfaces use `src/components/glass-card.tsx`.

## Web deployment

Every push to `main` runs [.github/workflows/deploy-web.yml](.github/workflows/deploy-web.yml). The workflow:

1. builds the web app with `npx expo export --platform web`
2. uploads `dist/` over SFTP

The server config is in [public/.htaccess](public/.htaccess). It redirects every route to `index.html`, sends the headers that expo-sqlite needs on web, and sets compression and caching.

The app is served under a sub-path, which is set in `experiments.baseUrl` in `app.json` and in `RewriteBase` in `.htaccess`. These two must match. No route may start with the base URL, because Expo Router strips it as plain text.

Required GitHub settings (Settings → Secrets and variables → Actions):

| Type     | Name                                                                           |
| -------- | ------------------------------------------------------------------------------ |
| Secret   | `SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD`                                      |
| Variable | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SFTP_DIR` |
