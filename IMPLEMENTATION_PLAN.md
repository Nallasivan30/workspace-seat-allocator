# Ethara Seat Allocation & Project Mapping System
## IMPLEMENTATION_PLAN.md

**Document Owner:** Senior Software Architect / Tech Lead
**Purpose:** Single source of truth for design and development
**Timebox:** 24–48 hours
**Status:** Approved for Development

---

# 1. Project Overview

## 1.1 Purpose

Ethara Seat Allocation & Project Mapping System is a full-stack, internal HR-operations tool used to manage physical seating and project staffing for an organization of approximately 5,000 employees, spread across multiple buildings, floors, and seats. The system replaces spreadsheet-driven seat tracking with a searchable, auditable, analytics-rich web application. It gives facilities/HR admins the ability to:

- Onboard and manage employee records
- Map employees to one or more projects
- Allocate, reallocate, and release physical seats
- Onboard new joiners quickly with guided seat allocation
- Search and filter across employees, seats, and projects instantly
- View dashboards and analytics on utilization, headcount, and project distribution
- Ask natural-language questions about the data via an AI Assistant

## 1.2 Goals

1. Deliver a working, demoable full-stack application within the 24–48 hour window.
2. Demonstrate production-grade architecture patterns (layered backend, typed frontend, migrations, seed scripts) without introducing infrastructure overhead unsuited to the timebox.
3. Support realistic scale (5,000 employees, ~5,000+ seats, ~50-150 projects, multiple buildings/floors) with acceptable UI and query performance.
4. Provide a REST API that is self-documenting (OpenAPI/Swagger) and independently testable.
5. Provide a lightweight but genuinely useful AI Assistant for natural-language queries over the data (not just a chat gimmick).
6. Leave the codebase in a state that a reviewer (human or AI) can read, understand, run, and extend without additional context.

## 1.3 Functional Scope

- **Employee Management:** CRUD for employee records (name, email, employee code, department, designation, status, joining date, reporting manager).
- **Project Mapping:** CRUD for projects; many-to-many mapping between employees and projects with role and allocation percentage.
- **Seat Allocation:** Assign an employee to a specific seat (building → floor → seat), with history.
- **Seat Release:** Vacate a seat, mark it available, log the release reason and timestamp.
- **New Joiner Allocation:** A guided flow that takes an unassigned new employee and suggests/allocates the best-fit available seat.
- **Search:** Global search across employees, seats, and projects by name/code/email/seat number.
- **Filters:** Filter employees/seats by department, project, building, floor, status, availability.
- **Dashboard:** KPI cards and charts summarizing headcount, seat utilization, and project distribution.
- **Analytics:** Deeper breakdowns — utilization by building/floor, project staffing over time, department distribution.
- **AI Assistant:** Natural-language Q&A translated into safe, parameterized queries against the data (e.g., "How many empty seats are on Floor 3 of Building A?").
- **REST APIs:** Fully documented endpoints for all the above, versioned under `/api/v1`.
- **Seed Data:** Deterministic, repeatable script to generate ~5,000 employees, buildings, floors, seats, projects, and allocations for demo/testing.

## 1.4 Non-Functional Scope

- **Performance:** Paginated list endpoints must respond in <300ms on seeded data of 5,000 employees on typical dev hardware (indexed queries only, no full table scans).
- **Usability:** Responsive UI (desktop-first, usable on tablet), consistent design system via Shadcn UI + Tailwind.
- **Maintainability:** Clear separation of concerns (routers/services/repositories on backend; feature folders on frontend), typed end-to-end (TypeScript + Pydantic).
- **Reliability:** Input validation at both frontend (Zod) and backend (Pydantic) layers; DB constraints as the final safety net.
- **Observability (lightweight):** Structured logging on the backend; error boundaries and toasts on the frontend.
- **Security (proportionate to scope):** No public auth provider integration required, but the design must not preclude adding real auth; basic role concept included for HR Admin vs. Viewer.
- **Portability:** Runs locally via Docker Compose (Postgres) and is deployable to Vercel (frontend) + Railway/Render (backend + DB) with no code changes, only env vars.

## 1.5 Assumptions

- This is an internal tool; end users are HR/Facilities admins, not the 5,000 employees themselves (employees are *data subjects*, not *users*, in v1).
- Single-tenant application — one organization's data, not multi-tenant SaaS.
- Authentication can be a simple single-role or two-role (Admin/Viewer) scheme using a lightweight session/JWT approach; SSO/OAuth is out of scope but the design should not block adding it later.
- "AI Assistant" uses an LLM (OpenAI-compatible API) purely as a **natural-language-to-query translator with a fixed, whitelisted set of read-only query templates** — not as a general chatbot with raw DB access. This is a deliberate safety and scope decision, documented in Section 12.
- Seat capacity is fixed per seed run (no floor-plan editor UI in v1) — buildings/floors/seats are generated by the seed script and only their allocation *state* changes at runtime, though CRUD endpoints for buildings/floors/seats still exist for completeness and future floor-plan management.
- Deployment targets (Vercel/Railway/Render) are assumed to be available with free/hobby tiers sufficient for demo purposes.

## 1.6 Out of Scope

- Real single sign-on / enterprise identity provider integration (Okta, Azure AD, etc.)
- Multi-tenant support
- Mobile native apps
- Real-time collaborative editing (WebSockets/live seat map updates) — polling/refetch is sufficient for v1
- Interactive drag-and-drop floor-plan editor (seats are represented as structured data + list/grid views, not a pixel-accurate floor map canvas) — noted as a stretch goal
- Payroll, leave management, or any HRMS functionality beyond employee/project/seat mapping
- Automated CI/CD pipelines beyond a simple GitHub Actions lint/test workflow (described conceptually, not required to be fully wired)
- Email/notification systems (e.g., notifying an employee their seat changed)

---

# 2. System Architecture

## 2.1 Architecture Diagram (ASCII)

```
                              ┌────────────────────────────────────────────┐
                              │                 CLIENTS                    │
                              │   Browser (HR Admin / Viewer) - Desktop    │
                              └───────────────────┬────────────────────────┘
                                                   │ HTTPS
                                                   ▼
                        ┌──────────────────────────────────────────────────┐
                        │                FRONTEND (Vercel)                │
                        │  Next.js 14 (App Router) + React + TypeScript   │
                        │  Tailwind CSS + Shadcn UI + TanStack Query      │
                        │  React Hook Form + Zod                          │
                        │                                                  │
                        │  - Server Components for initial page shells    │
                        │  - Client Components for interactive tables/     │
                        │    forms/charts                                 │
                        │  - lib/api-client.ts (typed fetch wrapper)      │
                        └───────────────────┬──────────────────────────────┘
                                            │ REST (JSON over HTTPS)
                                            │ /api/v1/*
                                            ▼
                        ┌──────────────────────────────────────────────────┐
                        │               BACKEND (Railway/Render)          │
                        │                    FastAPI                      │
                        │                                                  │
                        │  Routers  →  Services  →  Repositories → ORM    │
                        │  Pydantic Schemas (request/response)            │
                        │  SQLAlchemy Models + Alembic Migrations         │
                        │  AI Module (LLM call + query templates)         │
                        │  Middleware: CORS, error handler, logging        │
                        └───────────────────┬──────────────────────────────┘
                                            │ SQL (asyncpg / psycopg)
                                            ▼
                        ┌──────────────────────────────────────────────────┐
                        │           DATABASE (Railway PostgreSQL)         │
                        │  employees, projects, employee_projects,        │
                        │  buildings, floors, seats, seat_assignments,    │
                        │  seat_release_logs, users (auth)                │
                        └──────────────────────────────────────────────────┘

                        External:
                        ┌──────────────────────────────────────────────────┐
                        │   OpenAI-compatible LLM API (AI Assistant only) │
                        │   Called server-side from Backend AI Module     │
                        └──────────────────────────────────────────────────┘
```

## 2.2 Frontend

- **Framework:** Next.js 14+ (App Router), React 18, TypeScript (strict mode).
- **Styling:** Tailwind CSS + Shadcn UI component primitives (Radix-based), giving accessible, themeable components without a heavy design system.
- **Data Fetching/Caching:** TanStack Query for all server-state (lists, details, mutations), with query keys namespaced by resource (`['employees', filters]`, `['seats', floorId]`, etc.).
- **Forms:** React Hook Form + Zod resolvers for all create/edit forms — the same Zod schemas are (conceptually) mirrored on the backend Pydantic models to keep validation rules in sync.
- **Rendering strategy:** Server Components for route shells and SEO-irrelevant static chrome; Client Components (`"use client"`) for anything interactive (tables, forms, charts, AI chat).

## 2.3 Backend

- **Framework:** FastAPI (async), Uvicorn ASGI server.
- **ORM:** SQLAlchemy 2.0 (async engine), models in `app/models`.
- **Migrations:** Alembic, one migration per schema change, autogenerate + manual review.
- **Validation:** Pydantic v2 schemas per resource, split into `Create`, `Update`, `Read` variants.
- **Layering:** Router (HTTP concerns) → Service (business logic) → Repository (data access) → SQLAlchemy model. This keeps business rules (e.g., "a seat cannot be double-booked") out of the HTTP layer and out of raw queries scattered across the codebase.

## 2.4 Database

- **Engine:** PostgreSQL 15+.
- **Design:** Fully normalized core schema (3NF) for employees/projects/seats, with narrow, well-indexed join tables for many-to-many relationships (employee↔project) and history tables for seat assignment/release audit trails.
- **Why Postgres:** Strong relational integrity for a system whose core value proposition *is* referential correctness (an employee cannot occupy two seats; a seat cannot be double-booked), plus first-class support on both Railway and Render.

## 2.5 Deployment

| Layer | Provider | Notes |
|---|---|---|
| Frontend | Vercel | Next.js first-class support, preview deployments per PR |
| Backend | Railway or Render | Dockerized FastAPI service, env-var based config |
| Database | Railway PostgreSQL | Managed Postgres, connection string via env var |

Full details in Section 23.

## 2.6 Communication Flow

1. Browser loads a route (e.g., `/employees`) → Next.js Server Component renders shell and (optionally) does an initial server-side fetch for first paint.
2. Client Components hydrate and take over data fetching via TanStack Query, calling `NEXT_PUBLIC_API_BASE_URL + /api/v1/employees?...`.
3. FastAPI router validates query params (Pydantic), delegates to `EmployeeService`, which calls `EmployeeRepository`, which runs a SQLAlchemy query against Postgres.
4. Response is serialized via a Pydantic `Read` schema and returned as JSON.
5. TanStack Query caches the response by query key; mutations (create/update/delete) invalidate the relevant query keys to refetch fresh data.
6. AI Assistant flow: user question → `/api/v1/ai/query` → AI Service builds a constrained prompt (with schema/tool description) → LLM returns a structured "intent + parameters" object → AI Service maps that to one of a fixed set of whitelisted repository queries → result is returned as structured JSON + a natural-language summary.

## 2.7 Folder Responsibilities (high level; full trees in Section 20)

