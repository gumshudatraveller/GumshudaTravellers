# Supabase package management

This integration enables owner login, create/edit/draft/publish travel packages,
and image/PDF uploads. The public catalogue reads published rows from Supabase;
changes appear when customers reload the page, without a GitHub deployment.
Customer enquiries continue through WhatsApp. Customer registration, community
uploads and booking management still require the separate Node backend and are
not enabled by this package-management integration.

## Provision once

1. Create a project on Supabase's **Free** plan. Do not upgrade billing.
2. Apply `migrations/202611130001_packages.sql`, then
   `migrations/202611130002_seed.sql` with the project SQL editor or migrations.
3. In Authentication, create your owner account using an email you control and
   a private password of at least 12 characters. Disable public sign-ups for
   this owner-only project. Do not store passwords in this repository or chat.
4. Copy that user's UUID. In the SQL editor, run:

   ```sql
   insert into public.site_admin (singleton, user_id)
   values (true, 'REPLACE_WITH_OWNER_AUTH_USER_UUID');
   ```

   Only one owner is allowed. Site users cannot assign themselves this role.
   To transfer ownership, update this row through the project administrator.
5. Set GitHub repository Actions variables `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` using the project's URL and **publishable**
   key. Never use a service-role key, secret key or database password here.
   Keep `VITE_API_URL` empty for the Supabase + WhatsApp configuration.
6. Run the GitHub Pages workflow again, then visit `#/admin` and sign in.
7. Verify saving a draft, uploading a cover, publishing, editing and unpublishing.
   Verify a signed-out visitor can read only published packages and cannot write.

## Access and storage

RLS protects every application table. Public users can read published packages.
Only the single site administrator can write packages and media records or upload
files. Storage is a public marketing-media bucket: image/PDF URLs are publicly
accessible; never upload customer IDs or other private files. Each upload is
limited to 10 MB. Videos are intentionally excluded to conserve the free quota.
Deleting a draft/unpublishing it does not make its public media private.

The app uses Supabase Auth with refreshable sessions in sessionStorage. Passwords
are handled by Supabase. The public key does not confer admin access: RLS checks
the signed-in user's UUID against the administrator table on every write.

## Backups and limits

Keep copies of original media and export the packages table periodically. Monitor
Supabase's free storage and bandwidth allowances; free projects may pause after
inactivity. Do not simulate traffic to avoid that policy. Resume a paused project
from its dashboard. The frontend surfaces connection errors rather than silently
showing a stale editable catalogue.

## Current rollout state

Code is prepared, but project provisioning, owner account creation, remote RLS
verification and live activation require the user's Supabase connection. Until
public configuration is supplied, the existing static website continues working.
