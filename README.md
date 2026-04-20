# ChoreBoard

Family chore tracker. Tracks tasks by time value, shows weekly totals per person, unlocks rewards.

## Stack

- Next.js 14 (App Router)
- Supabase (local, via Docker)
- Tailscale (phone access)

---

## Setup

### 1. Prerequisites

```bash
# Docker must be running
# Install Supabase CLI
npm install -g supabase

# Install Node deps
npm install
```

### 2. Start local Supabase

```bash
supabase init      # only needed once
supabase start     # starts Postgres + Studio in Docker
```

Copy the output values — you'll need the `API URL` and `anon key` and `service_role key`.

### 3. Apply the schema

```bash
# Option A: via CLI
supabase db push

# Option B: paste the SQL manually
# Open http://localhost:54323 → SQL Editor → paste contents of:
# supabase/migrations/001_initial_schema.sql
```

### 4. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
JWT_SECRET=<run: openssl rand -base64 32>
```

### 5. Create your first admin user

```bash
node scripts/seed-admin.js
```

Then add the rest of the family via the Admin panel in the app.

### 6. Run the app

```bash
# Development
npm run dev

# Production (bound to all interfaces for LAN/Tailscale access)
npm run build
npm start        # runs on 0.0.0.0:3000
```

---

## Phone Access via Tailscale

1. Install Tailscale on the Xubuntu laptop: `curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up`
2. Install the Tailscale app on each phone
3. All devices join the same Tailscale account
4. Access the app at `http://<laptop-tailscale-hostname>:3000`

Find your laptop's Tailscale hostname: `tailscale status`

---

## Run on boot (systemd)

Create `/etc/systemd/system/choreboard.service`:

```ini
[Unit]
Description=ChoreBoard
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=<your-username>
WorkingDirectory=/path/to/choreboard
ExecStartPre=/usr/bin/supabase start
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable choreboard
sudo systemctl start choreboard
```

---

## File Structure

```
app/
  login/          → PIN login screen
  dashboard/      → main view (tasks + weekly totals + rewards)
  admin/          → manage tasks, users, rewards
  api/
    auth/         → login / logout
    users/        → user CRUD
    tasks/        → task CRUD
    completions/  → mark done, weekly totals
    rewards/      → reward CRUD
lib/
  supabase.ts     → DB clients
  auth.ts         → JWT session helpers
  types.ts        → shared types
  utils.ts        → date helpers, formatMinutes
middleware.ts     → route protection
supabase/
  migrations/     → DB schema
scripts/
  seed-admin.js   → first-run admin creation
```

---

## Weekly Reset

Totals reset automatically — the dashboard always queries from Monday 00:00 of the current week. No cron needed.
