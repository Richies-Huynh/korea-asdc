@AGENTS.md

## Git

- Never commit and never push. Leave changes staged or unstaged for the user to review and commit themselves.
- Never add a co-author trailer to commits. All commits are authored solely by the user.

## Consistency First

- Before implementing any solution, search the codebase for an existing pattern that solves the same problem and follow it. Reuse the established approach (routes, helpers, component props, naming) rather than inventing a new one — consistency makes the code easier to debug. Example: render documents via the existing `/api/<entity>/[id]/file` route as other pages do, instead of introducing a new endpoint.

## UI Copy

- Always write "Sign In" (capital I), never "Sign in"
- Never use hyphens or em dashes to join clauses in user-facing copy (tooltips, labels, messages) — it reads as AI-generated. Use separate sentences or commas instead. Hyphens in compound words (e.g. "sub-folders", "read-only") are fine.
- Section headers and titles use Title Case — capitalize each significant word (e.g. "Investor Details", "Invite Email"), never sentence case ("Investor details").

## Tooltips

- Use the `.tooltip` utility class from `app/globals.css` with a `data-tooltip` attribute, never the native `title` attribute. Add `tooltip-left` / `tooltip-right` to control anchoring near edges:
  ```tsx
  <span className="tooltip" data-tooltip="Visible to all organizations">Global</span>
  ```

## Responsive Design

- Always make pages responsive. Side-by-side layouts must collapse to a vertical stack on smaller viewports (e.g. `flex flex-col lg:flex-row`); never ship a fixed-width multi-column layout without a mobile breakpoint.

## React State

- Never call `setState` synchronously inside a `useEffect` just to initialise state from a one-time source (URL hash, localStorage, etc.). Use a lazy initialiser in `useState` instead:
  ```ts
  const [value, setValue] = useState(() => deriveInitialValue());
  ```

## Firestore Rules

- Whenever a new API route reads from or writes to a Firestore collection, update `firestore.rules` in the same change with the appropriate `match` block. Never leave a collection without rules.

## File Naming

- Next.js middleware lives in `proxy.ts` at the project root — never `middleware.ts`.

## Naming Conventions

- Getter functions are named `get` + the object type only — e.g. `getUser`, `getDocument`, `getSession`. Never `getUserProfile`, `getDocumentMetadata`, etc.
- Auth/action functions are named after the action verb only — e.g. `signIn`, `signOut`. Never suffix with the object (`signOutUser`, `signInWithEmail`). When this collides with an imported function of the same name, alias the import (e.g. `import { signOut as firebaseSignOut } from 'firebase/auth'`).
- URL and path slugs use `{id}` only — never prefix with the entity name (e.g. `{id}`, not `{userId}`, `{orgId}`, `{docId}`). The collection/route already provides the context. This applies to path segments only, not function parameters.
- All interface field names must be snake_case — e.g. `download_enabled`, `created_at`, never `downloadEnabled`, `createdAt`.
- In a `Record` type, always annotate what the `string` key represents with an inline comment — e.g. `Record<string /* documentId */, Organization[]>`, never a bare `Record<string, Organization[]>`.
- Never reference another entity by its id — always reference the full object for stronger typing (e.g. `user: User`, not `user_id: string`).
- Types are always imported by their original name, never aliased.
- Entity constants (roles, statuses, collection names) live in `lib/types.ts` alongside their interfaces — a single `import { User }` gives you both the constant values and the type. Non-entity constants (Auth, Storage, AdminTab) stay in `lib/constants.ts`.
- Always use semicolons at the end of every statement.
- Never use single-letter or acronym variable names — always expand them fully (e.g. `folder` not `f`, `organization` not `org`, `key` and `value` not `k` and `v` in `Object.entries` loops). Exception: use `d` for a Firestore snapshot record when the full name would shadow an imported entity type (e.g. `d` in `.map((d) => ...)` when `Document` is in scope).
- Never assign a variable a default value only to immediately overwrite it in the next branch. Derive the final value in a single expression (ternary, `??`, or similar) instead.
- Never leave an unused parameter. Remove it. When a later positional parameter is still required (e.g. a Next.js route handler that needs `params` but not the request), prefix the unused leading parameter with an underscore (`_req`) rather than removing it.
- Never use `React.FormEvent`. Form submit handlers take no event parameter; call `e.preventDefault()` inline in the JSX `onSubmit` prop and invoke the handler directly:
  ```tsx
  <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  ```
- Single-line `if` bodies go on a new line with no curly braces:
  ```ts
  if (condition)
    return value
  ```
- When building `FormData`, collect all fields into a typed `Record` first and use a single `Object.entries` loop to append them — never call `.append` separately for each field:
  ```ts
  const payload: Record<string, string | File> = { id: '...', name: '...', file };
  const formData = new FormData();
  Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
  ```

- When reading Firestore document data, always extract `doc.data()` into a variable and guard against `null`/`undefined` explicitly before accessing fields:
  ```ts
  const data = doc.data();
  if (!doc.exists || !data || data.role !== User.ROLE_ADMIN)
    return ...
  ```
