# Deployment

## Architecture

- Frontend (`/`) deploy on Vercel
- Admin (`/admin` project folder) deploy on Vercel as a separate project
- Backend (`/backend`) deploy on Vercel as a separate project (serverless)

## 1) Deploy Backend (Vercel Project)

Create a Vercel project with:

- Root Directory: `backend`
- Build Command: leave empty (or default)
- Output Directory: not required (API project)

Set environment variables from `backend/.env.example`:

- `MONGODB_URI`
- `JWT_SECRET`
- `PORT` (optional)

After backend is live, note your backend URL, for example:

`https://your-backend.vercel.app`

## 2) Deploy Frontend (Root Project)

In Vercel project settings:

- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL=https://your-backend.vercel.app`

## 3) Deploy Admin (Second Vercel Project)

Create a second Vercel project from the same repo:

- Root Directory: `admin`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL=https://your-backend.vercel.app`

## Notes

- This repo is now configured to read API base URL from `VITE_API_BASE_URL`.
- If `VITE_API_BASE_URL` is empty, local development fallback remains active.
- Backend API routes are exposed under `/api/*` via `backend/api/[...all].js`.