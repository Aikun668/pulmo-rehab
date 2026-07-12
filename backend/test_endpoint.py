import json, urllib.request, sys

print("Starting chat test...", flush=True)
data = json.dumps({"patient_id": 1, "question": "hello"})
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/ai-guidance/chat",
    data=data.encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    resp = urllib.request.urlopen(req, timeout=90)
    print("STATUS:", resp.status, flush=True)
    print("BODY:", resp.read().decode()[:500], flush=True)
except urllib.error.HTTPError as e:
    print("HTTP_ERROR:", e.code, flush=True)
    print("ERROR_BODY:", e.read().decode()[:500], flush=True)
except Exception as e:
    print("ERROR:", type(e).__name__, str(e)[:500], flush=True)
print("Done.", flush=True)