- `frontend/app/*` — route segments (pages), colocated loading/error/empty states.
- `frontend/components/*` — reusable UI (tables, cards, charts, forms).
- `frontend/lib/*` — API client, query hooks, Zod schemas, utils.
- `backend/app/routers/*` — thin HTTP layer, one file per resource.
- `backend/app/services/*` — business logic, orchestration, validation beyond schema-level.
- `backend/app/repositories/*` — all SQLAlchemy query code, no business logic.
- `backend/app/models/*` — SQLAlchemy ORM models (one file per table or logical group).
- `backend/app/schemas/*` — Pydantic request/response models.
- `backend/scripts/seed.py` — seed data generator.
- `backend/alembic/*` — migrations.

---

# 3. High-Level Design (Modules)

## 3.1 Employee Module
**Responsibility:** Own the employee entity lifecycle — creation, update, soft-deactivation, retrieval, and search-by-attribute. Enforces uniqueness of employee code/email, validates department/designation values, and exposes the "unassigned employees" view used by the New Joiner Allocation flow. Does not know about seats or projects directly beyond exposing IDs/foreign keys — actual assignment logic lives in the Seat and Project modules, which reference employees.

## 3.2 Project Module
**Responsibility:** Own project entities (name, code, client, status, start/end dates) and the employee↔project mapping (`employee_projects`), including role on project and allocation percentage. Validates that allocation percentage per employee across active projects does not exceed 100% (business rule, soft-warn rather than hard-block, documented in Section 15).

## 3.3 Seat Module
**Responsibility:** Own the `seats` and `seat_assignments`/`seat_release_logs` tables. Provides allocate/release operations with concurrency-safe checks (a seat can have at most one *active* assignment at a time), seat status derivation (`available`, `occupied`, `reserved`, `maintenance`), and the "find best available seat" query used by New Joiner Allocation.

## 3.4 Floor Module
**Responsibility:** Own `floors` (belongs to a building), including floor capacity metadata and floor-level utilization aggregation queries used by Analytics.

## 3.5 Building Module
**Responsibility:** Own `buildings` (top of the physical hierarchy: Building → Floor → Seat), including building metadata (name, address/location, total capacity) and building-level utilization rollups.

## 3.6 Dashboard Module
**Responsibility:** Aggregate read-only endpoints that compute KPI numbers and chart-ready data (headcount, seat utilization %, project distribution, department distribution) via optimized aggregate SQL queries (COUNT/GROUP BY), not by pulling raw rows into Python.

## 3.7 AI Module
**Responsibility:** Accept a natural-language question, build a constrained prompt describing the whitelisted set of "query intents" (e.g., `count_empty_seats_by_floor`, `list_employees_by_project`, `utilization_by_building`), call the LLM to classify intent + extract parameters, validate the LLM's structured output against a Pydantic schema, execute the corresponding safe repository query, and return both the raw data and an LLM-generated natural-language summary of it. Never lets the LLM write or execute arbitrary SQL.

## 3.8 Search Module
**Responsibility:** Provide a single `/api/v1/search?q=` endpoint that fans out to lightweight `ILIKE`/trigram-friendly queries across employees (name, code, email), seats (seat number), and projects (name, code), merging and ranking results by relevance (exact match > prefix match > substring match) and entity type.

## 3.9 Authentication Module
**Responsibility:** Minimal but real — issue a JWT on login (seeded admin user), validate the JWT on protected routes via a FastAPI dependency, and expose a `role` claim (`admin` | `viewer`) used by the frontend to hide/disable mutating actions for viewers. Documented fully in Section 17; deliberately simple to fit the timebox.

## 3.10 Analytics Module
**Responsibility:** Deeper, filterable versions of Dashboard aggregates — utilization trends, project staffing breakdowns by department, seat turnover (allocations/releases over a date range) — built on the same aggregate-query approach as the Dashboard module, exposed as separate endpoints under `/api/v1/analytics/*` to keep Dashboard endpoints fast and simple.

---

# 4. Database Design

All tables use `id BIGSERIAL PRIMARY KEY` unless noted, `created_at` / `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` on every table (updated via trigger or ORM `onupdate`), and soft-delete via `is_active BOOLEAN NOT NULL DEFAULT true` where deactivation (not hard delete) is the business-correct behavior (employees, projects, seats).

## 4.1 `buildings`
**Purpose:** Top-level physical location.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| name | VARCHAR(100) UNIQUE NOT NULL | e.g. "Tower A" |
| code | VARCHAR(20) UNIQUE NOT NULL | e.g. "BLD-A" |
| address | TEXT NULL | |
| total_floors | INT NOT NULL DEFAULT 0 | denormalized cache, kept in sync by Floor Module |
| is_active | BOOLEAN NOT NULL DEFAULT true | |
| created_at / updated_at | TIMESTAMPTZ | |

- **Indexes:** unique index on `code`, `name`.
- **Relationships:** 1-to-many -> `floors`.
- **Constraints:** `code` uppercase alnum + dash, enforced at Pydantic + `CHECK (code ~ '^[A-Z0-9-]+$')`.
- **Business Rules:** A building cannot be deactivated while it has active floors with occupied seats (checked in service layer).

## 4.2 `floors`
**Purpose:** Floor within a building.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| building_id | BIGINT FK -> buildings.id NOT NULL | |
| floor_number | INT NOT NULL | e.g. 3 |
| name | VARCHAR(100) NULL | e.g. "3rd Floor - Engineering" |
| total_seats | INT NOT NULL DEFAULT 0 | denormalized cache |
| is_active | BOOLEAN NOT NULL DEFAULT true | |
| created_at / updated_at | TIMESTAMPTZ | |

- **Primary Key:** `id`.
- **Foreign Keys:** `building_id -> buildings.id ON DELETE RESTRICT`.
- **Indexes:** UNIQUE (`building_id`, `floor_number`); index on `building_id`.
- **Relationships:** many-to-one -> `buildings`; 1-to-many -> `seats`.
- **Business Rules:** `floor_number` unique per building.

## 4.3 `seats`
**Purpose:** An individual physical seat.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| floor_id | BIGINT FK -> floors.id NOT NULL | |
| seat_code | VARCHAR(30) NOT NULL | e.g. "A-3-042" |
| seat_type | VARCHAR(20) NOT NULL DEFAULT 'standard' | standard / workstation / cabin / hotdesk |
| status | VARCHAR(20) NOT NULL DEFAULT 'available' | available / occupied / reserved / maintenance |
| is_active | BOOLEAN NOT NULL DEFAULT true | |
| created_at / updated_at | TIMESTAMPTZ | |

- **Foreign Keys:** `floor_id -> floors.id ON DELETE RESTRICT`.
- **Indexes:** UNIQUE (`floor_id`, `seat_code`); INDEX on `status` (heavily filtered); INDEX on `floor_id`.
- **Relationships:** many-to-one -> `floors`; 1-to-many (historical) -> `seat_assignments`.
- **Constraints:** `CHECK (status IN ('available','occupied','reserved','maintenance'))`.
- **Business Rules:** `status` is a derived/cached field kept consistent by the Seat Service whenever an assignment is created/released. The single source of truth for "is this seat currently taken" is the existence of an active row in `seat_assignments` (`released_at IS NULL`); `seats.status` is denormalized for fast filtering/search.

## 4.4 `employees`
**Purpose:** Core employee record.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| employee_code | VARCHAR(20) UNIQUE NOT NULL | e.g. "EMP10234" |
| first_name | VARCHAR(80) NOT NULL | |
| last_name | VARCHAR(80) NOT NULL | |
| email | VARCHAR(150) UNIQUE NOT NULL | |
| department | VARCHAR(80) NOT NULL | e.g. Engineering |
| designation | VARCHAR(80) NOT NULL | e.g. Senior Software Engineer |
| status | VARCHAR(20) NOT NULL DEFAULT 'active' | active / on_leave / exited |
| joining_date | DATE NOT NULL | |
| exit_date | DATE NULL | |
| reporting_manager_id | BIGINT FK -> employees.id NULL | self-referencing |
| is_active | BOOLEAN NOT NULL DEFAULT true | |
| created_at / updated_at | TIMESTAMPTZ | |

- **Foreign Keys:** `reporting_manager_id -> employees.id ON DELETE SET NULL` (self-referential, nullable).
- **Indexes:** UNIQUE (`employee_code`), UNIQUE (`email`); INDEX on `department`; INDEX on `status`; trigram/GIN index on `(first_name || ' ' || last_name)` for fast search (`pg_trgm` extension).
- **Relationships:** 1-to-many -> `employee_projects`; 1-to-many (historical) -> `seat_assignments`; self 1-to-many -> direct reports.
- **Business Rules:** an employee with `status = 'exited'` cannot hold an active seat assignment or active project mapping - enforced by service layer on status transition (auto-release seat + close project mappings).

## 4.5 `projects`
**Purpose:** Client/internal project.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| project_code | VARCHAR(30) UNIQUE NOT NULL | |
| name | VARCHAR(150) NOT NULL | |
| client_name | VARCHAR(150) NULL | |
| status | VARCHAR(20) NOT NULL DEFAULT 'active' | active / on_hold / closed |
| start_date | DATE NOT NULL | |
| end_date | DATE NULL | |
| is_active | BOOLEAN NOT NULL DEFAULT true | |
| created_at / updated_at | TIMESTAMPTZ | |

- **Indexes:** UNIQUE (`project_code`); INDEX on `status`; INDEX on `name` (trigram, for search).
- **Relationships:** 1-to-many -> `employee_projects`.

## 4.6 `employee_projects` (join table)
**Purpose:** Many-to-many employee<->project mapping with metadata.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| employee_id | BIGINT FK -> employees.id NOT NULL | |
| project_id | BIGINT FK -> projects.id NOT NULL | |
| role_on_project | VARCHAR(80) NOT NULL | e.g. "Backend Developer" |
| allocation_percent | SMALLINT NOT NULL DEFAULT 100 | 1-100 |
| start_date | DATE NOT NULL | |
| end_date | DATE NULL | NULL = currently active mapping |
| created_at / updated_at | TIMESTAMPTZ | |

- **Foreign Keys:** `employee_id -> employees.id ON DELETE CASCADE`; `project_id -> projects.id ON DELETE CASCADE`.
- **Indexes:** UNIQUE (`employee_id`, `project_id`, `start_date`) to allow historical re-mapping; INDEX on `project_id`; INDEX on `employee_id`; partial INDEX on `(employee_id) WHERE end_date IS NULL` (fast "current projects" lookup).
- **Constraints:** `CHECK (allocation_percent BETWEEN 1 AND 100)`.
- **Business Rules:** sum of `allocation_percent` across an employee's mappings where `end_date IS NULL` should not exceed 100 - enforced in Service layer as a soft validation (warn, allow override) since real orgs occasionally over-allocate temporarily.

## 4.7 `seat_assignments`
**Purpose:** Current + historical record of who sits where.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| seat_id | BIGINT FK -> seats.id NOT NULL | |
| employee_id | BIGINT FK -> employees.id NOT NULL | |
| assigned_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| released_at | TIMESTAMPTZ NULL | NULL = currently active |
| assigned_by_user_id | BIGINT FK -> users.id NULL | |
| notes | TEXT NULL | |

