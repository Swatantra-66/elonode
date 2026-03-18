# ELONODE

A coding duel contest platform with a rating system based on a transparent percentile model. Following each contest, it calculates beaten participants to determine a percentile category, assigns a predefined standard performance rating, and updates the user rating using a controlled adjustment formula. Built with a decoupled architecture, it features a custom rating engine that calculates performance trajectories and stores historical match data.

## Live Website

- **Frontend:** [https://elonode.online](https://elonode.online)
- **Backend API:** Hosted on Render
- **Database:** Supabase (PostgreSQL)

## Tech Stack

**Frontend:**

- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **Authentication:** Clerk
- **3D Graphics:** Unicorn Studio (`unicornstudio-react`)
- **Animations:** Native CSS & `IntersectionObserver` (High-performance, zero-dependency scroll reveals)
- **Data Visualization:** Recharts
- **Icons:** Lucide React
- **Hosting:** Vercel

**Backend & Integrations:**

- **Language:** Go (Golang)
- **Web Framework:** Gin
- **ORM:** GORM
- **Hosting:** Render
- **Automations:** Make.com (Webhook processing)
- **Notifications:** Discord API

**Database:**

- **Provider:** Supabase
- **Type:** PostgreSQL (Relational Database)
- **Features:** ACID Compliance, Transactional integrity for rating updates

## Features

- **Authentication & Node Registration:** Secure, real-time user login via Clerk, automatically syncing new "Nodes" to the Go database.
- **Immersive 3D UI:** A terminal-style, dark-mode command center featuring glowing 3D typography and butter-smooth native CSS scroll animations.
- **Real-Time System Metrics:** Live sidebar tracking of Total Nodes, System Average Elo, Active Contests, and Engine Health status.
- **Contest Tracking:** Create and manage unique contests/matches via a secure Matchmaking Arena.
- **Rating Engine:** Custom Golang algorithm calculates rating changes and percentiles based on 1v1 match placements.
- **Transaction Safety:** Go backend utilizes database transactions to ensure that user ratings and rating histories are updated atomically.
- **Data Visualization:** Dynamic profile pages featuring interactive line charts to track a user's performance trajectory over time.
- **Role-Based Access Control:** Secure Admin Panel locked behind specific environment-variable UUIDs.
- **Automated Webhook Alerts:** Integrated Make.com to listen for specific backend events (like administrative contest deletions) and automatically push formatted, real-time alerts to a dedicated Discord channel.
- **Decoupled Architecture:** Clean separation of concerns between the Next.js client UI and the Golang REST API.

## System Architecture

<p align="center">
  <img src="./docs/elonode-flow.svg" alt="EloNode Architecture" width="100%"/>
</p>

1. **Client Layer:** Next.js provides a responsive UI. Forms submit match data (Winner/Loser UUIDs and Contest UUID) to the backend. Clerk handles session tokens.
2. **API Layer:** The Go backend receives the payload, validates the UUIDs, and triggers the `engine.Calculate()` logic.
3. **Database Layer:** GORM connects directly to Supabase via port 5432 (bypassing connection poolers for stable migrations). Atomic transactions ensure no data corruption occurs during concurrent rating updates.
4. **Event-Driven Webhooks:** Administrative actions (such as contest deletion) trigger external webhooks processed by Make.com, which formats and dispatches real-time alerts to a Discord server for system monitoring.

## Rating Algorithm

| Step | Formula                                                 |
| ---- | ------------------------------------------------------- |
| 1    | `Beaten = TotalParticipants − Rank`                     |
| 2    | `Percentile = Beaten / TotalParticipants`               |
| 3    | Lookup percentile bracket → Standard Performance Rating |
| 4    | `RatingChange = (Performance − OldRating) / 2`          |
| 5    | `NewRating = OldRating + RatingChange`                  |
| 6    | Derive Tier from NewRating                              |

### Percentile → Performance Brackets

| Percentile | Performance |
| ---------- | ----------- |
| Top 1%     | 1800        |
| Top 5%     | 1400        |
| Top 10%    | 1200        |
| Top 20%    | 1150        |
| Top 30%    | 1100        |
| Top 50%    | 1000        |
| Below 50%  | 900         |

### Tier Thresholds

| Tier        | Rating    | Color   |
| ----------- | --------- | ------- |
| Newbie      | < 1100    | Gray    |
| Apprentice  | 1100–1149 | Emerald |
| Specialist  | 1150–1199 | Cyan    |
| Expert      | 1200–1399 | Blue    |
| Master      | 1400–1799 | Purple  |
| Grandmaster | 1800+     | Rose    |

---

## Local Setup

### Prerequisites

- Node.js (v18+)
- Go (v1.20+)
- Supabase account and project
- Clerk account for authentication keys
- Make.com account for Discord webhook routing (optional for local dev)

### Installation & Execution

```bash
# 1. Clone the repository
git clone [https://github.com/Swatantra-66/contest-rating-system.git](https://github.com/Swatantra-66/contest-rating-system.git)
cd contest-rating-system

# 2. Setup the Go Backend
go mod tidy
echo "DATABASE_URL=postgres://postgres.xxx:your-password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" > .env
go run main.go &

# 3. Setup the Next.js Frontend
cd frontend
npm install
# Configure your .env.local file based on the reference section below
npm run dev
```

_Backend runs on `http://localhost:8080` | Frontend runs on `http://localhost:3000`_

## Environment Variables Reference

Ensure these are set in your deployment environments (Vercel & Render) and **never committed to version control**.

**Backend (`.env`)**

- `LOCAL_DATABASE_URL`: Your local PostgreSQL connection string (for local testing).
- `DATABASE_URL`: Your production Supabase PostgreSQL connection string.
- `PORT`: Port for the Go server (default `8080`).
- `ADMIN_SECRET`: Custom secret key for authenticating backend admin operations.
- `WEBHOOK_URL`: Your unique Make.com or external webhook URL for routing alerts.
- `CLERK_SECRET_KEY`: Clerk backend auth key for verifying session tokens.

**Frontend (`.env.local`)**

- `NEXT_PUBLIC_API_URL`: URL pointing to your Go backend (`http://localhost:8080/api/` for dev).
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk Frontend Auth Key (required for UI).
- `CLERK_SECRET_KEY`: Clerk Backend Auth Key.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: Clerk sign-in route (e.g., `/sign-in`).
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: Clerk sign-up route (e.g., `/sign-up`).
- `NEXT_PUBLIC_ADMIN_USER_ID`: The specific Clerk User ID authorized to access the Admin Panel.
