@echo off
echo Starting Backend...
start "Backend" cmd /c "cd /d d:\M-sis-project\pulmo-rehab\backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000"
echo Starting Frontend...
start "Frontend" cmd /c "cd /d d:\M-sis-project\pulmo-rehab\doctor-web && npx vite --port 3008"
echo Done. Close this window.
pause