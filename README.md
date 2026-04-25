# VE6AO Radio Station Booking System

A full-stack booking system for the Calgary Amateur Radio Association (CARA) to manage radio station time slots.

## Features

- **Real-time Calendar**: View and book 1-hour slots across multiple radio stations.
- **User Authentication**: Secure login and registration for club members.
- **Admin Panel**: Manage users, roles, and station operational status.
- **Email Notifications**: Automated welcome, confirmation, and cancellation emails.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Dark/Light Mode**: Theme support for different lighting conditions.

## Production Setup

To run this application in a production environment, follow these steps:

### 1. Prerequisites

- Node.js (v18 or higher recommended)
- npm (installed with Node.js)

### 2. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (refer to `.env.example` for required fields):

```env
JWT_SECRET=your_secure_random_string
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@ve6ao.radio
```

*Note: If SMTP is not configured, email notifications will be logged to the server console instead of being sent.*

### 4. Build the Application

Compile the frontend assets for production:

```bash
npm run build
```

This will generate a `dist/` folder containing the optimized frontend code.

### 5. Start the Production Server

Run the server using the production start script:

```bash
npm start
```

The application will be accessible at `http://localhost:3000`.


## Process Management with PM2

For production environments, it is recommended to use a process manager like [PM2](https://pm2.keymetrics.io/).

### 1. Install PM2
If you haven't already, install PM2 globally:
```bash
npm install -g pm2
```

### 2. Start the Application
To start the application correctly with PM2 (using our build script):
```bash
pm2 start npm --name "ve6ao-booking" -- start
```

Alternatively, to start the TypeScript server directly:
```bash
pm2 start "npx tsx server.ts" --name "ve6ao-booking"
```

### 3. Manage the Process
- **View Status**: `pm2 status`
- **View Logs**: `pm2 logs ve6ao-booking`
- **Restart (after server.ts changes)**: `pm2 delete ve6ao-booking && pm2 start npm --name "ve6ao-booking" -- start`
- **Stop**: `pm2 stop ve6ao-booking`
- **Delete**: `pm2 delete ve6ao-booking`


## Development Mode

To run the application with hot-reloading for development:

```bash
npm run dev
```

## Maintenance & Rebuilding

If you make changes to the frontend code and need to refresh the production build, or if you encounter issues, follow these maintenance commands:

### Rebuilding for Production
After updating the source code, you must rebuild the frontend assets for them to take effect on the production server:
```bash
# 1. (Optional) Clean old build artifacts
npm run clean

# 2. Recompile the frontend
npm run build

# 3. Restart the server process
# If using npm start:
npm start
# If using PM2:
pm2 restart ve6ao-booking
```

### Common Commands
- `npm run dev`: Starts the application in development mode with HMR.
- `npm run build`: Compiles the React frontend into the `dist/` directory.
- `npm run clean`: Deletes the `dist/` directory (useful if the build seems stale).
- `npm run lint`: Checks the codebase for TypeScript errors.
- `npm start`: Starts the production server (ensure `npm run build` has been run first).

## Admin Setup

The **first user** to register on a fresh installation will automatically be granted the **Admin** role. Subsequent users will be registered with the **User** role by default. Admins can promote other users via the Admin Panel.

## Data Persistence

Application data (bookings, users, and station status) is stored in JSON files within the `data/` directory. Ensure this directory has write permissions in your production environment.