- **Foreign Keys:** `seat_id -> seats.id ON DELETE RESTRICT`; `employee_id -> employees.id ON DELETE CASCADE`.
- **Indexes:** partial UNIQUE index on `(seat_id) WHERE released_at IS NULL` (guarantees a seat has at most one active occupant, see Section 11); partial UNIQUE index on `(employee_id) WHERE released_at IS NULL` (an employee holds at most one active seat); INDEX on `employee_id`; INDEX on `seat_id`.
- **Business Rules:** creating a new active assignment for a seat/employee that already has one is rejected at the DB level by the partial unique indexes (last line of defense) and pre-checked in the service layer (first line of defense, for a clean error message instead of a raw integrity error).

## 4.8 `seat_release_logs`
**Purpose:** Explicit audit trail of releases (kept separate from `seat_assignments.released_at` to allow richer release metadata without bloating the assignment table).

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| seat_assignment_id | BIGINT FK -> seat_assignments.id NOT NULL UNIQUE | one log row per assignment |
| released_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| released_by_user_id | BIGINT FK -> users.id NULL | |
| reason | VARCHAR(50) NOT NULL | resigned / relocated / project_change / other |
| notes | TEXT NULL | |

- **Foreign Keys:** `seat_assignment_id -> seat_assignments.id ON DELETE CASCADE`.
- **Indexes:** UNIQUE (`seat_assignment_id`); INDEX on `released_at` (for analytics/date-range queries).

## 4.9 `users` (auth)
**Purpose:** Admin/viewer accounts for the tool itself (not employee records).

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| email | VARCHAR(150) UNIQUE NOT NULL | |
| hashed_password | VARCHAR(255) NOT NULL | bcrypt |
| role | VARCHAR(20) NOT NULL DEFAULT 'viewer' | admin / viewer |
| is_active | BOOLEAN NOT NULL DEFAULT true | |
| created_at / updated_at | TIMESTAMPTZ | |

- **Indexes:** UNIQUE (`email`).
- **Business Rules:** at least one `admin` user must exist at all times (checked when deactivating the last admin).

---

# 5. ER Diagram (Text-Based)

```
buildings (1) --< (many) floors (1) --< (many) seats
                                              |
                                              | (1)
                                              v (many, historical; 1 active via partial unique idx)
                                       seat_assignments >-- (many,1) employees
                                              |                     |
                                              | (1)                 | (many)
                                              v                     v
                                     seat_release_logs      employee_projects >-- (many,1) projects

employees (self FK: reporting_manager_id -> employees.id)

users --< assigned_by_user_id / released_by_user_id  (referenced from seat_assignments / seat_release_logs)
```

**Cardinality summary**
- `buildings 1-N floors`
- `floors 1-N seats`
- `seats 1-N seat_assignments` (only 0..1 *active* at a time - enforced by partial unique index)
- `employees 1-N seat_assignments` (only 0..1 *active* at a time)
- `seat_assignments 1-1 seat_release_logs` (only when released)
- `employees N-N projects` via `employee_projects`
- `employees 1-N employees` (self join: manager -> direct reports)
- `users 1-N seat_assignments / seat_release_logs` (as actor, nullable)

---

# 6. API Design

All endpoints are prefixed `/api/v1`. All list endpoints support `page`, `page_size` (default 20, max 100), and return an envelope:

```json
{ "items": [], "total": 5000, "page": 1, "page_size": 20, "total_pages": 250 }
```

All mutating endpoints (except `/auth/login`) require `Authorization: Bearer <JWT>`; `admin` role required for create/update/delete, `viewer` role sufficient for GET.

## 6.1 Auth
| Method | URL | Purpose |
|---|---|---|
| POST | `/auth/login` | Exchange email+password for JWT |
| GET | `/auth/me` | Return current user profile from token |

**POST /auth/login** - Request: `{ email, password }`. Response `200`: `{ access_token, token_type, user }`. Errors: `401` invalid credentials, `422` validation.

## 6.2 Employees
| Method | URL | Purpose |
|---|---|---|
| GET | `/employees` | List/search/filter employees |
| GET | `/employees/{id}` | Get one employee (+ current project/seat) |
| POST | `/employees` | Create employee |
| PATCH | `/employees/{id}` | Update employee |
| DELETE | `/employees/{id}` | Soft-deactivate employee |
| GET | `/employees/unassigned` | Employees with no active seat (New Joiner flow) |

**GET /employees** - Query: `q`, `department`, `status`, `project_id`, `has_seat`, `page`, `page_size`, `sort`. Response `200`: paginated `EmployeeRead[]`. Errors: `422` bad query params.

**POST /employees** - Request `EmployeeCreate`: `{ employee_code, first_name, last_name, email, department, designation, joining_date, reporting_manager_id? }`. Response `201`: `EmployeeRead`. Errors: `409` duplicate email/code, `422` validation, `400` manager not found.

**DELETE /employees/{id}** - Soft delete; cascades to auto-release active seat and close active project mappings (Section 11). Response `204`. Errors: `404` not found.

## 6.3 Projects
| Method | URL | Purpose |
|---|---|---|
| GET | `/projects` | List/search/filter projects |
| GET | `/projects/{id}` | Get one project + staffed employees |
| POST | `/projects` | Create project |
| PATCH | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Soft-deactivate (close) project |
| POST | `/projects/{id}/employees` | Map an employee to this project |
| DELETE | `/projects/{id}/employees/{employee_id}` | Remove/close mapping |

**POST /projects/{id}/employees** - Request: `{ employee_id, role_on_project, allocation_percent, start_date }`. Response `201`: `EmployeeProjectRead`. Errors: `404` project/employee not found, `422` allocation out of range; returns a `warning` field (not a hard failure) if total allocation exceeds 100% (Section 15).

## 6.4 Buildings / Floors / Seats
| Method | URL | Purpose |
|---|---|---|
| GET | `/buildings` | List buildings |
| POST | `/buildings` | Create building |
| GET | `/buildings/{id}/floors` | List floors in a building |
| POST | `/floors` | Create floor |
| GET | `/floors/{id}/seats` | List seats on a floor |
| POST | `/seats` | Create seat |
| GET | `/seats` | List/filter seats (by building, floor, status, type) |
| GET | `/seats/available` | List currently available seats |
| GET | `/seats/{id}` | Seat detail + current occupant + assignment history |

## 6.5 Seat Allocation / Release
| Method | URL | Purpose |
|---|---|---|
| POST | `/seat-allocations` | Allocate a seat to an employee |
| POST | `/seat-allocations/{id}/release` | Release a seat assignment |
| GET | `/seat-allocations` | List assignments (filter by employee/seat/active) |
| POST | `/seat-allocations/auto-allocate` | New Joiner: auto-pick best available seat |

**POST /seat-allocations** - Request: `{ employee_id, seat_id, notes? }`. Response `201`: `SeatAssignmentRead`. Errors: `409 SEAT_ALREADY_OCCUPIED`, `409 EMPLOYEE_ALREADY_SEATED`, `404` not found, `400 EMPLOYEE_INACTIVE`.

**POST /seat-allocations/{id}/release** - Request: `{ reason, notes? }`. Response `200`: updated `SeatAssignmentRead` + creates `seat_release_logs` row. Errors: `404` not found, `409 ALREADY_RELEASED`.

**POST /seat-allocations/auto-allocate** - Request: `{ employee_id, building_id?, floor_id?, seat_type? }`. Response `201`: `SeatAssignmentRead` (seat chosen by algorithm, Section 11). Errors: `409 NO_AVAILABLE_SEATS`, `404` employee not found, `400 EMPLOYEE_ALREADY_SEATED`.

## 6.6 Search
| Method | URL | Purpose |
|---|---|---|
| GET | `/search` | Global search across employees, seats, projects |

**GET /search** - Query: `q` (required, min 2 chars), `types` (CSV filter), `limit` (default 10 per type). Response `200`: `{ employees: [], seats: [], projects: [] }`. Errors: `422` if `q` too short.

## 6.7 Dashboard / Analytics
| Method | URL | Purpose |
|---|---|---|
| GET | `/dashboard/summary` | Top KPI cards |
| GET | `/dashboard/utilization` | Seat utilization by building/floor |
| GET | `/analytics/projects` | Project staffing breakdown |
| GET | `/analytics/departments` | Department distribution |
| GET | `/analytics/seat-turnover` | Allocations/releases over date range |

**GET /dashboard/summary** - Response `200`: `{ total_employees, active_employees, total_seats, occupied_seats, available_seats, utilization_percent, total_projects, active_projects }`.

## 6.8 AI Assistant
| Method | URL | Purpose |
|---|---|---|
| POST | `/ai/query` | Natural-language question -> structured answer |
| GET | `/ai/suggested-prompts` | Curated example prompts for the UI |

**POST /ai/query** - Request: `{ question }`. Response `200`: `{ intent, parameters, data, summary, confidence }`. Errors: `422` empty question, `502 AI_PROVIDER_ERROR`; falls back to `intent: "unrecognized"` with a helpful `summary` rather than ever returning a 500 (Section 12).

## 6.9 Standard Error Shape (all endpoints)

```json
{ "error": { "code": "SEAT_ALREADY_OCCUPIED", "message": "This seat is already occupied.", "details": {} } }
```

## 6.10 Standard Status Codes

`200` OK, `201` Created, `204` No Content, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict, `422` Unprocessable Entity, `500` Internal Server Error, `502` Upstream/AI provider error.

---

# 7. Frontend Pages

Each page below is a Next.js App Router route under `app/(dashboard)/...`, wrapped in a shared authenticated layout (sidebar nav + topbar with global search + user menu).

## 7.1 Dashboard (`/`)
- **UI:** KPI cards row (Total Employees, Active Seats, Utilization %, Active Projects), two charts (Utilization by Building - bar; Department Distribution - donut), a "Recent Activity" table (last 10 allocations/releases).
- **Components:** `KpiCard`, `UtilizationBarChart`, `DepartmentDonutChart`, `RecentActivityTable`.
- **State:** Server Component fetches `/dashboard/summary` + `/dashboard/utilization` on initial load; Client wrapper re-fetches every 60s via TanStack Query `refetchInterval`.
- **API Integration:** `GET /dashboard/summary`, `GET /dashboard/utilization`.
- **Loading:** Skeleton cards + skeleton chart placeholders.
- **Error:** Inline `ErrorState` component with retry button.
- **Empty State:** N/A (dashboard always has data once seeded); if `total_employees === 0`, show a "No data yet - run the seed script" banner.

## 7.2 Employees (`/employees`)
- **UI:** Filter bar (department, status, project, has-seat toggle) + data table (paginated, sortable columns: name, code, department, designation, status, seat) + "Add Employee" button (admin only).
- **Components:** `EmployeeFilters`, `DataTable` (generic, reused across Employees/Seats/Projects), `EmployeeFormDialog` (create/edit), `StatusBadge`.
- **State:** Filters held in URL search params (shareable/bookmarkable); TanStack Query key = `['employees', filters, page]`.
- **API Integration:** `GET /employees`, `POST /employees`, `PATCH /employees/{id}`, `DELETE /employees/{id}`.
- **Loading:** Table skeleton rows.
- **Error:** Toast + inline retry.
- **Empty State:** "No employees match these filters" with a "Clear filters" action.

