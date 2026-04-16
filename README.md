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
- [Production build](#production-build)
  - [Docker Compose (recommended)](#docker-compose-recommended)
  - [Manual build](#manual-build)
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

## Production build

### Docker Compose (recommended)

This is the simplest path. Docker Compose builds both services, wires them together and serves the frontend via nginx.

```bash
# From the repo root
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (nginx) | http://localhost:3000 |
| Backend (uvicorn) | http://localhost:8000 |

The nginx config proxies `/api/*` to the backend, so the frontend only needs to talk to port 3000.

To run in the background:

```bash
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

---

### Manual build

#### Backend

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

#### Frontend

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
