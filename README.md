# DocuMind

**DocuMind** is an AI-powered document intelligence platform engineered for uploading PDF, DOCX, and TXT documents, organizing them, generating AI summaries, and asking contextual questions using semantic vector search.

This repository is set up with a clean, high-performance monorepo architecture managed by **npm workspaces** and **Turborepo**.

---

## 🏗️ Architecture & Tech Stack

| Layer                     | Technology                 | Details                                                      |
| :------------------------ | :------------------------- | :----------------------------------------------------------- |
| **Monorepo**              | Turborepo + npm workspaces | Parallel builds, caching, task orchestration                 |
| **Frontend** (`apps/web`) | Next.js 15 (App Router)    | React 19, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons  |
| **Backend** (`apps/api`)  | NestJS 11                  | TypeScript, REST API, Validation Pipes, Global Error Filters |
| **Database & ORM**        | PostgreSQL + Prisma ORM    | Relational document & chunk schemas (pgvector ready)         |
| **AI (Upcoming)**         | OpenAI & pgvector          | Embeddings generation, semantic search, document Q&A         |

---

## 📁 Repository Structure

```text
documind/
├── apps/
│   ├── api/                   # NestJS REST API server (Port 4000)
│   │   ├── prisma/
│   │   │   └── schema.prisma  # Prisma schema (PostgreSQL)
│   │   ├── src/
│   │   │   ├── common/        # Shared filters, pipes, interceptors
│   │   │   │   └── filters/   # HttpExceptionFilter for standardized errors
│   │   │   ├── health/        # Health check module (GET /api/health)
│   │   │   ├── prisma/        # PrismaService & PrismaModule
│   │   │   ├── app.module.ts  # Root application module
│   │   │   └── main.ts        # Bootstrap with CORS, validation, prefix
│   │   ├── .env.example       # API environment variable templates
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                   # Next.js App Router application (Port 3000)
│       ├── src/
│       │   ├── app/           # App Router pages, layout, and global CSS
│       │   ├── components/    # Reusable UI components
│       │   └── lib/           # Utility functions (cn for Tailwind/shadcn)
│       ├── .env.example       # Frontend environment variable templates
│       ├── components.json    # shadcn/ui configuration
│       ├── next.config.mjs
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── tailwind.config.ts
│       └── tsconfig.json
│
├── packages/                  # Workspace directory for future shared packages
│   └── .gitkeep
│
├── .gitignore                 # Monorepo-wide gitignore
├── package.json               # Root package.json defining workspaces & scripts
├── README.md                  # Project documentation
└── turbo.json                 # Turborepo task pipeline configuration
```

---

## ⚙️ Environment Configuration

### 1. Backend (`apps/api`)

Copy `.env.example` to `.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

Default values:

```env
PORT=4000
NODE_ENV=development
API_PREFIX=api
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/documind?schema=public"
```

### 2. Frontend (`apps/web`)

Copy `.env.example` to `.env.local`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Default values:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## 🚀 Getting Started

### 1. Install Dependencies

Run from the root directory:

```bash
npm install
```

### 2. Generate Prisma Client

Generate the Prisma client code for the database schema:

```bash
npm run prisma:generate --workspace=@documind/api
```

### 3. Start Development Servers

Run both applications concurrently using Turborepo:

```bash
npm run dev
```

Both apps will start concurrently:

- **Frontend (Next.js)**: [http://localhost:3000](http://localhost:3000)
- **Backend (NestJS API)**: [http://localhost:4000/api](http://localhost:4000/api)
- **Health Check Endpoint**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## 🛠️ Monorepo Commands

| Command          | Action                                                              |
| :--------------- | :------------------------------------------------------------------ |
| `npm run dev`    | Starts both `apps/web` (:3000) and `apps/api` (:4000) in watch mode |
| `npm run build`  | Builds all applications in parallel                                 |
| `npm run lint`   | Lints all packages and apps with ESLint                             |
| `npm run clean`  | Cleans build artifacts (`dist`, `.next`, cache)                     |
| `npm run format` | Formats codebase using Prettier                                     |

To target a single app:

```bash
# Run only the API
npm run dev --workspace=@documind/api

# Run only the Web app
npm run dev --workspace=@documind/web
```

---

## 🩺 Health Check Verification

The backend exposes a standardized health check endpoint at:

```http
GET http://localhost:4000/api/health
```

Sample JSON response:

```json
{
  "status": "ok",
  "service": "DocuMind API",
  "version": "0.1.0",
  "environment": "development",
  "uptime": 142,
  "timestamp": "2026-11-01T15:00:00.000Z"
}
```

---

## 🛡️ Error Handling

The API utilizes a centralized `HttpExceptionFilter` producing uniform error responses:

```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2026-11-01T15:00:00.000Z",
  "path": "/api/non-existent-route",
  "error": "Not Found",
  "message": "Cannot GET /api/non-existent-route"
}
```
