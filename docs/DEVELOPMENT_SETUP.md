# Setup & Deployment

If you want to run and deploy it to a new server, follow these instructions.

## Local Development Setup

### 1. Requirements
-   **Node.js**: Version 18 or higher.
-   **NPM**: Installed with Node.js.
-   **Python 3**: For running or testing the station agents.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/DRHaupt/ve6ao-station-booking
cd ve6ao-station-booking

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory. You can use `.env.example` as a template.
```env
JWT_SECRET=your_super_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
PUBLIC_URL=https://your-domain.com
```

### 4. Running the App
```bash
# Start the backend and frontend together
npm run dev
```
The app will be available at `http://localhost:3000`.

---

## Production Deployment

### Option A: Standard VPS (Ubuntu/Debian)
1.  Install Node.js and PM2: `npm install -g pm2`.
2.  Copy the project folder to `/var/www/stationbooking`.
3.  Run the build command: `npm run build`.
4.  Start the server with PM2 to keep it running 24/7:
    ```bash
    pm2 start server.ts --interpreter tsx --name station-booking
    ```

### Option B: Cloud Run / Containers
The app is compatible with containerized environments.
1.  Build the image using the provided `Dockerfile`.
2.  Deploy to Google Cloud Run or AWS Fargate.
3.  Ensure your `/data` folder is mounted as a **Persistent Volume**. If using a stateless environment (like basic Cloud Run), the JSON files will be lost on restart unless you use a bucket or database service.

---

## Email Configuration (SMTP)

We use `nodemailer` to send booking confirmations.
-   For **Gmail**: You must use an "App Password" (2FA must be enabled).
-   The email settings are managed in your environment variables.
-   The system uses the `PUBLIC_URL` variable to generate links and load logos inside the emails.
