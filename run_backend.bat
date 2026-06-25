@echo off
cd /d d:\M-sis-project\pulmo-rehab\backend
D:\Anaconda\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
pause