# Jotnote — collaborative block notes

A Notion-style note-taking app for small teams. Share a note with friends and edit it together in real time, assign checklist items with a due date and time, and see all the tasks assigned to you in one place.

Built as a combined project for a **Mobile** course (Expo SDK 57 + React Native) and a **Cloud** course (Supabase).

> Author: Pongsakorn Phoemkham · Faculty of Science and Technology, Rajamangala University of Technology Suvarnabhumi
>
> 🇹🇭 Thai version: [README.th.md](README.th.md)

## Features

**Notes and blocks**
- Three block types: heading, text and checklist (add, edit, delete, reorder).
- Choose which heading a new block goes under, or add it outside any heading.
- Six text colors. A heading's color also marks its whole section (a colored bar beside the blocks under it).
- Search notes, filter (All / Mine / Shared with me), delete a note, or leave a note shared with you.

**Collaboration**
- Share by **e-mail** or by a **6-character invite code** (editor or viewer access). Codes can be regenerated or turned off.
- Real-time updates (Supabase Realtime); the notes list refreshes by itself when someone shares a note with you.
- Presence (who has the note open) and a "last edited by" badge on every block.

**Tasks**
- Assign a checklist item to a member and set a due **date and time** (shown in Thai, Buddhist-era year). Items turn "overdue" at the actual due time.
- A **My tasks** screen collects everything assigned to you across all notes, ordered by due time.

**Account**
- Sign up / sign in, change display name, change password, sign out, delete account.
- The whole interface is in Thai.

## Tech stack

| Area | Used |
|---|---|
| Mobile app | Expo SDK 57, React Native 0.86, React 19.2, TypeScript, Expo Router |
| UI | Prompt font, `expo-linear-gradient`, `@expo/vector-icons`, `@react-native-community/datetimepicker` |
| Cloud | Supabase: Auth, PostgreSQL with Row Level Security, Realtime (postgres_changes + Presence), SQL functions (RPC) |
| Client libraries | `@supabase/supabase-js`, AsyncStorage |

## Architecture

```
Expo app (expo-router)  ──supabase-js──▶  Supabase
 (auth)  sign in / sign up                 Auth        users + sessions
 (tabs)  Notes · My tasks · Profile        Postgres    profiles, notes, note_members,
 note/[id]  block editor                               blocks, note_invites
                                           RLS         access control in the database
                                           Realtime    postgres_changes + Presence
                                           RPC (SQL)   create_invite, join_note_by_code,
                                                       delete_my_account
```

- There is no custom server. The app talks to Supabase directly and the database enforces permissions.
- **Why blocks?** If a note is stored as a single record, two people editing at the same time overwrite each other. Storing one row per block means edits only collide when two people change the *same block* at the same moment (last-write-wins per block).
- Actions the client should not perform on its own, such as joining by invite code or deleting an account, are `security definer` SQL functions.

## Getting started

### 1) Set up Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the files in `supabase/` **in this order, one at a time** (clear the editor before pasting each file):

   | Order | File | Purpose |
   |---|---|---|
   | 1 | `schema.sql` | Tables, RLS policies, triggers, Realtime |
   | 2 | `migration-002.sql` | Heading blocks, leave a shared note, delete account, live notes list |
   | 3 | `migration-003.sql` | Invite-code table and functions |
   | 4 | `migration-004.sql` | Block text color |
   | 5 | `migration-005.sql` | Due date becomes date **and time** |

3. **Authentication → Sign In / Providers → Email**: allow sign-ups and turn **off** *Confirm email* (so new accounts can be used immediately).

### 2) Configure the app
```bash
npm install
```
Copy `.env.example` to `.env` and fill in the values from Supabase (Project Settings → API):
```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```
> Use only the **anon (public) key**. Never put the `service_role` / secret key in the project or in git.

### 3) Run
```bash
npx expo start -c
```
Scan the QR code with **Expo Go for SDK 57** (update Expo Go to the latest version from the App Store / Play Store).

| Situation | Command |
|---|---|
| Phone and computer on the same Wi-Fi | `npx expo start -c` |
| Different networks (sign in to Expo first: `npx expo login`) | `npx expo start --tunnel -c` |
| Without signing in to Expo | `npx expo start --offline -c` |

If Expo Go refuses to open the project because it is signed in to a different Expo account, sign out of Expo Go first.

## Checks

```bash
npx tsc --noEmit      # type check
npx expo lint         # ESLint
npx expo-doctor       # project configuration check
```

## Project structure

```
app/
  (auth)/            sign-in and sign-up screens
  (tabs)/            Notes · My tasks · Profile
  note/[id].tsx      block editor
components/          BlockRow, DueEditor, AddBlockSheet, ShareSheet, PresenceBar, ui
lib/                 supabase, blocks, notes, members, invites, profile, sections,
                     dates, theme, usePresence, useNoteRealtime, useSession
supabase/            schema.sql and migration-002 … 005
```

## Security notes and limitations

- **RLS:** a viewer cannot edit even by calling the API directly. The `blocks_touch` trigger stamps the editor and time on the server, so they cannot be forged from the app.
- **Invite codes:** anyone who has a code can join. Codes are generated with PostgreSQL's `random()` (not cryptographically secure), do not expire, and guessing attempts are not rate-limited. This is fine for small groups and demos; for real use, add expiry, rate limiting and a cryptographic random source.
- The `profiles` table is readable by every signed-in user (used to find friends by e-mail), so other users' e-mail addresses can be enumerated.
- **No offline support**: an Internet connection is required.
- Editing the **same block** at the same time: the last save wins.
- No notification when a due time is reached, and no "forgot password" e-mail flow.
- Not yet evaluated with real users, and real-time behaviour across two devices has not been fully tested.

## Roadmap

Offline mode (local SQLite + sync queue), CRDTs (e.g. Yjs) for simultaneous typing in one block, QR invite codes with expiry, due-time notifications, images and attachments (Supabase Storage).
