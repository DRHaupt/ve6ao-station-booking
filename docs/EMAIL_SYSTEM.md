# Email System & Notifications

Communication is a key part of the VE6AO booking system. The app automatically sends emails for important events.

## Core Components

-   **Library**: `nodemailer` (Node.js).
-   **Logic**: Located in `server.ts`.
-   **Assets**: Uses the `caraLogoImage` absolute URL for cross-client compatibility.

---

## Triggered Notifications

### 1. Booking Confirmation
Sent immediately after a user creates a booking.
-   **Recipient**: The member who booked.
-   **Content**: Station name, date, and start/end time.
-   **Context**: Includes an `Add to Calendar` call-to-action (referencing the `.ics` utility).

### 2. Booking Cancellation
Sent when a booking is deleted (either by the user or an admin).
-   **Recipient**: The member who booked.
-   **Note**: If an admin deletes it, the email serves as an official notification.

### 3. Issue Reports
Sent when a user submits a maintenance report via the Dashboard.
-   **Recipient**: The Station Team (configured in environment variables).
-   **Severity Levels**: Low, Medium, or High.
-   **Urgency**: High severity reports also trigger a station status change.

---

## Email Templates

The emails are styled using standard HTML for compatibility with Outlook, Gmail, and web-based mail clients.

---

## Troubleshooting

### Emails not sending?
1.  **Check SMTP credentials**: Verify the host, port, user, and password in your `.env` file.
2.  **SSL/TLS**: Ensure the port matches the host (Port 465 for SSL, 587 for TLS).
3.  **App Passwords**: If using Gmail, ensure you created an "App Password" and didn't use your main account password.
4.  **Firewall**: Ensure the server allows outgoing traffic on the SMTP ports.

### Logo not appearing in emails?
Emails require an **absolute URL** for images. Ensure your `PUBLIC_URL` in `.env` is set correctly to your live website (e.g., `https://booking.ve6ao.ca`).
