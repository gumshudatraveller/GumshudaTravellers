# Supabase package management

This integration enables owner login, create/edit/draft/publish travel packages,
and image/PDF uploads. The public catalogue reads published rows from Supabase;
changes appear when customers reload the page, without a GitHub deployment.
Customer enquiries continue through WhatsApp. Customer registration, community
uploads and booking management still require the separate Node backend and are
not enabled by this package-management integration.

## Provision once

1. Use the existing project `bxvjfadtuxlotwttdrgi`. Do not upgrade billing.
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
5. The website uses the public project URL and publishable key in
   `src/supabase-config.json`. Optional Actions variables `VITE_SUPABASE_URL`
   and `VITE_SUPABASE_PUBLISHABLE_KEY` override these values. Never put a
   service-role key, secret key or database password in frontend configuration.
   Keep `VITE_API_URL` empty for Supabase + WhatsApp.
6. Run the GitHub Pages workflow again, then visit `#/admin` and sign in.
7. Verify saving a draft, uploading a cover, publishing, editing and unpublishing.
   Verify a signed-out visitor can read only published packages and cannot write.

## Access and storage

RLS protects every application table. Public users can read published packages.
Only the single site administrator can write packages and media records or upload
files. Storage is a public marketing-media bucket: image/PDF URLs are publicly
accessible; never upload customer IDs or other private files. Each upload is
limited to 10 MB. Short MP4 videos are supported within the same 10 MB per-file limit. Apply `package-media-config.sql` to enable MP4 on an existing installation.
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

The existing project has the schema and three published packages loaded.
Database access tests passed for anonymous visitors, non-admin users and the
designated owner (temporary test identities were rolled back). The security
advisor reported no findings. Public configuration is included in the website.

The verified owner account and permanent site_admin membership are active. Real owner sign-in and editing a published package were verified in the deployed UI. File-upload verification was interrupted by browser-session loss; the bucket and adapter accept the documented file types. Public signup should be disabled in Auth
settings; even if enabled, new users cannot grant themselves admin access.

## Package editor

Edit and Create itinerary open a dedicated dialog. Save draft keeps unfinished work private; Publish itinerary makes it public; Unpublish & save draft removes it from the catalogue. Duplicate starts an unsaved copy. Upload an image to select it as the cover; choose additional media as customer attachments. PDF and MP4 uploads in the editor attach automatically. Save the package after uploading. Day controls are independent of nights and never truncate existing text.
