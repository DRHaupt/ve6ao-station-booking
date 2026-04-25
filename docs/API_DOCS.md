# VE6AO Station Booking - API & Developer Documentation

This document outlines the technical architecture, API endpoints, and development guidelines for the **VE6AO Station Booking System**.

---

## 1. System Architecture

The application is built using a modern full-stack TypeScript architecture:
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion.
- **Backend**: Node.js with Express.
- **Database**: Flat-file JSON storage (stored in `/data`).
- **Monitoring**: Python-based heartbeat agents running on station computers.

### Data Storage (`/data`)
- `bookings.json`: All future and past station reservations.
- `users.json`: User profiles, hashed passwords, and Kiosk PINs.
- `stations.json`: Station metadata and operational status.
- `kiosk_logs.json`: In-person check-in/check-out history.
- `reports.json`: Equipment health reports.
- `pings.json`: Last-seen timestamps for station heartbeats.

---

## 2. Authentication

The system uses **JSON Web Tokens (JWT)** for web authentication and **4-digit PINs** for Kiosk authentication.

### Web Auth
Include the JWT in the `Authorization` header for protected routes:
`Authorization: Bearer <your_token>`

### Kiosk Auth
The Kiosk uses a 4-digit PIN stored in the user's profile.

---

## 3. API Endpoints

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/register` | Register a new member. |
| `POST` | `/api/login` | Login and receive a JWT. |
| `GET` | `/api/me` | Get current user's profile info. |
| `PUT` | `/api/me/pin` | Update own 4-digit Kiosk PIN. |

### Bookings
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/bookings` | List all bookings. |
| `POST` | `/api/bookings` | Create a new booking (supports `recurring: n`). |
| `DELETE` | `/api/bookings/:id` | Cancel a booking (Owner or Admin only). |
| `PUT` | `/api/bookings/:id` | Update a booking (Admin only). |

### Stations & Health
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/stations` | List stations with real-time status and heartbeats. |
| `PUT` | `/api/stations/:id` | Update station status (Operational/Maintenance). |
| `POST` | `/api/stations/:id/report` | Submit an equipment failure report. |
| `POST` | `/api/stations/:id/heartbeat` | Receive ping from station computer (Agent). |

### Kiosk Mode
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/kiosk/active` | Get list of currently checked-in users. |
| `POST` | `/api/kiosk/login` | Verify PIN and return user context. |
| `POST` | `/api/kiosk/check-in` | Start a check-in session. |
| `POST` | `/api/kiosk/check-out` | End an active session. |
| `GET` | `/api/kiosk/logs` | View all historical Kiosk logs (Admin only). |

### Admin & System
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/users` | List all registered users (Admin only). |
| `DELETE` | `/api/users/:id` | Remove a user and their bookings (Admin only). |
| `PUT` | `/api/users/:id/role` | Change user role (User/Admin). |
| `GET` | `/api/solar` | Proxy for real-time solar weather XML. |
| `GET` | `/api/logo` | Serves the station logo (local file or fallback). |

---

## 4. Station Monitoring Agent

Each station computer runs a lightweight **Python Heartbeat Agent** (`station_agent.py`).

### How it works:
1. The agent pings `POST /api/stations/:id/heartbeat` every 60 seconds.
2. The server records the timestamp in `pings.json`.
3. The UI calculates "Online" status: `currentTime - lastSeen < 2 minutes`.

### Windows Deployment (`install_agent.bat`):
The provided batch script automates the setup on Windows:
- Checks for Python.
- Installs `requests` library.
- Creates the local script folder.
- Configures a **Windows Scheduled Task** to run the agent silently on user logon.

---

## 5. Development & Deployment

### Environment Variables (.env)
- `JWT_SECRET`: Secret key for token signing.
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`: For email notifications.
- `PUBLIC_URL`: Used for constructing absolute resource paths (e.g., logo).
- `REMOTE_SERVER_URL`: The URL of the production backend for mobile/native apps.

### CORS Configuration
The backend is configured to allow `capacitor://localhost` and `http://localhost` to support native Android/iOS apps built with Capacitor.

### Build Commands
- `npm run dev`: Start Vite dev server and Express backend (via `tsx`).
- `npm run build`: Compile the React frontend to `/dist`.
- `npm run start`: Serve production builds (Node.js).
- `npm run lint`: Run TypeScript type checking.

---

## 6. Directory Structure
- `/src`: Frontend React source code.
- `/data`: JSON database files.
- `/public`: Static assets.
- `server.ts`: Main entry point for the Express backend.
- `station_agent.py`: Python script for station-side heartbeat.
- `install_agent.bat`: Windows installer for the heartbeat agent.
- `manifest.json`: PWA configuration for mobile installation.

---

## 7. Logo & Customization
The server looks for a custom logo at:
`/var/www/stationbooking/stationbooking/CARA_Logo_Blankx50.webp`

If missing, it fallbacks to the Google Cloud Storage URI or a placeholder. Admins can update this path directly in `server.ts` or replace the file on the server.
