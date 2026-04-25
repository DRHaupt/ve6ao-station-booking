# Station Monitoring & Heartbeat Agent

This system allows us to see if the computers in the radio room are actually powered on and responsive without having to check them manually.

## The Heartbeat Agent (`station_agent.py`)

The agent is a simple Python script designed to run in the background.

### Script Logic:
1.  It reads the **Station ID** (North, South, East, West, Flex, etc.).
2.  It enters an infinite loop.
3.  Every 60 seconds, it makes an HTTP `POST` request to the server:
    `https://<server-url>/api/stations/<stationId>/heartbeat`
4.  If the server is unreachable, it logs an error and tries again in the next cycle.

---

## Server Handling

In `server.ts`, the heartbeat is handled by a simple endpoint that doesn't require a user token (since the station computers themselves are trusted).

```typescript
// Heartbeat endpoint
app.post('/api/stations/:id/heartbeat', (req, res) => {
  const { id } = req.params;
  const pings = loadData(PINGS_FILE);
  pings[id] = new Date().toISOString(); // Save current time
  saveData(PINGS_FILE, pings);
  res.json({ success: true });
});
```

---

## Windows Deployment (`install_agent.bat`)

Since the station computers are Windows-based, we provide a batch script to make installation effortless for the station team.

**What the installer does:**
1.  **Verification**: Checks if Python is installed on the machine.
2.  **Isolation**: Creates a folder at `C:\VE6AO_Agent`.
3.  **Dependencies**: Runs `pip install requests` to ensure the script can make web calls.
4.  **Configuration**: Prompts the person installing it to choose which station this computer belongs to.
5.  **Persistence**: Creates a **Windows Scheduled Task** named "VE6AO_Station_Agent" that triggers "At User Logon" and runs "Hidden" (no command prompt window visible).

### Installation Steps:
1.  Download `install_agent.bat` and `station_agent.py` to the station computer.
2.  Right-click `install_agent.bat` and **Run as Administrator**.
3.  Select the Station Name from the list.
4.  Reboot or Log Off/On to start the monitoring.

---

## Frontend Visualization

In `src/App.tsx`, the status is calculated dynamically. We do **not** store the "Online/Offline" status in the database. Instead, we store the "Last Seen" time.

**The Logic:**
```javascript
const isOnline = station.lastSeen && (new Date().getTime() - new Date(station.lastSeen).getTime()) < 120000;
```
If the station has talked to the server in the last **120 seconds** (2 heartbeats), we show the blue pulsing dot. This accounts for minor network jitter.
