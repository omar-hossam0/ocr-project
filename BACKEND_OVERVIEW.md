Backend overview
================

This project now includes a separate Express backend in the `backend/` folder.
It mirrors the existing Next.js API endpoints and uses MongoDB for data and
GridFS for file storage.

Quick start
-----------
1) Install dependencies:
	- `cd backend`
	- `npm install`

2) Configure environment:
	- Copy `backend/.env.example` to `backend/.env`
	- Set `MONGODB_URI`, `MONGODB_DB`, and `JWT_SECRET`

3) Run the server:
	- `npm run dev`

Key env variables
-----------------
- `MONGODB_URI`: MongoDB connection string.
- `MONGODB_DB`: Database name.
- `JWT_SECRET`: Secret for signing JWTs.
- `JWT_REQUIRED`: Set to `1` to require JWT for all `/api` routes.
- `PORT`: Backend port (default `4000`).
- `CORS_ORIGIN`: Comma-separated list of allowed origins.

Admin seed (optional)
---------------------
If you set these env vars, the backend seeds an admin user on boot:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME` (optional)
- `ADMIN_ROLE` (optional, defaults to Admin)

Endpoints (Express)
-------------------
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/health`
- `GET /api/firestore-check`
- `GET /api/files`
- `POST /api/files`
- `GET /api/files/:id`
- `PATCH /api/files/:id`
- `DELETE /api/files/:id`
- `POST /api/upload`
- `GET /api/storage/:id`
- `POST /api/ocr`
- `POST /api/ocr/queue`
- `GET /api/search`
- `GET /api/stats`
- `GET /api/tracking`
- `POST /api/tracking`
- `DELETE /api/tracking/:id`
- `GET /api/settings/locations`
- `POST /api/settings/locations`
- `PATCH /api/settings/locations/:id`
- `DELETE /api/settings/locations/:id`
- `GET /api/settings/departments`
- `POST /api/settings/departments`
- `PATCH /api/settings/departments/:id`
- `DELETE /api/settings/departments/:id`
- `GET /api/settings/system`
- `PATCH /api/settings/system`
- `GET /api/settings/users`
