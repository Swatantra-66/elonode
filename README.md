# ELONODE

A high-performance, full-stack application designed to track user ratings and percentiles across competitive programming or 1v1 match environments. Built with a decoupled architecture, it features a custom rating engine that calculates performance trajectories and stores historical match data.

## Live Demo

- **Frontend:** [https://elonode.vercel.app](https://elonode.vercel.app/)
- **Backend API:** Hosted on Render
- **Database:** Supabase (PostgreSQL)

## Tech Stack

**Frontend:**

- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **Data Visualization:** Recharts
- **Icons:** Lucide React
- **Hosting:** Vercel

**Backend:**

- **Language:** Go (Golang)
- **Web Framework:** Gin
- **ORM:** GORM
- **Hosting:** Render

**Database:**

- **Provider:** Supabase
- **Type:** PostgreSQL (Relational Database)
- **Features:** ACID Compliance, Transactional integrity for rating updates

## Features

- **User Management:** Generate unique user profiles with starting baseline ratings.
- **Contest Tracking:** Create and manage unique contests/matches.
- **Rating Engine:** Custom Golang algorithm calculates rating changes and percentiles based on 1v1 match placements.
- **Transaction Safety:** Go backend utilizes database transactions to ensure that user ratings and rating histories are updated atomically.
- **Data Visualization:** Dynamic profile pages featuring interactive line charts to track a user's performance trajectory over time.
- **Decoupled Architecture:** Clean separation of concerns between the Next.js client UI and the Golang REST API.

## System Architecture

1. **Client Layer:** Next.js provides a responsive UI. Forms submit match data (Winner/Loser UUIDs and Contest UUID) to the backend.
2. **API Layer:** The Go backend receives the payload, validates the UUIDs, and triggers the `engine.Calculate()` logic.
3. **Database Layer:** GORM connects directly to Supabase via port 5432 (bypassing connection poolers for stable migrations). Atomic transactions ensure no data corruption occurs during concurrent rating updates.

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

| Tier        | Rating    | Color  |
| ----------- | --------- | ------ |
| Newbie      | < 1100    | Gray   |
| Apprentice  | 1100–1149 | Green  |
| Specialist  | 1150–1199 | Blue   |
| Expert      | 1200–1399 | Purple |
| Master      | 1400–1799 | Gold   |
| Grandmaster | 1800+     | Red    |

---

## Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Go](https://golang.org/) (v1.20+)
- A [Supabase](https://supabase.com/) account and project

### 1. Clone the repository

```bash
git clone https://github.com/Swatantra-66/contest-rating-system.git
cd contest-rating-system
```

### 2. Setup the Go Backend

```bash

# Navigate to backend directory (if applicable, or root)

go mod tidy

# Create a .env file for your database connection

echo "DATABASE_URL=postgres://postgres.xxx:your-password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" > .env

# Run the Go server

go run main.go

```

_The server will start on `http://localhost:8080`_

### 3. Setup the Next.js Frontend

```bash

# Navigate to the frontend directory

cd frontend

# Install dependencies

npm install

# Create a .env.local file

echo "NEXT_PUBLIC_API_URL=http://localhost:8080/api/" > .env.local

# Start the development server

npm run dev
```

_The frontend will start on `http://localhost:3000`_

## Environment Variables Reference

Ensure these are set in your deployment environments (Vercel & Render) and **never committed to version control**.

**Backend (`.env`)**

- `DATABASE_URL`: Your Supabase PostgreSQL connection string (Ensure port 5432 is used for GORM compatibility).

**Frontend (`.env.local`)**

- `NEXT_PUBLIC_API_URL`: https://contest-rating-system.onrender.com/api/
