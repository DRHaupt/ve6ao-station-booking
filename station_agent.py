import time
import requests
import socket

# Configuration
SERVER_URL = "https://ais-dev-nsh5nqfkjjuucausuanaw5-119103260736.us-east5.run.app" # Replace with your actual server URL
STATION_ID = "north" # Replace with this computer's station ID (e.g., north, south, east, west, flex, basic)
INTERVAL = 60 # Ping every 60 seconds

def send_heartbeat():
    url = f"{SERVER_URL}/api/stations/{STATION_ID}/heartbeat"
    try:
        response = requests.post(url, timeout=10)
        if response.status_code == 200:
            print(f"[{time.strftime('%H:%M:%S')}] Heartbeat sent successfully.")
        else:
            print(f"[{time.strftime('%H:%M:%S')}] Failed to send heartbeat: {response.status_code}")
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] Error sending heartbeat: {e}")

if __name__ == "__main__":
    print(f"Station Heartbeat Agent started for station: {STATION_ID}")
    print(f"Target Server: {SERVER_URL}")
    
    while True:
        send_heartbeat()
        time.sleep(INTERVAL)