## 7.3 Employee Detail (`/employees/[id]`)
- **UI:** Profile card (name, code, dept, designation, manager), current seat card (with "Release" action), project mappings table (with "Add to Project" action), assignment history timeline.
- **Components:** `EmployeeProfileCard`, `CurrentSeatCard`, `ProjectMappingsTable`, `AssignmentHistoryTimeline`.
- **API Integration:** `GET /employees/{id}`, `GET /seat-allocations?employee_id=`, `GET /projects` (for the add-to-project select).

## 7.4 Projects (`/projects`)
- **UI:** Filter bar (status, client) + data table + "Add Project" button.
- **Components:** `ProjectFilters`, `DataTable`, `ProjectFormDialog`.
- **API Integration:** `GET /projects`, `POST /projects`, `PATCH /projects/{id}`, `DELETE /projects/{id}`.
- **Loading/Error/Empty:** Same pattern as Employees.

## 7.5 Project Detail (`/projects/[id]`)
- **UI:** Project info card, staffed-employees table with role/allocation%, "Add Employee to Project" dialog with employee search-select.
- **Components:** `ProjectInfoCard`, `StaffedEmployeesTable`, `AddToProjectDialog`.
- **API Integration:** `GET /projects/{id}`, `POST /projects/{id}/employees`, `DELETE /projects/{id}/employees/{employee_id}`.

## 7.6 Seats (`/seats`)
- **UI:** Building/Floor cascading filter, status filter (available/occupied/reserved/maintenance), grid or table view toggle, seat cards showing seat code + status color + occupant (if any).
- **Components:** `BuildingFloorFilter`, `SeatGrid`, `SeatCard`, `SeatFormDialog`.
- **API Integration:** `GET /seats`, `POST /seats`.
- **Empty State:** "No seats on this floor yet - add one" (admin) / "No seats match filters" (viewer).

## 7.7 Buildings (`/buildings`)
- **UI:** Card grid of buildings with floor count + utilization %, "Add Building" button.
- **Components:** `BuildingCard`, `BuildingFormDialog`.
- **API Integration:** `GET /buildings`, `POST /buildings`.

## 7.8 Floors (`/buildings/[id]/floors`)
- **UI:** List of floors for a building with seat count + utilization, "Add Floor" button, click-through to Seats filtered by that floor.
- **Components:** `FloorList`, `FloorFormDialog`.
- **API Integration:** `GET /buildings/{id}/floors`, `POST /floors`.

## 7.9 Allocation (`/allocation`)
- **UI:** Two-pane layout - left: "Unassigned Employees" list (search + filter by department); right: "New Joiner Allocation" wizard - pick employee → pick building/floor/seat-type preference (optional) → system suggests best-fit seat → confirm allocation. Also supports manual seat picking via the Seats page ("Assign" action on an available `SeatCard`).
- **Components:** `UnassignedEmployeesList`, `AutoAllocateWizard`, `SeatPickerDialog`.
- **State:** Local wizard step state (`useState`/`useReducer`), mutation via TanStack Query `useMutation` with optimistic UI update on the seat grid.
- **API Integration:** `GET /employees/unassigned`, `POST /seat-allocations/auto-allocate`, `POST /seat-allocations`.
- **Loading:** Wizard step shows spinner during allocation call.
- **Error:** Inline error banner inside wizard (e.g. `NO_AVAILABLE_SEATS`) with actionable suggestion (try another floor/building).
- **Empty State:** "All employees are seated" celebratory state when unassigned list is empty.

## 7.10 Search (`/search?q=`)
- **UI:** Tabbed results (All / Employees / Seats / Projects), each result row deep-links to the relevant detail page.
- **Components:** `SearchResultsTabs`, `SearchResultRow`.
- **API Integration:** `GET /search`.
- **Empty State:** "No results for '<query>'" with suggestion to check spelling or broaden search.

## 7.11 Analytics (`/analytics`)
- **UI:** Filterable date range, tabs for Utilization Trend / Project Staffing / Department Breakdown / Seat Turnover, each rendering a chart + underlying data table (export-ready).
- **Components:** `DateRangePicker`, `AnalyticsTabs`, `TrendLineChart`, `StaffingBarChart`, `SeatTurnoverTable`.
- **API Integration:** `GET /analytics/projects`, `GET /analytics/departments`, `GET /analytics/seat-turnover`.

## 7.12 AI Assistant (`/assistant`)
- **UI:** Chat-style panel with suggested-prompt chips at the top, message history, input box; assistant responses render as a natural-language summary **plus** a structured data table/chart when applicable.
- **Components:** `ChatMessageList`, `SuggestedPromptChips`, `ChatInput`, `AiResultRenderer` (switches between table/chart/text based on `intent`).
- **State:** Local message list in component state (not persisted server-side in v1); TanStack Query `useMutation` per question.
- **API Integration:** `POST /ai/query`, `GET /ai/suggested-prompts`.
- **Loading:** Typing-indicator bubble.
- **Error:** Assistant bubble with a friendly fallback message + suggestion to rephrase or use Search/Filters instead.
- **Empty State:** Initial state shows suggested prompts only.

## 7.13 Settings (`/settings`)
- **UI:** Current user info, (admin-only) simple user management list (view/create viewer accounts), app info (version, seed status).
- **Components:** `UserInfoCard`, `UserManagementTable` (admin only).
- **API Integration:** `GET /auth/me`, (stretch) `GET/POST /users`.

---

# 8. Component Architecture

## 8.1 Component Tree (simplified)

```
app/layout.tsx (RootLayout: fonts, providers)
 └─ app/(dashboard)/layout.tsx (AuthGuard, Sidebar, Topbar[GlobalSearch, UserMenu])
     ├─ app/(dashboard)/page.tsx                → Dashboard
     ├─ app/(dashboard)/employees/page.tsx      → Employees
     ├─ app/(dashboard)/employees/[id]/page.tsx → EmployeeDetail
     ├─ app/(dashboard)/projects/page.tsx       → Projects
     ├─ app/(dashboard)/projects/[id]/page.tsx  → ProjectDetail
     ├─ app/(dashboard)/seats/page.tsx          → Seats
     ├─ app/(dashboard)/buildings/page.tsx      → Buildings
     ├─ app/(dashboard)/buildings/[id]/floors/page.tsx → Floors
     ├─ app/(dashboard)/allocation/page.tsx     → Allocation
     ├─ app/(dashboard)/search/page.tsx         → Search
     ├─ app/(dashboard)/analytics/page.tsx      → Analytics
     ├─ app/(dashboard)/assistant/page.tsx      → AI Assistant
     └─ app/(dashboard)/settings/page.tsx       → Settings
```

## 8.2 Reusable Components (`components/ui` = Shadcn primitives; `components/shared` = app-specific)

