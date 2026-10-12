# Looprun

Generate a random running loop of a chosen distance, starting from your current location or
any point you pick.

**Live:** https://smoo1.github.io/looprun/

## How it works

The backend draws a rough circle through the start point in a random direction, drops a few
jittered via points on it, and asks an OSRM foot router to join them along real streets and
paths. Routed loops come out longer than the circle they were drawn from, so it resizes the
circle and re-routes until the distance is within about 4% of the target. Dead-end stubs the
router runs up and back down are trimmed off.

## Stack

- `frontend/` — React, TypeScript, Tailwind CSS, Leaflet (Vite)
- `backend/` — Java 21, Spring Boot

Routing comes from the FOSSGIS OSRM server, place search from Photon, and map tiles from
OpenStreetMap. All three are free community services with no API keys; be gentle with them.

## Run locally

```sh
cd backend && ./mvnw spring-boot:run     # http://localhost:8080
cd frontend && npm install && npm run dev # http://localhost:5173
```

The frontend needs Node 20+. It talks to `http://localhost:8080` unless `VITE_API_URL` is set.

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/route?lat=&lng=&km=&seed=` | A loop of about `km` kilometres (1–50). `seed` is optional and makes the result repeatable. |
| `GET /api/geocode?q=&lat=&lng=` | Place search, optionally biased towards a point. |

## Deployment

- **Frontend:** GitHub Pages, built by `.github/workflows/deploy.yml` on every push to `main`.
  The API address is the `API_URL` repository variable.
- **Backend:** Docker (`backend/Dockerfile`). `render.yaml` describes a free Render web
  service; set `CORS_ALLOWED_ORIGINS` to the origin serving the frontend.
