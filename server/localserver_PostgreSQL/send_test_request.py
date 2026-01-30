import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_URL = "http://127.0.0.1:8080/api/events/launch"
url = os.environ.get("EVENT_ENDPOINT") or (sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL)

payload = {
    "install_id": "0d3e5b16-9c9c-4a2c-90a0-4b9325c3f39d",
    "app_version": "0.8.8",
    "platform": "macos",
    "os_version": "14.5.0",
    "locale": "zh-CN",
    "timestamp": "2026-01-30T22:12:10.000Z",
}

data = json.dumps(payload).encode("utf-8")
request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(request, timeout=5) as response:
        body = response.read().decode("utf-8")
        print(f"Endpoint: {url}")
        print(f"Status: {response.status}")
        print(body)
except urllib.error.HTTPError as exc:
    body = exc.read().decode("utf-8") if exc.fp else ""
    print(f"Endpoint: {url}")
    print(f"Status: {exc.code}")
    print(body)
except Exception as exc:
    print(f"Endpoint: {url}")
    print(f"Request failed: {exc}")
