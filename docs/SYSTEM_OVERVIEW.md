# System Overview & Connections

This page explains "what connects to what" and how the data flows through the application.

## The Three Main Components

1.  **The Web Server (Backend)**:
    *   **Technology**: Node.js + Express.
    *   **File**: `server.ts`.
    *   **Role**: The central hub. It serves the web files, manages the JSON database, handles user security (JWT), and sends emails.

2.  **The Web Dashboard (Frontend)**:
    *   **Technology**: React + Tailwind CSS.
    *   **File**: `src/App.tsx`.
    *   **Role**: The user interface. It talks to the Backend via standard REST API calls (`fetch`).

3.  **The Station Agents (Monitoring)**:
    *   **Technology**: Python.
    *   **File**: `station_agent.py`.
    *   **Role**: These run on the actual radio station computers. They "phone home" to the Backend every minute to let everyone know the computer is alive.

---

## How Data Flows

### Booking a Station
1.  **User** clicks a slot in the React Calendar.
2.  **Frontend** sends a `POST /api/bookings` request with the user's token.
3.  **Backend** (`server.ts`) verifies the token, checks for conflicts in `data/bookings.json`, and saves the new entry.
4.  **Backend** then uses `nodemailer` to send a confirmation email to the user.

### Monitoring Station Health
1.  **Python Agent** runs on a station (e.g., "North Station").
2.  Every 60 seconds, it sends a request to the Backend.
3.  **Backend** updates `data/pings.json` with the station ID and current time.
4.  **Frontend** Dashboard polls `/api/stations` every few seconds.
5.  If the timestamp in `pings.json` is less than 2 minutes old, the Dashboard shows a **Blue Pulsing Dot**.

### The Kiosk Check-In
1.  **User** enters their 4-digit PIN on the tablet (Kiosk).
2.  **Frontend** sends `POST /api/kiosk/login`.
3.  **Backend** looks up the user by PIN in `data/users.json`.
4.  If successful, the **User** selects a station and "Checks In".
5.  The Backend logs this in `data/kiosk_logs.json`.
6.  The **Frontend** Dashboard immediately displays this activity in the "Current Activity" section.

---

## Security Model

*   **API Security**: Most routes (except registration and login) require a JWT. If you aren't logged in, the server returns `401 Unauthorized`.
*   **Admin Access**: The Backend checks the `user.role` field. Only users with the `admin` role can access `/api/users` or manually toggle station maintenance status.
*   **Station Reports**: When a user reports an issue, if it's marked "High Severity", the code automatically modifies `data/stations.json` to set `status: 'maintenance'`, preventing other users from booking it until fixed.
