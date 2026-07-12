"""Test the actual AI guidance chat endpoint."""
import json, urllib.request

# Test POST /api/ai-guidance/chat
data = json.dumps({
    "patient_id": 1,
    "question": "缩唇呼吸怎么做更有效？",
})

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/ai-guidance/chat",
    data=data.encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        print("STATUS:", resp.status)
        print("RESPONSE:", raw[:500])
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="replace")
    print(f"HTTP ERROR {e.code}: {body[:500]}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {str(e)[:500]}")

# Also test GET /api/ai-guidance/latest
req2 = urllib.request.Request(
    "http://127.0.0.1:8000/api/ai-guidance/latest?patient_id=1",
    method="GET",
)
try:
    with urllib.request.urlopen(req2, timeout=10) as resp2:
        raw2 = resp2.read().decode("utf-8")
        print("\nGUIDANCE STATUS:", resp2.status)
        print("GUIDANCE RESPONSE:", raw2[:300])
except urllib.error.HTTPError as e2:
    print(f"\nGUIDANCE HTTP ERROR {e2.code}: {e2.read().decode()[:300]}")
except Exception as e2:
    print(f"\nGUIDANCE ERROR: {type(e2).__name__}: {str(e2)[:300]}")