- `DataTable<T>` - generic paginated/sortable table (wraps TanStack Table) used by Employees, Projects, Seats, Analytics.
- `KpiCard`, `StatusBadge`, `EmptyState`, `ErrorState`, `LoadingSkeleton`.
- `FormDialog` (generic modal shell for Create/Edit forms) + resource-specific forms (`EmployeeForm`, `ProjectForm`, `SeatForm`, `BuildingForm`, `FloorForm`).
- `SearchSelect` (async-searchable combobox for picking an employee/project/seat inside forms).
- Chart wrappers: `BarChart`, `DonutChart`, `LineChart` (thin wrappers around Recharts with the app's design tokens).

## 8.3 Hooks (`lib/hooks`)

- `useEmployees(filters)`, `useEmployee(id)`, `useCreateEmployee()`, `useUpdateEmployee()`, `useDeactivateEmployee()`
- `useProjects(filters)`, `useProject(id)`, `useAddEmployeeToProject()`
- `useSeats(filters)`, `useAvailableSeats(filters)`, `useAllocateSeat()`, `useReleaseSeat()`, `useAutoAllocate()`
- `useSearch(query, types)`
- `useDashboardSummary()`, `useUtilization()`, `useAnalytics*()`
- `useAiQuery()`
- `useAuth()` (wraps token storage + `/auth/me`)
- `useDebouncedValue(value, delay)` (generic utility hook for search inputs)

## 8.4 Utilities (`lib/utils`)

- `apiClient.ts` - typed `fetch` wrapper: base URL, auth header injection, JSON parsing, error normalization into a typed `ApiError`.
- `formatters.ts` - date, percentage, name formatting helpers.
- `queryKeys.ts` - centralized TanStack Query key factory to avoid typo'd cache keys.
- `zodSchemas.ts` - shared Zod schemas per resource (mirrors backend Pydantic shapes) used by React Hook Form.

## 8.5 Providers (`app/providers.tsx`)

- `QueryClientProvider` (TanStack Query) with sane defaults (`staleTime: 30s`, `retry: 1`).
- `ThemeProvider` (light mode only in v1, dark mode as stretch).
- `AuthProvider` (JWT in memory + `httpOnly` cookie option documented for production hardening; simple `localStorage` acceptable for the 24-48h build, documented as a known simplification).
- `ToastProvider` (Shadcn `Toaster`).

---

# 9. Backend Architecture

## 9.1 Folder Structure (overview; full tree in Section 20)

```
backend/app/
 ├─ main.py                # FastAPI app factory, middleware, router registration
 ├─ core/                  # settings, security (JWT), db session, exceptions
 ├─ models/                # SQLAlchemy ORM models
 ├─ schemas/                # Pydantic request/response models
 ├─ repositories/          # query-only data access layer
 ├─ services/              # business logic layer
 ├─ routers/               # FastAPI routers (thin HTTP layer)
 ├─ ai/                    # AI module: prompt builder, intent schema, client
 └─ deps.py                # shared FastAPI dependencies (get_db, get_current_user, require_role)
```

## 9.2 Services

One service class per module (`EmployeeService`, `ProjectService`, `SeatService`, `SeatAllocationService`, `SearchService`, `DashboardService`, `AnalyticsService`, `AiService`, `AuthService`). Services:
- Accept a DB session + repositories via constructor injection (simple, no DI framework needed).
- Contain all business-rule validation not expressible as a DB constraint (e.g., allocation-percent soft warning, cascading deactivation).
- Raise typed domain exceptions (`SeatAlreadyOccupiedError`, `EmployeeAlreadySeatedError`, etc.) which a global FastAPI exception handler maps to the standard error shape + correct status code (Section 16).

## 9.3 Repositories

One repository class per aggregate root (`EmployeeRepository`, `ProjectRepository`, `SeatRepository`, `SeatAssignmentRepository`, `BuildingRepository`, `FloorRepository`). Repositories:
- Contain **only** SQLAlchemy query construction - no business logic, no HTTP concerns.
- Expose intention-revealing methods (`get_active_assignment_for_seat(seat_id)`, `find_best_available_seat(criteria)`), never leak raw `Session`/`Query` objects to services beyond what's needed.

## 9.4 Schemas

Per resource: `XCreate` (input, no `id`/timestamps), `XUpdate` (all fields optional, `PATCH` semantics), `XRead` (output, includes `id`/timestamps/computed fields), and list-envelope generics (`Page[XRead]`). Shared base config enables `from_attributes = True` for ORM-to-schema conversion.

## 9.5 Models

SQLAlchemy 2.0 declarative models mirroring Section 4 exactly, using `Mapped[...]`/`mapped_column(...)` typed style. Relationships declared with explicit `back_populates` (no lazy magic), and `foreign_keys=` specified explicitly wherever a table has more than one FK to the same target (e.g., `employees.reporting_manager_id`).

## 9.6 Routers

Thin: parse/validate request → call service method → return schema. No business logic, no direct DB session usage beyond the dependency-injected session passed through to the service. One router per resource, registered in `main.py` under `/api/v1`.

## 9.7 Dependencies (`deps.py`)

- `get_db()` - yields an async SQLAlchemy session per request.
- `get_current_user()` - decodes JWT from `Authorization` header, loads `User`, raises `401` if invalid/expired.
- `require_role("admin")` - dependency factory raising `403` if the current user's role doesn't match.
- `get_pagination(page, page_size)` - shared pagination query-param parsing/validation.

---

# 10. Search System

## 10.1 How Global Search Works

`GET /search?q=...` fans out to three lightweight queries in parallel (via `asyncio.gather`):
1. Employees: `ILIKE` against `first_name || ' ' || last_name`, `employee_code`, `email`, backed by a `pg_trgm` GIN index for reasonable performance without full-text-search infrastructure.
2. Seats: `ILIKE` against `seat_code`.
3. Projects: `ILIKE` against `name`, `project_code`.

Each sub-query is capped at `limit` (default 10) and ordered by a simple relevance heuristic computed in SQL: exact match (rank 0) > starts-with match (rank 1) > contains match (rank 2), via a `CASE WHEN` expression in the `ORDER BY`, avoiding the need for a separate search engine (Elasticsearch/Meilisearch) at this scale (5,000 employees, low tens-of-thousands of seats).

## 10.2 Filtering

List endpoints (`/employees`, `/projects`, `/seats`) accept structured filter query params (not free-text) that map directly to indexed `WHERE` clauses (`department = :dept`, `status = :status`, `floor_id = :floor_id`). Filters combine with `AND` semantics; multi-select filters (e.g., multiple departments) use `WHERE column = ANY(:values)`.

## 10.3 Sorting

Whitelisted sortable columns per resource (e.g., employees: `first_name`, `department`, `joining_date`, `status`) to prevent arbitrary/unsafe `ORDER BY` injection; requested via `sort=field` / `sort=-field` (leading `-` = descending) query param, validated against the whitelist and rejected with `422` if invalid.

## 10.4 Pagination

Offset-based pagination (`page`, `page_size`) is used for simplicity and because the admin UI always shows a page-number control (not infinite scroll) - acceptable at this data scale. `page_size` capped at 100 to bound query cost. (Documented stretch goal: switch to keyset/cursor pagination if data scale grows well beyond 5,000-50,000 rows per table.)

## 10.5 Performance Considerations

- All filter/sort/search columns are indexed (Section 4 per-table index lists).
- List endpoints always `SELECT` only the columns needed for the `Read` schema (no `SELECT *` then discard).
- `COUNT(*)` for `total` is computed via a single indexed query, not by fetching all rows.
- N+1 avoidance: relationships needed in list views (e.g., an employee's current seat) are loaded via a single `JOIN` or `selectinload`, never per-row lazy loads in a loop.

---

# 11. Seat Allocation Logic

## 11.1 Allocation Flow (manual)

1. Admin selects an employee (from Employee page or the Allocation page's unassigned list) and a specific available seat (from the Seats grid).
2. Frontend calls `POST /seat-allocations { employee_id, seat_id }`.
3. `SeatAllocationService.allocate()`:
   a. Loads the employee; rejects with `400 EMPLOYEE_INACTIVE` if `status != 'active'`.
   b. Loads the seat; rejects with `409 SEAT_ALREADY_OCCUPIED` if an active assignment already exists for it (checked via `SeatAssignmentRepository.get_active_for_seat`).
   c. Rejects with `409 EMPLOYEE_ALREADY_SEATED` if the employee already has an active assignment elsewhere.
   d. Inserts a new `seat_assignments` row (`released_at = NULL`).
   e. Updates `seats.status = 'occupied'` (denormalized cache).
   f. Commits in a single DB transaction - if the transaction fails on the partial unique index (a race condition where two admins allocate the same seat simultaneously), the pre-checks in (b)/(c) will normally catch it, but the **partial unique index is the true safety net** and a caught `IntegrityError` is translated into the same `409 SEAT_ALREADY_OCCUPIED` response rather than a raw 500.

## 11.2 New Joiner Auto-Allocation Flow

1. Admin opens the Allocation Wizard, picks an unassigned employee, optionally narrows by building/floor/seat-type.
2. Frontend calls `POST /seat-allocations/auto-allocate { employee_id, building_id?, floor_id?, seat_type? }`.
3. `SeatAllocationService.auto_allocate()` calls `SeatRepository.find_best_available_seat(criteria)`, which runs a single query:
   - Filters seats where `status = 'available'` (and `is_active = true`).
   - Applies optional building/floor/seat_type filters.
   - Orders by: (1) same floor as the employee's project teammates if `project_id` inferred from an active mapping is available (a light "sit near your team" heuristic, best-effort, not a hard requirement), then (2) lowest `floor.floor_number` (prefer lower floors, a simple deterministic tie-breaker), then (3) `seat_code` ascending.
   - `LIMIT 1`.
4. If no seat found → `409 NO_AVAILABLE_SEATS` with a suggestion in the error `details` (e.g., "try a different building").
5. If found, proceeds through the same allocate steps as 11.1 (b-f), reusing the same transactional core so both flows share one source of truth for "what does allocation actually do."

## 11.3 Release Flow

1. Admin clicks "Release" on an employee's current seat (from Employee Detail or Seat Detail).
2. Frontend calls `POST /seat-allocations/{assignment_id}/release { reason, notes? }`.
3. `SeatAllocationService.release()`:
   a. Loads the assignment; rejects `404` if not found, `409 ALREADY_RELEASED` if `released_at IS NOT NULL`.
   b. Sets `released_at = now()`.
   c. Inserts a `seat_release_logs` row.
   d. Updates `seats.status = 'available'`.
   e. Commits transactionally.

## 11.4 Conflict Detection

- **Primary defense:** service-layer pre-check queries (fast-fail with a clean, typed error).
- **Last line of defense:** partial unique indexes on `seat_assignments (seat_id) WHERE released_at IS NULL` and `(employee_id) WHERE released_at IS NULL`, which make double-booking a **database-level impossibility**, not just an application-level convention - critical because the service layer alone cannot fully guard against race conditions under concurrent requests.

## 11.5 Validation

- `employee_id`/`seat_id` existence validated before any write.
- Employee must be `status = 'active'` to receive a new seat.
- Seat must be `is_active = true` and not `maintenance` status to be allocated (maintenance seats are excluded from `find_best_available_seat` and from manual allocation with a clear error if attempted).

## 11.6 Business Rules Summary

- One employee -> at most one active seat, ever.
- One seat -> at most one active occupant, ever.
- Deactivating/exiting an employee auto-releases their seat (reason auto-set to `"resigned"` or `"other"` depending on the deactivation reason passed) and closes their active project mappings (`end_date = today`).
- Seat status is always derivable from `seat_assignments` and kept in sync by the service layer on every allocate/release - it is a cache, not a second source of truth, and a scheduled/manual "reconcile" script (documented as a stretch goal) could recompute it from `seat_assignments` if it ever drifts.

---

# 12. AI Assistant

## 12.1 Design Philosophy

The AI Assistant is a **natural-language front-end over a fixed, whitelisted set of read-only query intents** - not a chatbot with open-ended database or code execution access. This is a deliberate architectural and safety choice: it gives genuinely useful natural-language querying while making the AI's blast radius exactly zero for data mutation and bounded for data exposure (it can only ever run the same handful of vetted, parameterized queries a developer already wrote and tested).

## 12.2 Natural Language Queries (examples)

- "How many seats are available on Floor 3 of Tower A?"
- "Which employees are on Project Phoenix?"
- "What is the seat utilization in Tower B?"
- "How many employees joined this month in Engineering?"
- "Show me unassigned employees in the Design department."

## 12.3 Prompt Flow

1. User submits a question to `POST /ai/query`.
2. `AiService` builds a system prompt containing: (a) a short description of each whitelisted intent and its parameters (e.g., `count_available_seats(building_code?, floor_number?)`, `list_employees_by_project(project_name)`, `utilization_by_building(building_code?)`, `employees_joined_in_period(department?, start_date, end_date)`, `unassigned_employees(department?)`), and (b) an instruction to respond **only** with a JSON object matching a fixed schema: `{ "intent": string, "parameters": object }`.
3. The LLM call is made server-side (never from the browser, to protect the API key) via the OpenAI-compatible `/v1/chat/completions` (or Anthropic Messages API - abstracted behind an `LlmClient` interface so the provider can be swapped via env var, see 12.6).
4. The raw LLM JSON response is parsed and validated against a Pydantic `AiIntentResponse` schema. If parsing/validation fails, or `intent` isn't in the whitelist, the service returns `intent: "unrecognized"` with a graceful fallback message - **never** a 500, and never falls through to executing anything unvalidated.
5. On success, `AiService` maps `intent` to the corresponding repository method, executes it (a normal, already-existing, parameterized query - the same ones used by REST endpoints elsewhere), and gets structured data back.
6. `AiService` makes a **second**, small LLM call: "Summarize this data in one or two friendly sentences for an HR admin" - passing only the already-fetched, already-safe structured result (not raw DB access), producing the `summary` field.
7. Response returned to frontend: `{ intent, parameters, data, summary, confidence }`.

## 12.4 Backend Integration

- Lives entirely in `app/ai/` - `prompt_builder.py` (intent catalogue + system prompt template), `intent_schema.py` (Pydantic models for intents/parameters), `llm_client.py` (provider abstraction), `service.py` (orchestration described above).
- Reuses the exact same repository methods as the REST API - the AI module is a **caller of the data layer**, not a parallel path with its own privileges.

## 12.5 Suggested Prompts

`GET /ai/suggested-prompts` returns a small static/curated list (5-8 prompts spanning each intent category) so the UI can show clickable chips - helps users discover what the assistant can actually do without guessing.

## 12.6 OpenAI Abstraction

`LlmClient` is a small interface (`complete(system_prompt, user_message) -> str`) with a concrete `OpenAiClient` implementation; provider/model/API key are read from env vars (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`) so switching providers (e.g., to Anthropic) is a config change, not a code change.

## 12.7 Safety

- The LLM **never** sees or generates raw SQL, and never has DB credentials or execution access - it only ever returns a small, schema-validated JSON "intent selection."
- All intents are **read-only**; there is no mutating intent in the whitelist (no "allocate a seat via AI" in v1 - explicitly called out as a deliberate scope boundary, not an oversight).
- Parameters extracted by the LLM (e.g., a `building_code` string) are still passed through the normal Pydantic validation and parameterized-query path used everywhere else - the LLM cannot inject SQL because it never constructs SQL, only structured parameters for pre-written queries.
- Rate limiting on `/ai/query` (Section 17) to bound cost and abuse.

## 12.8 Fallback

If the LLM call errors (timeout, provider outage) or returns something that fails schema validation, the endpoint still returns `200` with `intent: "unrecognized"` and a message like: "I couldn't quite understand that - try one of the suggested prompts, or use Search/Filters for now." The frontend never shows a raw error for this endpoint; it always shows a friendly assistant bubble.

---

# 13. Dashboard Analytics

## 13.1 KPIs (Dashboard summary cards)

- Total Employees / Active Employees
- Total Seats / Occupied Seats / Available Seats
- Overall Utilization % (`occupied_seats / total_active_seats * 100`)
- Total Projects / Active Projects

## 13.2 Cards

Each KPI rendered as a `KpiCard` (label, big number, small trend/context line, icon). Computed via a single aggregate SQL query per group (not multiple round-trips): e.g. one query with `FILTER (WHERE ...)` clauses to get several counts from one table scan.

```sql
SELECT
  COUNT(*) AS total_employees,
  COUNT(*) FILTER (WHERE status = 'active') AS active_employees
FROM employees WHERE is_active = true;
```

## 13.3 Charts

- **Utilization by Building** (bar chart): `GROUP BY building` joining buildings -> floors -> seats -> active seat_assignments, computing occupied/total per building.
- **Department Distribution** (donut chart): `GROUP BY department` on active employees.
- **Project Staffing** (bar/stacked bar, Analytics page): headcount per project, optionally split by department.
- **Utilization Trend** (line chart, Analytics page): daily/weekly snapshot of occupied-seat count over a date range, computed from `seat_assignments` (`assigned_at`/`released_at`) rather than requiring a separate snapshot table - a seat is "occupied on date D" if `assigned_at <= D AND (released_at IS NULL OR released_at > D)`.

## 13.4 Utilization

Utilization is always computed as `occupied / (total active seats)`, expressed per building, per floor, and organization-wide. Floors/buildings with zero active seats are excluded from percentage math (avoid divide-by-zero) and shown as "No seats configured."

## 13.5 Project Metrics

Headcount per project (current, via `employee_projects WHERE end_date IS NULL`), average allocation % per project, project status distribution (active/on_hold/closed count).

## 13.6 Seat Metrics

Total/available/occupied/maintenance seat counts, seat turnover (allocations and releases per week/month, from `seat_assignments`/`seat_release_logs` timestamps) shown in Analytics -> Seat Turnover tab.

---

# 14. Seed Data

## 14.1 Overview

`backend/scripts/seed.py` is a single, idempotent (re-runnable against an empty/reset DB) script using `Faker` for realistic names/emails and `random` (seeded with a fixed integer, e.g. `random.seed(42)`) for reproducibility across runs/demos.

## 14.2 Generation Order (respects FK dependencies)

1. **Users:** 1 admin (`admin@ethara.dev` / seeded password documented in README) + 2-3 viewer accounts.
2. **Buildings:** 4-6 buildings (e.g., Tower A-E).
3. **Floors:** 8-15 floors per building (randomized within range).
4. **Seats:** ~40-80 seats per floor, seat_code pattern `{BuildingCode}-{FloorNumber}-{3-digit-seq}`, seat_type weighted random (70% standard, 15% workstation, 10% hotdesk, 5% cabin) → totals comfortably above 5,000 seats to allow headroom above employee count.
5. **Projects:** 60-120 projects, varied status distribution (majority active, some on_hold/closed), realistic-sounding names via a combination of Faker `catch_phrase()`/`bs()` plus a curated adjective+noun list for readability.
6. **Employees:** exactly 5,000, `employee_code` sequential (`EMP10000..EMP14999`), department drawn from a fixed weighted list (Engineering, QA, Design, Product, HR, Finance, Sales, Operations), designation drawn from a department-appropriate title list, `joining_date` randomized over the last 5 years (weighted toward more recent), `reporting_manager_id` assigned by picking a random earlier-created employee in the same department once at least a few dozen employees in that department exist (keeps the manager graph acyclic and realistic), ~3% of employees seeded as `status='exited'` with an `exit_date` (to make status filtering/analytics meaningful) and ~2% as `on_leave`.
7. **Employee-Project mappings:** each active employee gets 1-2 project mappings (weighted 80% one project / 20% two), `allocation_percent` 100 for single-project employees, 50/50 or 60/40 split for dual-project employees, `role_on_project` drawn from a designation-appropriate list.
8. **Seat Assignments:** ~85-90% of active employees get allocated a seat (leaving a realistic pool of "unassigned/new joiners" for demoing the Allocation module), assignment prefers seats on the same floor as other employees on the same project where possible (reuses the same "best-fit" heuristic described in Section 11, called directly against the repository layer rather than duplicating logic), remaining ~10-15% left unassigned intentionally.
9. **Some released assignments:** a small number (~200-300) of historical released assignments (`released_at` set, matching `seat_release_logs` rows with varied `reason`) so that Assignment History and Seat Turnover analytics have non-trivial data to show.

## 14.3 Random Generation Strategy

- All randomness seeded (`Faker.seed(42)`, `random.seed(42)`) → same seed produces the same dataset every run, which matters for grading/demo reproducibility and for writing assertions in tests against known aggregate counts.
- Bulk inserts via SQLAlchemy Core `insert()` with batched `executemany`-style chunks (e.g. 500 rows at a time) rather than one ORM object + `session.add()` + `commit()` per row, to keep seeding 5,000+ employees and 5,000+ seats fast (target: full seed run completes in well under 2 minutes).
- Script is runnable via `python -m scripts.seed` (or a `make seed` / `npm run seed` convenience alias) and is safe to re-run against a freshly-migrated empty database; it does **not** attempt to be safely re-runnable against a already-populated DB (that's an explicit non-goal - the workflow is "migrate fresh, then seed").
- Progress printed to stdout per stage (`"Seeding buildings... done (5)"`, `"Seeding employees... done (5000)"`) so a reviewer watching it run has confidence it's working, not hung.

---

# 15. Validation Rules

## 15.1 Frontend (Zod, mirrored in React Hook Form resolvers)

- Required fields enforced (`first_name`, `last_name`, `email`, `employee_code`, `department`, `designation`, `joining_date`, etc.).
- Email format (`z.string().email()`); employee/project codes matched against a pattern (`/^[A-Z0-9-]+$/`).
- Numeric ranges: `allocation_percent` `z.number().min(1).max(100)`.
- Dates: `end_date` (project/mapping) must be `>= start_date` when both present, checked via `.refine()`.
- Inline field-level error messages, submit button disabled while invalid/submitting.

## 15.2 Backend (Pydantic + service-layer rules)

- Same shape/format rules as frontend, re-validated independently (never trust the client).
- Cross-field/business rules that aren't expressible in Pydantic alone live in the Service layer: employee must be active to receive a seat; seat/employee active-assignment uniqueness pre-checks; allocation-percent-over-100 soft warning (returns success + a `warning` field in the response body rather than blocking the request, because real orgs do sometimes temporarily over-allocate and a hard block would be more annoying than useful for an internal tool - documented explicitly as a product decision).
- Enum-like fields (`status`, `seat_type`, `reason`) validated against a fixed set of allowed string literals via Pydantic `Literal[...]` types.

## 15.3 Database (final safety net)

- `NOT NULL`, `UNIQUE`, `CHECK` constraints as listed per table in Section 4.
- Partial unique indexes as the authoritative guard against seat/employee double-booking (Section 11.4) - this is the one rule that is enforced at the DB layer *as the primary mechanism*, not just as a backstop, because it's the one rule that must hold even under concurrent requests that bypass or race past the service-layer check.

---

# 16. Error Handling

## 16.1 Frontend

- A top-level React Error Boundary per route segment (`error.tsx` in App Router) catches render-time exceptions and shows a friendly "Something went wrong" screen with a "Try again" action (App Router's built-in `reset()`).
- API/mutation errors surfaced via Shadcn `Toast` (non-blocking, e.g., "Failed to save employee: email already in use") using the normalized `ApiError` shape from `apiClient.ts` (`{ code, message }`) so toasts always show a human-readable message, never a raw stack trace or generic "Network Error."
- Form-level validation errors shown inline next to the relevant field (React Hook Form + Zod resolver error map), separate from toast-level "this whole submission failed" errors.
- Loading vs. error vs. empty states are always three visually distinct, explicitly designed states per page/table (never just a blank white area) - see Section 7 per-page breakdowns.

## 16.2 Backend

- A global FastAPI exception handler registered in `main.py` catches:
  - Custom domain exceptions (`SeatAlreadyOccupiedError`, etc.) → mapped to the correct status code + standard error shape (Section 6.9) via an explicit code→status mapping table in `core/exceptions.py`.
  - Pydantic `RequestValidationError` → `422` with a normalized `{ error: { code: "VALIDATION_ERROR", message, details: {field errors} } }`.
  - SQLAlchemy `IntegrityError` (e.g., a race condition slipping past the pre-check) → translated to the appropriate `409` with a clean message, never leaked as a raw DB error string.
  - Any unhandled `Exception` → logged with full stack trace server-side (structured JSON log including request ID) but returned to the client as a generic `500 { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }` - **never** leaking internals (stack traces, SQL, file paths) to the client.
- Every request gets a `request_id` (via middleware, e.g. `uuid4()`) attached to logs and echoed back in an `X-Request-Id` response header, so a specific failed request can be correlated between frontend error toast and backend logs during debugging/demo.

## 16.3 API

- Consistent error envelope everywhere (Section 6.9) - frontend code never needs resource-specific error parsing.
- Documented error `code` values per endpoint live in the OpenAPI description (FastAPI `responses=` per route) so Swagger UI shows them, not just a bare "422" with no context.

---

# 17. Security

## 17.1 Input Validation

Every request body/query param validated via Pydantic before touching the service/repository layer (Section 15.2) - no raw `dict` access to request data anywhere in routers.

## 17.2 SQL Injection

- 100% SQLAlchemy ORM/Core parameterized queries - no raw string-interpolated SQL anywhere in the codebase (enforced as a code-review rule, called out explicitly in Section 21 Coding Standards).
- Sort-field whitelisting (Section 10.3) specifically prevents an `ORDER BY` injection vector, which is the one place free-text-ish input could otherwise reach a query structurally rather than as a bound parameter.

## 17.3 XSS

- React escapes all rendered content by default; the codebase avoids `dangerouslySetInnerHTML` entirely (no user-generated HTML is ever rendered as HTML - notes/free-text fields are always rendered as plain text).
- Backend does not need to HTML-sanitize stored text because the frontend never trusts stored text as HTML in the first place (defense via rendering discipline, not just sanitization).

## 17.4 CORS

- FastAPI `CORSMiddleware` configured with an explicit allow-list of origins read from an env var (`CORS_ALLOWED_ORIGINS`, comma-separated) - the deployed Vercel frontend URL and `http://localhost:3000` for local dev; never `allow_origins=["*"]` alongside credentials.

## 17.5 Rate Limiting

- A lightweight in-process rate limiter (e.g. `slowapi`, Redis-free token-bucket per-IP) applied specifically to `POST /auth/login` (brute-force protection) and `POST /ai/query` (cost/abuse protection on the LLM-calling endpoint) - not applied globally, since this is a low-traffic internal tool and global rate limiting would add complexity disproportionate to the risk.

## 17.6 Environment Variables / Secrets

- `DATABASE_URL`, `JWT_SECRET`, `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL`, `CORS_ALLOWED_ORIGINS` all read via a Pydantic `Settings` (`pydantic-settings`) class from environment variables / `.env` (local only, `.env` git-ignored, `.env.example` committed with placeholder values).
- No secret ever committed to git, logged, or returned in any API response (JWT secret and AI API key never appear in any Pydantic `Read` schema).
- JWTs signed with `HS256` using `JWT_SECRET`, short-ish expiry (e.g., 8 hours) appropriate for an internal admin tool session.

## 17.7 Authentication/Authorization (recap, ties to Section 3.9)

- `admin` role required for all mutating endpoints; `viewer` role read-only.
- Passwords hashed with `bcrypt` (via `passlib`), never stored or logged in plaintext.

---

# 18. Performance

## 18.1 Indexes

Every column used in a `WHERE`, `JOIN`, or `ORDER BY` on a hot path is indexed (full list per table in Section 4): status/department/foreign-key columns as plain B-tree indexes, name/search columns as `pg_trgm` GIN indexes, and the two critical partial unique indexes on `seat_assignments` that double as both a correctness mechanism (Section 11.4) and a performance win (tiny index scan to check "is there an active assignment" instead of a full-table scan with a `WHERE released_at IS NULL` filter).

## 18.2 Caching

- TanStack Query provides client-side caching (`staleTime`) so repeated navigation between pages doesn't re-hit the API unnecessarily.
- No server-side cache (Redis, etc.) in v1 - explicitly out of scope given the data scale (5,000 employees) and 24-48h timebox; called out as the first stretch-goal infrastructure addition if the tool needed to scale to tens of thousands of employees or much higher request volume (Section 19 stretch goals).

## 18.3 Pagination

All list endpoints paginated server-side (Section 10.4) - the frontend never fetches "all 5,000 employees" in one call.

## 18.4 Lazy Loading

- Charts and heavier Analytics-page components are dynamically imported (`next/dynamic`) with `ssr: false` where they depend on browser-only charting behavior, keeping the initial JS bundle for simpler pages (e.g., Employees list) smaller.
- Images/icons via `next/image`/`lucide-react` tree-shaken icon imports (no whole-icon-library bundle bloat).

## 18.5 Memoization

- Expensive derived values in list/table components (e.g., computed status-color mappings, filter option lists) wrapped in `useMemo`; stable callback identities via `useCallback` where passed to memoized child components (`React.memo`) such as `DataTable` rows, to avoid unnecessary re-renders on a 20-100-row table when unrelated parent state changes.

## 18.6 Database Optimization

- Aggregate dashboard/analytics queries use single `GROUP BY`/`FILTER` queries (Section 13.2) instead of N+1 per-entity aggregation in application code.
- `EXPLAIN ANALYZE` spot-checks recommended (documented in Section 22 Testing Plan as a manual step) on the two or three highest-traffic queries (employee list with filters, seat search, dashboard summary) before final submission, to catch any accidental sequential scan on the seeded 5,000-row dataset.

---

# 19. Development Roadmap

## 19.1 Day 1 (Foundation + Core CRUD + Seat Core)

**Morning**
- Repo scaffolding (frontend + backend), Docker Compose for local Postgres, base FastAPI app (`main.py`, settings, DB session, health-check route).
- Alembic initialized; first migration: `buildings`, `floors`, `seats`, `employees`, `projects`, `employee_projects`, `users`.
- Auth: `users` model, login endpoint, JWT dependency, seeded admin user.

**Afternoon**
- Employee, Project, Building, Floor, Seat models/schemas/repositories/services/routers (CRUD).
- Second migration: `seat_assignments`, `seat_release_logs` (+ partial unique indexes).
- Seat Allocation/Release/Auto-allocate service + endpoints (Section 11).
- Seed script v1 (buildings/floors/seats/projects/employees/mappings) - run and validate row counts.

**Evening**
- Frontend scaffolding: Next.js app, Tailwind + Shadcn init, providers (`QueryClientProvider`, `AuthProvider`), auth guard + login page.
- Employees page (list + filters + create/edit) fully wired end-to-end as the first vertical slice, proving the whole stack works.

## 19.2 Day 2 (Remaining Pages + Search + Dashboard/Analytics + AI + Polish)

**Morning**
- Projects, Seats, Buildings/Floors pages wired.
- Allocation page (unassigned list + auto-allocate wizard + manual seat picker).
- Global Search endpoint + Search page.

**Afternoon**
- Dashboard endpoint + page (KPIs + 2 charts).
- Analytics endpoints + page (remaining tabs).
- AI module (intent catalogue, prompt builder, `/ai/query`, `/ai/suggested-prompts`) + Assistant page.

**Evening**
- Error handling pass (global handler, error/empty/loading states everywhere, Section 16 checklist).
- Security pass (CORS, rate limiting on login/AI, env var audit).
- README, `.env.example`, Swagger sanity check, seed re-run test, deployment (Vercel + Railway/Render), final QA pass against Section 25 checklist.

## 19.3 Priority Order (if time-constrained, cut from the bottom up)

1. Employee CRUD + DB schema + auth (must-have - nothing else works without this).
2. Seat Allocation/Release core logic + partial unique indexes (the system's core value proposition).
3. Seed script (needed to demo at realistic scale).
4. Projects CRUD + mapping.
5. Employees/Seats/Projects list pages with filters.
6. Dashboard KPIs.
7. Search.
8. New Joiner auto-allocation wizard.
9. Analytics (deeper tabs).
10. AI Assistant.
11. Polish (loading/empty states, dark mode, extra chart types).

## 19.4 MVP Checklist

- [ ] Auth (login, protected routes, admin/viewer roles)
- [ ] Employee CRUD + list/filter/search
- [ ] Project CRUD + employee-project mapping
- [ ] Building/Floor/Seat CRUD
- [ ] Seat allocation + release (manual)
- [ ] New joiner auto-allocation
- [ ] Global search
- [ ] Dashboard KPIs + 2 charts
- [ ] Seed script producing 5,000 employees + supporting data
- [ ] Swagger/OpenAPI docs functional at `/docs`
- [ ] Deployed frontend + backend + DB, reachable via public URLs

## 19.5 Stretch Goals

- Full Analytics suite (all 4 tabs) with date-range filtering.
- AI Assistant.
- Dark mode.
- Drag-and-drop floor-plan visual editor.
- CSV export on tables/analytics.
- Real-time seat-status updates via polling interval tuning or WebSockets.
- GitHub Actions CI (lint + type-check + basic test run on PR).

---

# 20. Folder Structure

## 20.1 Frontend

```
frontend/
├─ app/
│  ├─ layout.tsx
│  ├─ providers.tsx
│  ├─ globals.css
│  ├─ login/page.tsx
│  └─ (dashboard)/
│     ├─ layout.tsx
│     ├─ page.tsx                       # Dashboard
│     ├─ employees/
│     │  ├─ page.tsx
│     │  ├─ [id]/page.tsx
│     │  ├─ loading.tsx
│     │  └─ error.tsx
│     ├─ projects/
│     │  ├─ page.tsx
│     │  ├─ [id]/page.tsx
│     │  ├─ loading.tsx
│     │  └─ error.tsx
│     ├─ seats/page.tsx
│     ├─ buildings/
│     │  ├─ page.tsx
│     │  └─ [id]/floors/page.tsx
│     ├─ allocation/page.tsx
│     ├─ search/page.tsx
│     ├─ analytics/page.tsx
│     ├─ assistant/page.tsx
│     └─ settings/page.tsx
├─ components/
│  ├─ ui/                               # Shadcn primitives (button, dialog, table, ...)
│  └─ shared/
│     ├─ data-table.tsx
│     ├─ kpi-card.tsx
│     ├─ status-badge.tsx
│     ├─ empty-state.tsx
│     ├─ error-state.tsx
│     ├─ charts/ (bar-chart.tsx, donut-chart.tsx, line-chart.tsx)
│     ├─ forms/ (employee-form.tsx, project-form.tsx, seat-form.tsx, ...)
│     └─ ai/ (chat-message-list.tsx, suggested-prompt-chips.tsx, ai-result-renderer.tsx)
├─ lib/
│  ├─ api-client.ts
│  ├─ query-keys.ts
│  ├─ zod-schemas.ts
│  ├─ formatters.ts
│  └─ hooks/ (use-employees.ts, use-projects.ts, use-seats.ts, use-search.ts, use-ai-query.ts, use-auth.ts, ...)
├─ public/
├─ next.config.js
├─ tailwind.config.ts
├─ tsconfig.json
└─ package.json
```

## 20.2 Backend

```
backend/
├─ app/
│  ├─ main.py
│  ├─ deps.py
│  ├─ core/
│  │  ├─ config.py                      # Settings (pydantic-settings)
│  │  ├─ security.py                    # JWT encode/decode, password hashing
│  │  ├─ db.py                          # engine, session factory
│  │  └─ exceptions.py                  # domain exceptions + handler registration
│  ├─ models/
│  │  ├─ building.py
│  │  ├─ floor.py
│  │  ├─ seat.py
│  │  ├─ employee.py
│  │  ├─ project.py
│  │  ├─ employee_project.py
│  │  ├─ seat_assignment.py
│  │  ├─ seat_release_log.py
│  │  └─ user.py
│  ├─ schemas/
│  │  ├─ employee.py
│  │  ├─ project.py
│  │  ├─ seat.py
│  │  ├─ building.py
│  │  ├─ floor.py
│  │  ├─ seat_assignment.py
│  │  ├─ search.py
│  │  ├─ dashboard.py
│  │  ├─ ai.py
│  │  └─ common.py                      # Page[T], ErrorResponse
│  ├─ repositories/
│  │  ├─ employee_repository.py
│  │  ├─ project_repository.py
│  │  ├─ seat_repository.py
│  │  ├─ seat_assignment_repository.py
│  │  ├─ building_repository.py
│  │  └─ floor_repository.py
│  ├─ services/
│  │  ├─ employee_service.py
│  │  ├─ project_service.py
│  │  ├─ seat_service.py
│  │  ├─ seat_allocation_service.py
│  │  ├─ search_service.py
│  │  ├─ dashboard_service.py
│  │  ├─ analytics_service.py
│  │  ├─ ai_service.py
│  │  └─ auth_service.py
│  ├─ routers/
│  │  ├─ auth.py
│  │  ├─ employees.py
│  │  ├─ projects.py
│  │  ├─ seats.py
│  │  ├─ buildings.py
│  │  ├─ floors.py
│  │  ├─ seat_allocations.py
│  │  ├─ search.py
│  │  ├─ dashboard.py
│  │  ├─ analytics.py
│  │  └─ ai.py
│  └─ ai/
│     ├─ prompt_builder.py
│     ├─ intent_schema.py
│     └─ llm_client.py
├─ alembic/
│  ├─ versions/
│  └─ env.py
├─ scripts/
│  └─ seed.py
├─ tests/
│  ├─ test_employees.py
│  ├─ test_seat_allocation.py
│  ├─ test_search.py
│  └─ conftest.py
├─ Dockerfile
├─ docker-compose.yml
├─ alembic.ini
├─ requirements.txt (or pyproject.toml)
└─ .env.example
```

---

# 21. Coding Standards

## 21.1 Naming

- **Backend (Python):** `snake_case` for functions/variables/modules, `PascalCase` for classes/Pydantic models/SQLAlchemy models, `SCREAMING_SNAKE_CASE` for constants/env keys. Router path operation functions named after the action (`list_employees`, `get_employee`, `create_employee`).
- **Frontend (TypeScript):** `camelCase` for variables/functions, `PascalCase` for components/types/interfaces, `kebab-case` for file names (`employee-form.tsx`), hooks prefixed `use*`.
- **Database:** `snake_case` table/column names, plural table names (`employees`, `seat_assignments`), FK columns named `{referenced_table_singular}_id`.

## 21.2 Formatting

- Backend: `black` (formatting) + `ruff` (linting) + `isort` (import order), enforced via a pre-commit config (or at minimum run manually before each commit).
- Frontend: `prettier` + `eslint` (Next.js recommended config + `@typescript-eslint`).
- Line length ~100 chars soft guideline both sides.

## 21.3 Comments

- Comments explain **why**, not what (the code should be readable enough to explain "what" on its own). Reserved for non-obvious business rules (e.g., "partial unique index is the real guard here, this check is just for a clean error message") and any deliberate simplification/known-limitation (e.g., "localStorage JWT storage - acceptable for this timebox, see Section 17 for hardening note").
- Every service method with a non-trivial business rule gets a one-to-three-line docstring describing the rule, not just the mechanics.

## 21.4 Error Handling (standard, ties to Section 16)

- Never swallow exceptions silently; either handle meaningfully or let the global handler catch and log them.
- Domain exceptions always carry a stable `code` string (used both for the API response and potentially for i18n later).

## 21.5 Git Commits

- Conventional Commits style: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:` prefixes.
- Small, logically scoped commits (e.g., `feat: add seat allocation service with conflict detection`, not one giant "day 1" commit) - makes the history itself a readable narrative of the build, which matters for an assessment context.
- No secrets, `.env`, or `node_modules`/`__pycache__` committed (`.gitignore` set up in the first commit).

---

# 22. Testing Plan

## 22.1 Unit Tests (backend, `pytest`)

- Service-layer tests with a test DB (SQLite or a throwaway Postgres test DB via `docker-compose`) covering: seat allocation success, seat-already-occupied rejection, employee-already-seated rejection, release flow, auto-allocate seat-selection heuristic, allocation-percent-over-100 warning, employee deactivation cascade (auto-release + close project mappings).
- Repository tests for the trickier query methods (`find_best_available_seat`, search relevance ordering).

## 22.2 Integration Tests (backend, `pytest` + FastAPI `TestClient`/`httpx.AsyncClient`)

- Full request/response cycle for the core happy paths of each router (create employee → 201 → get by id → 200; allocate seat → release seat → seat becomes available again; login → protected route with/without token → 200/401).
- At least one negative-path integration test per critical business rule (double-allocate a seat → `409`; allocate to inactive employee → `400`).

## 22.3 Manual Testing

- A `MANUAL_TEST_CHECKLIST.md` (or a section in README) walking through the MVP checklist (Section 19.4) end-to-end in the deployed UI before final submission: login, create employee, create project, map employee to project, allocate seat, release seat, auto-allocate a new joiner, search, view dashboard, ask the AI assistant 2-3 suggested prompts.
- Cross-browser spot check (Chrome + one other) and a basic responsive check (desktop + tablet width) given the "responsive, tablet-usable" NFR (Section 1.4).

## 22.4 API Testing

- Swagger UI (`/docs`) used directly to exercise every endpoint at least once during development.
- A small Postman/Thunder Client/`*.http` collection (or equivalent) committed to the repo as a convenience artifact for the reviewer, covering the core flows.

---

# 23. Deployment Plan

## 23.1 Frontend (Vercel)

- Connect the GitHub repo, set root directory to `frontend/`.
- Env vars: `NEXT_PUBLIC_API_BASE_URL` (points to the deployed backend URL).
- Vercel auto-builds on push to `main`; preview deployments on PRs (nice-to-have, not required).

## 23.2 Backend (Railway or Render)

- Dockerized FastAPI service (`Dockerfile` in `backend/`), exposing the port via `$PORT` env var (both platforms inject this).
- Env vars: `DATABASE_URL`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS` (set to the Vercel URL), `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`.
- Startup command runs Alembic migrations (`alembic upgrade head`) before starting Uvicorn (either as a release/pre-deploy step if the platform supports it, or as the first lines of an entrypoint script) so the deployed DB schema is always current.
- Seed script run once manually post-deploy (`railway run python -m scripts.seed` or platform-equivalent) - not run automatically on every deploy, to avoid accidentally re-seeding a live-edited demo DB.

## 23.3 Database (Railway PostgreSQL)

- Managed Postgres instance provisioned via Railway; connection string injected into the backend service as `DATABASE_URL`.
- `pg_trgm` extension enabled via an early Alembic migration (`CREATE EXTENSION IF NOT EXISTS pg_trgm;`).

## 23.4 Environment Variables (consolidated)

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Backend | Postgres connection string |
| `JWT_SECRET` | Backend | Sign/verify auth tokens |
| `CORS_ALLOWED_ORIGINS` | Backend | Allowed frontend origin(s) |
| `AI_PROVIDER` / `AI_MODEL` / `AI_API_KEY` | Backend | AI Assistant LLM config |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Backend base URL |

## 23.5 CI Ideas (conceptual, stretch)

A simple GitHub Actions workflow on PRs: install deps → `ruff`/`black --check` + `pytest` (backend); `eslint`/`tsc --noEmit` (frontend) → fail the PR check on any error. Not required for submission but documented here so it's a five-minute add if time remains.

---

# 24. AI Usage Plan

This section documents how AI (e.g., Claude, ChatGPT, Copilot) should be used **by the developer building this project**, distinct from Section 12's in-product AI Assistant feature.

## 24.1 Responsible Use Principles

- AI tools are used to accelerate boilerplate (CRUD scaffolding, repetitive schema/router patterns, seed-data generation logic, test scaffolding) - not to replace understanding of the architecture or business rules described in this document.
- Every AI-generated code block is read and understood before being committed; nothing is pasted in blind, especially around the seat-allocation concurrency logic (Section 11) and auth/security code (Section 17), which get manual review priority.
- AI is used to help write this very document's boilerplate sections (tables, folder trees) but all architectural decisions (layering, index choices, the whitelisted-intent AI safety design) are deliberate, reviewed choices, not unreviewed AI suggestions.

## 24.2 How to Document Prompts

- An `AI_PROMPTS.md` file at the repo root logs, at a lightweight level (not every micro-prompt): the significant prompts used per major component (e.g., "Generate SQLAlchemy models for the schema in Section 4," "Write the seat allocation service with the conflict-detection rules in Section 11"), which tool was used, and a one-line note on what was accepted vs. modified.
- This is meant to be a transparency artifact for the assessment reviewer, not exhaustive prompt-by-prompt logging.

## 24.3 How to Validate Outputs

- All AI-generated backend logic is exercised by the tests in Section 22 before being considered "done" - tests are the actual acceptance criterion, not "it looked right."
- AI-generated SQL/migrations are read line-by-line against the schema in Section 4 before being applied, specifically checking FK directions, index definitions (especially the two partial unique indexes, which are easy to get subtly wrong and are the crux of the system's correctness guarantee), and cascade behaviors.
- AI-generated frontend code is manually clicked-through in the browser for each of the loading/error/empty states listed in Section 7, since these are easy for AI to omit or stub without it being obvious from reading the code alone.

---

# 25. Final Submission Checklist

## 25.1 GitHub

- [ ] Public (or reviewer-accessible) repository with clean commit history (Section 21.5 conventions).
- [ ] `.gitignore` correctly excludes `.env`, `node_modules/`, `__pycache__/`, build artifacts.
- [ ] No secrets present anywhere in git history.

## 25.2 README

- [ ] Project overview + architecture summary (can largely reference/summarize this IMPLEMENTATION_PLAN.md).
- [ ] Local setup instructions (Docker Compose for DB, backend `pip install` + `alembic upgrade head` + `uvicorn` run command, frontend `npm install` + `npm run dev`).
- [ ] Seed instructions (`python -m scripts.seed`) with expected row counts.
- [ ] Seeded admin login credentials for demo purposes.
- [ ] Deployed URLs (frontend + backend `/docs`).
- [ ] Known limitations section (localStorage JWT, offset pagination, no floor-plan visual editor, etc. - the deliberate simplifications called out throughout this document).

## 25.3 Swagger

- [ ] `/docs` (Swagger UI) reachable on the deployed backend and lists every endpoint from Section 6 with correct request/response schemas and documented error codes.

## 25.4 Seed

- [ ] Seed script run successfully against the deployed database at least once; row counts verified (~5,000 employees, matching seat/project/mapping counts per Section 14).

## 25.5 Deployment

- [ ] Frontend live on Vercel, successfully calling the deployed backend (no CORS errors).
- [ ] Backend live on Railway/Render, migrations applied, `/docs` and a sample GET endpoint verified in a browser.
- [ ] Database reachable only by the backend (no public DB port exposure beyond what the managed provider requires for the backend's own connection).

## 25.6 Screenshots

- [ ] Dashboard, Employees list, Employee detail, Allocation wizard, Seats grid, Analytics, AI Assistant - one clean screenshot each - included in README or a `/screenshots` folder, giving a reviewer a fast visual overview without needing to run the app.

## 25.7 AI_PROMPTS

- [ ] `AI_PROMPTS.md` present at repo root per Section 24.2, giving a transparent, honest account of where and how AI assisted development.

## 25.8 Final Sanity Pass

- [ ] MVP checklist (Section 19.4) fully checked off.
- [ ] Manual test checklist (Section 22.3) walked through once, end-to-end, on the deployed environment (not just localhost).
- [ ] This document (`IMPLEMENTATION_PLAN.md`) itself committed to the repo root as the definitive design record.

---

*End of IMPLEMENTATION_PLAN.md*
