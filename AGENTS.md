<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Prisma migrations

**Never create or edit migration files manually.** Do not hand-write folders under `prisma/migrations/`, do not paste SQL into new migration files, and do not rename migration directories by hand.

Always use the Prisma CLI:

1. Change `prisma/schema.prisma` only.
2. Run `bun run db:migrate` (or `prisma migrate dev --name <descriptive_name>`).
3. Review the generated SQL in the new migration folder before committing.
4. For production/CI, use `bun run db:deploy` (`prisma migrate deploy`).

If you need custom SQL, use `prisma migrate dev --create-only`, edit the generated file, then `prisma migrate dev` to apply — still through Prisma, not ad-hoc files.

For local testing artifacts (screenshots, audits, debug output), use `.temp/` — never the repo root or `public/`.
