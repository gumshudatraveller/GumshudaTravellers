# Gumshuda Travellers

React frontend and Node.js API implementing the five screens in the supplied [Figma design](https://www.figma.com/design/hKYJqM5HdnUGLbjdfZVa9P/Untitled?node-id=0-1): Discover, Travel packages, Build your trip, Traveler stories and Admin studio. The original cream/green palette, Inter and DM Serif Display fonts, and downloaded Figma assets are included locally. Branding and contacts use Gumshuda Travellers.

## Run locally

Requires **Node.js 24 or later** (the backend uses Node's built-in SQLite).

```sh
npm ci
cp .env.example .env
```

For the full application, set `VITE_API_URL=http://localhost:3001/api` in `.env`. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least **16 characters** to provision the first administrator, then run:

```sh
npm run dev:full
```

Open the frontend URL printed by Vite, including `/GumshudaTravellers/`. The API listens on port 3001. The admin studio is at `#/admin`. New registrations always receive the customer role. There are no default admin credentials. The bootstrap variables only create a missing administrator; changing them does not reset an existing password.

To run only the static frontend, leave `VITE_API_URL` blank and run `npm run dev`.

## GitHub Pages deployment

The `.github/workflows/pages.yml` workflow installs dependencies, runs API integration tests, builds React, and deploys `dist/` to GitHub Pages on pushes to `main`. Pull requests build and test without publishing.

1. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**. This one-time repository setting is required before the deployment job can succeed.
2. Open **Actions → Build, test and deploy GitHub Pages → Run workflow** (or push another change).
3. Use the Pages URL shown in the successful deployment. Expected project path: `https://gumshudatraveller.github.io/GumshudaTravellers/`.

Hash routing makes direct page links and reloads work on GitHub Pages without server rewrites. `VITE_BASE_PATH` is `/GumshudaTravellers/`. Change the workflow value to `/` if using a root custom domain.

**GitHub Pages cannot run Node.js or SQLite.** With no API configured, the site offers the local package catalogue, filtering, itinerary detail views, a saved-on-device custom planner, map exploration, printable plans and prefilled WhatsApp enquiries. Login explains availability, story posting does not falsely report success, and the admin studio is a read-only preview. The two static sample stories are clearly labelled examples from the supplied design.

## Host and connect the backend

Deploy the API on a Node.js 24 host with HTTPS and persistent disk, or use the included Dockerfile and Compose configuration behind an HTTPS reverse proxy. Do not deploy SQLite or uploads to ephemeral storage.

```sh
npm ci --omit=dev
npm start
# Or, after creating .env:
docker compose up -d --build
```

Set these **server-only** environment variables on the host:

| Variable         | Purpose                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `ADMIN_EMAIL`    | Initial administrator email                                                                                   |
| `ADMIN_PASSWORD` | Unique initial password, minimum 16 characters                                                                |
| `CLIENT_ORIGIN`  | Exact allowed browser origins, comma separated; for Pages use `https://gumshudatraveller.github.io` (no path) |
| `DATA_DIR`       | Persistent directory for SQLite                                                                               |
| `UPLOAD_DIR`     | Persistent directory for customer and admin media                                                             |
| `PORT`           | API port, default 3001                                                                                        |
| `TRUST_PROXY`    | Set to `1` only behind exactly one trusted reverse proxy                                                      |

Once the host responds at `https://YOUR-API-HOST/api/health`, add a GitHub **Actions repository variable** named `VITE_API_URL` with `https://YOUR-API-HOST/api`. Rerun the Pages workflow. This variable is public configuration, never a secret; all credentials stay on the server. The API URL is compiled into the frontend, so a rebuild is required after changing it.

The supplied Compose file binds the API only to the host loopback interface. Terminate HTTPS at your reverse proxy and forward to `127.0.0.1:3001`. Back up both the SQLite database and uploads. Use one API instance with this SQLite setup; a horizontally scaled service needs a shared database/object store. Configure disk quotas, monitoring and backups on the selected host before opening public uploads at scale.

## Working features

- Package search, nights/days filters, budget slider, travel styles, sorting and preferred departure date.
- Detail dialogs, daily itineraries, media/PDF attachments, customize action and browser print/save as PDF.
- Trip caption, date calendar, number of nights, traveler count, travel style, cab/self-drive/Tempo/Urbania, captain, photographer and marshal options.
- Preserved illustrative Figma route plus a real Leaflet/OpenStreetMap view. Search curated locations, inspect nearby attractions and add/reorder/remove stops. Nearby distances are approximate straight-line distances; connecting lines are **not road directions**. Locations currently cover Himachal and Kerala. Internet is required for map tiles.
- Local plan persistence, editable daily plans, estimate breakdown, review and quote requests. Estimates are illustrative, not binding quotes; the server calculates the estimate independently.
- Customer registration/login/logout with salted scrypt password hashes and expiring opaque bearer sessions. Browser sessions are stored in sessionStorage and expire after 24 hours.
- Authenticated photo/video stories, file previews, consent and moderation. Unapproved media requires its owner or an administrator to fetch it. Published stories and public itinerary assets can be viewed by visitors.
- Administrator itinerary draft/publish/edit, public cover selection, attachments, media uploads, request status tracking and story approval/rejection. A published itinerary must include every day.
- Persistent SQLite records and filesystem media. File type validation, 100 MB upload limit, randomized filenames, rate limits, exact-origin CORS and security headers.

## Content and operational boundaries

The Figma packages and starting prices are seed content and labelled indicative. Confirm prices, tax treatment, departures, inclusions, route feasibility and media rights before promoting them as bookable offers. Assets are copied from the supplied Figma; image metadata may identify generated imagery. The static sample stories are examples, not verified customer reviews. The backend starts with no customer stories or fake bookings.

Bookings are enquiry records that staff can quote and confirm; there is no payment gateway, live hotel inventory, automatic road routing, email notification service or password-recovery email provider configured. Staff check new enquiries in the admin studio. Business contact details are in `shared/data.js`. Admin site settings display those details; code-managed settings are not presented as editable controls.

## Project layout

```text
src/pages/          Five page implementations
src/components/     Shared controls, itinerary/enquiry dialog, interactive map
src/api.js          API configuration, local catalogue mode and asset paths
shared/data.js      Package seed content, places, contacts and estimate rules
server/app.js       Express routes, authentication, validation and SQLite storage
server/app.test.js  Integration coverage
public/assets/     Original downloaded Figma images/SVGs
.github/workflows/  Build, test and Pages deployment
```

## Validation

```sh
npm test
npm run build
```

Integration coverage checks anonymous/customer admin denial, registration role enforcement, login/logout, draft visibility, complete-day publication validation, enquiry dates, file-content rejection, private pending media, approval and persistence across server restarts.
