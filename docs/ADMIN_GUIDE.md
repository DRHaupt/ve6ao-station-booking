# Club Administrator Guide

Administrators have access to special tools and overrides to keep the station running smoothly.

## Accessing Admin Tools

Once logged in with an account that has `role: 'admin'`, you will see extra options in the navigation menu:
-   **Kisok Admin**
-   **Admin**


---

## User Management

Located at the bottom of your the Admin page.
-   **Promote to Admin**: Grant another member administrative privileges.
-   **Reset PIN**: If a member forgets their Kiosk PIN, an admin can manually update it for them.
-   **Delete Account**: This will permanently remove the user and **automatically cancel all their future bookings** to free up the slots.

---

## Managing Station Status

As an Admin, you can manually override the status of any station.

### Maintenance Mode
If equipment is broken:
1.  Go to the **Station Management** section of the admin page.
2.  Toggle the station to **Maintenance**.
3.  This will immediately turn the station indicator **Orange** on the dashboard and prevent new bookings from being created for that station.

### Operational Mode
Once the station is fixed:
1.  Toggle it back to **Operational**.
2.  Check the dashboard to ensure the blue dot is pulsing (meaning the workstation computer is online).

---

## Monitoring Site Traffic

The **Usage Data & Export** section provides a history of everyone who has made a booking or checked into the shack in person.
-   **Calendar Bookings**: Useful for security audits or seeing station usage trends.
-   **Kiosk Access Logs**: Exports all physical kiosk sign-in sessions.

---

## Booking Overrides

Admins can delete **any** booking on the calendar.
-   Simply click the booking on the calendar and select **Delete Booking**.
-   The original owner will receive a cancellation email notifying them that their slot was removed.

---

## System Alerts

When a member reports an issue via the "Report Issue" card:
1.  The system sends an email to the configured **Admin Email List**.
2.  If the severity was "High", the station is automatically put into Maintenance mode.
3.  Admins should check the dashboard frequently for these alerts.
