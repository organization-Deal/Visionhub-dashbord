Visionhub API TypeScript build fix

Error fixed:
TS2345 / TS2322 in apps/api/src/routes/contents.ts around PATCH /:id

Cause:
With the requireAdmin middleware overload, Hono types route param `id` as string | undefined.
The code passed it into functions requiring string.

Fix:
- Validate `id` before use, narrowing it to string.
- Use nullish coalescing for title fallback.

Replace only:
apps/api/src/routes/contents.ts
