# Database & Data Storage

This system uses a **NoSQL flat-file database**. Instead of a complex SQL server like MySQL, we store data in human-readable JSON files. This makes backups simple and allows for easy data migrations.

## Storage Location: `/data`

All application data is persisted in the `/data` directory at the root of the project.

### `users.json`
Stores member information.
-   **Passwords**: Hashed using `bcryptjs` for security.
-   **PINs**: Hashed using `bcryptjs`.
-   **Roles**: `user` or `admin`.

### `bookings.json`
A list of all station reservations.
-   **ID**: Unique identifier.
-   **stationId**: Link to the station.
-   **userId**: Link to the member who booked it.
-   **start/end**: ISO 8601 timestamps.

### `stations.json`
Metadata about each radio station.
-   **ID**: (North, South, etc.)
-   **Status**: `operational`, `maintenance`, or `in_use`.
-   **Description**: Displayed in the UI.

### `pings.json`
A temporary key-value store for monitoring.
-   **Key**: Station ID.
-   **Value**: Timestamp of the last received heartbeat.

---

## How Data is Managed (Data Access Layer)

In `server.ts`, we use two utility functions to interact with these files:

### `loadData(file)`
This function reads a file from disk, parses it from JSON into a JavaScript object, and returns it. If the file is missing, it returns an empty list or object to prevent crashes.

### `saveData(file, data)`
This function takes a JavaScript object, converts it to a pretty-printed JSON string, and overwrites the file on disk.

---

## Atomic Writes & Corruption Prevention

To prevent data loss if the server crashes during a write, consider these upgrades in the future:
1.  **Backups**: Periodically copy the `/data` folder to a separate location.
2.  **Journaling**: Write to a temporary file first (`data.json.tmp`) and then rename it to the final file name.

## Data Inspection
Since the files are plain text, you can open them in any code editor to manually fix a entry or verify its content. **Warning**: Always stop the server before manually editing JSON files to avoid conflicts.
