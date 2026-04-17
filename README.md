# CurveExtract — Photo to 3-D Model

Upload a photograph of an object placed on an A4 calibration sheet, extract its curved profile, edit the waypoints, and download a STEP or STL file ready for CAD software.

---

## Table of contents

- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
  - [1 — Backend](#1--backend)
  - [2 — Frontend](#2--frontend)
- [Running the tests](#running-the-tests)
  - [Backend tests](#backend-tests)
  - [Frontend unit tests](#frontend-unit-tests)
  - [End-to-end tests](#end-to-end-tests)
- [Docker Compose](#docker-compose)
  - [Development](#development)
  - [Production](#production)
- [GitHub Codespaces](#github-codespaces)
- [Production build (manual)](#production-build-manual)
  - [Manual build — Backend](#manual-build--backend)
  - [Manual build — Frontend](#manual-build--frontend)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)

---

## How it works

1. **Upload** — photograph your object on a white A4 sheet and upload it.
2. **Calibrate** — OpenCV detects the A4 sheet, computes the perspective transform and derives a pixel-to-mm scale.
3. **Edit** — the simplified contour is shown in an interactive SVG editor; drag handles to adjust, click to add points.
4. **Export** — CadQuery extrudes (or revolves) the profile and generates a STEP or STL file for download.

---

## Prerequisites

| Tool | Minimum version | Install |
|---|---|---|
| Python | 3.11 | [python.org](https://www.python.org/downloads/) |
| Node.js | 18 LTS | [nodejs.org](https://nodejs.org/) |
| npm | 9 | bundled with Node |
| Docker + Compose | 24 / v2 | [docs.docker.com](https://docs.docker.com/get-docker/) *(production only)* |

---

## Local development

### 1 — Backend

```bash
# From the repo root
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server (hot-reload enabled)
uvicorn app.main:app --reload --port 8000
```

The API is now available at **http://localhost:8000**.

Interactive API docs (Swagger UI): **http://localhost:8000/docs**  
OpenAPI JSON spec: **http://localhost:8000/openapi.json**

> **Note — CadQuery on Apple Silicon / Windows**  
> CadQuery has native wheels for most platforms. If `pip install cadquery` fails,
> follow the [CadQuery installation guide](https://cadquery.readthedocs.io/en/latest/installation.html)
> or use the Docker path described below.

---

### 2 — Frontend

Open a second terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite dev server (proxies /api/* → localhost:8000)
npm run dev
```

The app is now available at **http://localhost:3000**.

The Vite proxy (`vite.config.ts`) forwards every `/api/…` request to the backend, so no CORS configuration is needed during development.

#### Regenerate the API client (optional)

After making changes to the backend routes, refresh the TypeScript types and hooks:

```bash
# Requires the backend to be running on port 8000
npm run generate-api
```

Generated files are written to `src/api/generated/`.

---

## Running the tests

### Backend tests

```bash
cd backend
source .venv/bin/activate

# Run all tests with coverage
pytest

# Run a specific file
pytest tests/test_image.py -v

# Run only API integration tests
pytest tests/test_api.py -v
```

Coverage report is printed to the terminal; an HTML report is written to `htmlcov/`.

### Frontend unit tests

```bash
cd frontend
npm test
```

Tests use Jest and React Testing Library. API hooks are mocked so no backend is required.

### End-to-end tests

Playwright tests require the Vite dev server to be running (or will start it automatically):

```bash
cd frontend

# Install browsers on first run
npx playwright install --with-deps

# Run all e2e tests
npm run test:e2e

# Run in headed mode to watch the browser
npx playwright test --headed
```

An HTML report is generated at `playwright-report/index.html`.

---

## Docker Compose

Both compose files live at the repo root. Choose the one that matches your workflow.

---

### Development

`docker-compose.dev.yml` mounts your local source folders into the containers so changes are reflected immediately — no rebuild needed.

| Service | URL | Notes |
|---|---|---|
| Backend (uvicorn --reload) | http://localhost:8000 | Hot-reload on every Python file save |
| Frontend (Vite dev server) | http://localhost:3000 | HMR on every TypeScript/CSS save |

```bash
# From the repo root — start both services
docker compose -f docker-compose.dev.yml up --build

# Run in the background
docker compose -f docker-compose.dev.yml up --build -d

# Tail the logs
docker compose -f docker-compose.dev.yml logs -f

# Stop and remove containers
docker compose -f docker-compose.dev.yml down
```

> **First run**: `npm install` runs automatically inside the frontend container, so the initial startup takes a little longer.

---

### Production

`docker-compose.yml` builds optimised images — the frontend is compiled by Vite and served via nginx.

| Service | URL | Notes |
|---|---|---|
| Frontend (nginx) | http://localhost:3000 | Serves the Vite production bundle |
| Backend (uvicorn) | http://localhost:8000 | nginx proxies `/api/*` to this service |

```bash
# From the repo root — build images and start both services
docker compose up --build

# Run in the background
docker compose up --build -d

# Tail the logs
docker compose logs -f

# Stop and remove containers
docker compose down
```

---

## GitHub Codespaces

GitHub Codespaces provides a fully configured cloud dev environment directly in the browser — no local setup required.

### Getting started

1. On the repository homepage, click **Code → Codespaces → Create codespace on main** (or your branch).
2. Wait for the codespace to finish provisioning (usually under two minutes).
3. A VS Code editor opens in your browser with the repo already checked out.

### Running development compose in a codespace

```bash
# Inside the codespace terminal
docker compose -f docker-compose.dev.yml up --build -d
```

Codespaces automatically forwards the exposed ports. Open the **Ports** panel (bottom status bar → *Ports*) to find the forwarded URLs for port **3000** (frontend) and port **8000** (backend). Click the globe icon next to each port to open it in a new browser tab.

> **Tip:** Set ports to *Public* visibility in the Ports panel if you want to share a preview URL with a team-mate.

### Running production compose in a codespace

```bash
docker compose up --build -d
```

The same port-forwarding applies — port **3000** serves the nginx-bundled frontend and **8000** serves the API.

### Stopping services

```bash
# Development
docker compose -f docker-compose.dev.yml down

# Production
docker compose down
```

---

## Production build (manual)

### Manual build — Backend

```bash
cd backend
source .venv/bin/activate

# Run with a production-grade server (multiple workers)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

For long-running deployments, wrap uvicorn with [gunicorn](https://gunicorn.org/):

```bash
pip install gunicorn
gunicorn app.main:app -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 --workers 4
```

### Manual build — Frontend

```bash
cd frontend

# Type-check and bundle
npm run build

# The output is in frontend/dist/
# Serve it with any static file server, e.g. nginx or serve:
npx serve dist -l 3000
```

Point your production nginx (or other reverse proxy) at the `dist/` folder and proxy `/api/*` to the backend. A minimal nginx snippet:

```nginx
server {
    listen 80;
    root /path/to/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Environment variables

### Backend

| Variable | Default | Description |
|---|---|---|
| *(none required)* | — | Temp files are written to `/tmp/curve_extraction/` |

### Frontend

Create `frontend/.env.local` (never committed) to override defaults:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE` | `""` (empty — uses Vite proxy) | Full API origin for production, e.g. `https://api.example.com` |

In production, set `VITE_API_BASE` at build time if the API lives on a different origin than the frontend:

```bash
VITE_API_BASE=https://api.example.com npm run build
```

---

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/           # Route handlers (upload, contour, model, status)
│   │   ├── models/        # Pydantic request/response schemas
│   │   ├── processing/    # OpenCV image pipeline + CadQuery 3-D generation
│   │   ├── storage/       # Token-based temp file store
│   │   └── main.py        # FastAPI application entry point
│   ├── tests/             # pytest unit + integration tests
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/           # Typed fetcher, schemas and React Query hooks
│   │   ├── components/    # Shared UI (DropZone, CurveEditor, NavBar, …)
│   │   │   └── ui/        # shadcn/ui-compatible primitives
│   │   ├── pages/         # UploadPage → CalibrationPage → EditorPage → ExportPage
│   │   └── lib/           # Utility helpers (cn)
│   ├── e2e/               # Playwright end-to-end tests
│   ├── public/
│   ├── Dockerfile
│   └── nginx.conf
│
└── docker-compose.yml
```
