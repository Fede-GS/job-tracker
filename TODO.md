# 🚀 Deployment Plan — Render.com

## Steps

- [x] 1. Add `gunicorn` to `backend/requirements.txt`
- [x] 2. Create `backend/Procfile` for Gunicorn
- [x] 3. Update `backend/app/config.py` — all secrets from env vars, OPEN_REGISTRATION=False
- [x] 4. Update `backend/app/__init__.py` — CORS reads allowed origins from env var
- [x] 5. Update `frontend/src/api/client.js` — use `VITE_API_BASE_URL` env var
- [x] 6. Update `frontend/vite.config.js` — production-ready config
- [x] 7. Create `render.yaml` — one-click Render deploy config
- [x] 8. Create `backend/.env.example` — backend env vars template
- [x] 9. Create `frontend/.env.example` — frontend env vars template
- [x] 10. Create `DEPLOY.md` — step-by-step deployment guide

## ✅ All done! Next: push to GitHub and deploy on Render.com
## See DEPLOY.md for the full step-by-step guide.
