# VE6AO Station Booking - User Guide

Welcome to the **VE6AO Station Booking & Monitoring System**. This platform allows members of the Calgary Amateur Radio Association (CARA) to reserve radio stations, monitor environmental conditions, and check station health in real-time.

---

## 1. Getting Started

### Account Registration
1. Visit the application URL.
2. Click **Login** in the top right corner.
3. Select **"Don't have an account? Register"**.
4. Fill in your details:
   - **Callsign**: Your official amateur radio callsign (e.g., VE6ABC).
   - **Full Name**: Your first and last name.
   - **Email**: Used for booking confirmations.
   - **License Class**: (Basic, Basic+, Morse, Advanced).
   - **Password**: Secure password for web access.
   - **Kiosk PIN**: A **4-digit numerical code** used for in-person check-ins at the station.

### Logging In
Use your **Callsign** and **Password** to log into the web dashboard. Once logged in, you can manage your profile, view upcoming bookings, and make new reservations.

---

## 2. The Dashboard

The dashboard provides a high-level view of the station's status:
- **Solar Conditions**: Real-time propagation data (SFI, SN, A-Index, K-Index) fetched directly from HamQSL.
- **Station Status**: A list of all stations (North, South, East, West, Flex, Basic+). 
  - **Blue Pulsing Dot**: Station is currently online (heartbeat detected).
  - **Gray Dot**: Station is offline.
  - **Status Labels**: Operational, Maintenance, or In Use.
- **Current Activity**: See who is currently checked in at which station via the Kiosk.

---

## 3. Booking a Station

### Making a Reservation
1. Navigate to the **Calendar** view.
2. Select a **Station** from the dropdown menu.
3. Click on an available time slot in the calendar.
4. Review the details (Station, Time, Date) and click **Confirm Booking**.
5. You will receive a confirmation email with the booking details.

### Recurring Bookings
If you have a weekly net or schedule:
1. Open the booking modal.
2. Check the **"Is this a recurring weekly booking?"** box.
3. Select the number of weeks to repeat (up to 12 weeks).
4. The system will automatically check for conflicts across all selected dates before confirming.

### Managing Bookings
- **Export to Calendar**: Click the "Add to Calendar" button on any of your bookings to download an `.ics` file compatible with Google, Outlook, and Apple calendars.
- **Cancellations**: You can cancel your own bookings at any time from your profile or the main calendar. A cancellation email will be sent automatically.

---

## 4. Kiosk Mode (In-Person Usage)

When you arrive at the radio room:
1. Use the **Check In/Out** screen (usually displayed on the tablet in the shack).
2. Enter your **4-digit Kiosk PIN**.
3. Select the station you are using.
4. **Check Out**: When finished, enter your PIN again and click **Check Out** to free up the station for the next user.

*Note: The Kiosk keeps a live log of who is currently on-site, which is visible to other members on the dashboard.*

---

## 5. Reporting Issues

If you encounter equipment failure or maintenance needs:
1. Click the **Report Issue** card on the dashboard.
2. Select the affected **Station**.
3. Choose the **Severity** (Low, Medium, High).
4. Describe the problem in detail.
5. **High Severity** reports will automatically switch the station to "Maintenance" mode and alert the Station Team via email.

---

## 6. Admin Features (Admins Only)

If you are a club administrator, you have access to additional tools:
- **User Management**: View all members, change roles (User to Admin), or remove accounts.
- **Station Management**: Manually toggle station status (Operational/Maintenance).
- **Global Logs**: View the complete history of in-person Kiosk check-ins.
- **Booking Overrides**: Edit or delete any booking on the calendar.

---

## Support
For technical issues or password resets, please contact the Station Team at [stationteam@caraham.org](mailto:stationteam@caraham.org).
