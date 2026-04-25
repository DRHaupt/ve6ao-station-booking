import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import cors from 'cors';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const STATIONS_FILE = path.join(DATA_DIR, 'stations.json');
const KIOSK_LOGS_FILE = path.join(DATA_DIR, 'kiosk_logs.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const PINGS_FILE = path.join(DATA_DIR, 'pings.json');

console.log('Data directory:', DATA_DIR);
console.log('Bookings file path:', BOOKINGS_FILE);
const JWT_SECRET = process.env.JWT_SECRET || 've6ao-super-secret-key';

// Email Transporter
// Email Configuration
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const EMAIL_LOGO_URL = PUBLIC_URL 
  ? `${PUBLIC_URL}/api/logo` 
  : 'https://storage.googleapis.com/mcp-user-content/119103260736/f1986427-010c-402f-b79e-71f0c2394851.png';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (to: string, subject: string, text: string, html: string) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('SMTP not configured. Skipping email to:', to);
    console.log('Subject:', subject);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@ve6ao.radio',
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent successfully to:', to);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

const DEFAULT_STATIONS = [
  { id: 'north', name: 'North Station', status: 'operational' },
  { id: 'south', name: 'South Station', status: 'operational' },
  { id: 'east', name: 'East Station', status: 'operational' },
  { id: 'west', name: 'West Station', status: 'operational' },
  { id: 'flex', name: 'Flex Station', status: 'operational' },
  { id: 'basic', name: 'Basic+ Station', status: 'operational' }
];

// Initialize files if they don't exist
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(STATIONS_FILE)) {
  fs.writeFileSync(STATIONS_FILE, JSON.stringify(DEFAULT_STATIONS));
}
if (!fs.existsSync(KIOSK_LOGS_FILE)) {
  fs.writeFileSync(KIOSK_LOGS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(REPORTS_FILE)) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify([]));
}

const readJSON = (file: string) => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    if (!content || content.trim() === '') return [];
    return JSON.parse(content);
  } catch (e) {
    console.error(`Error reading ${file}:`, e);
    return [];
  }
};
const writeJSON = (file: string, data: any) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: '*', // For development, you can restrict this later
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      version: 'v4.1-robust-logo'
    });
  });

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admin only' });
    next();
  };

  // Auth Routes
  app.post('/api/register', async (req, res) => {
    const { callsign, password, name, email, license, pin } = req.body;
    if (!callsign || !password || !name || !email) return res.status(400).json({ error: 'Missing fields' });

    const users = readJSON(USERS_FILE);
    if (users.find((u: any) => u.callsign === callsign.toUpperCase())) {
      return res.status(400).json({ error: 'Callsign already registered' });
    }

    // Check if PIN is already taken
    if (pin && (pin.length !== 4 || !/^\d+$/.test(pin))) {
      return res.status(400).json({ error: 'PIN must be 4 digits' });
    }
    if (pin && users.some((u: any) => u.pin === pin)) {
      return res.status(400).json({ error: 'PIN already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      callsign: callsign.toUpperCase(),
      password: hashedPassword,
      name,
      email,
      license: license || 'Basic',
      pin: pin || '',
      role: users.length === 0 ? 'admin' : 'user' // First user is admin
    };

    users.push(newUser);
    writeJSON(USERS_FILE, users);

        // Welcome Email
    const welcomeHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background-color: #f3f4f6; padding: 30px; text-align: center; border-bottom: 2px solid #3b82f6;">
            <img src="${EMAIL_LOGO_URL}" alt="CARA Logo" style="height: 56px; margin-bottom: 15px;" />
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: bold;">VE6AO Radio Bookings</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">Calgary Amateur Radio Association</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px 0;">Hi <strong>${newUser.name}</strong>,</p>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
              Welcome to the Calgary Amateur Radio Association VE6AO booking system! We're excited to have you join our community of radio enthusiasts.
            </p>
            
            <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #1f2937; font-size: 14px; margin: 0 0 8px 0;"><strong>Your Account Details:</strong></p>
              <p style="color: #374151; font-size: 14px; margin: 0; font-family: 'Courier New', monospace;"><strong>Callsign:</strong> ${newUser.callsign}</p>
              <p style="color: #374151; font-size: 14px; margin: 5px 0 0 0; font-family: 'Courier New', monospace;"><strong>License Class:</strong> ${newUser.license}</p>
            </div>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
              You can now log in and start booking your radio time. Visit our booking system to reserve your preferred time slots and stations.
            </p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 13px; margin: 0 0 15px 0; text-align: center;">
              <strong>Questions or Issues?</strong><br />
              Contact us: <a href="mailto:stationteam@caraham.org" style="color: #3b82f6; text-decoration: none;">stationteam@caraham.org</a>
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              <strong>Please do not reply to this email.</strong> Use the contact email above for support or visit our support system.
            </p>
          </div>
        </div>
      </div>
    `;
    sendEmail(
      newUser.email,
      'Welcome to VE6AO Radio Bookings',
      `Hi ${newUser.name}, welcome to the Calgary Amateur Radio Association VE6AO booking system! Your callsign is ${newUser.callsign}.`,
      welcomeHtml
    );

    const token = jwt.sign({ id: newUser.id, callsign: newUser.callsign, role: newUser.role }, JWT_SECRET);
    res.status(201).json({ token, user: { id: newUser.id, callsign: newUser.callsign, role: newUser.role, name: newUser.name, email: newUser.email, license: newUser.license } });
  });


  app.post('/api/login', async (req, res) => {
    const { callsign, password } = req.body;
    const users = readJSON(USERS_FILE);
    const user = users.find((u: any) => u.callsign === callsign.toUpperCase());

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, callsign: user.callsign, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, callsign: user.callsign, role: user.role, name: user.name, email: user.email, license: user.license, pin: user.pin } });
  });

  app.get('/api/me', authenticate, (req: any, res) => {
    const users = readJSON(USERS_FILE);
    const user = users.find((u: any) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, callsign: user.callsign, role: user.role, name: user.name, email: user.email, license: user.license, pin: user.pin });
  });

  app.put('/api/me/pin', authenticate, (req: any, res) => {
    const { pin } = req.body;
    if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'Invalid PIN format (must be 4 digits)' });
    }

    const users = readJSON(USERS_FILE);
    const userIndex = users.findIndex((u: any) => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    // Check if PIN is already taken
    if (users.some((u: any) => u.pin === pin && u.id !== req.user.id)) {
      return res.status(400).json({ error: 'PIN already in use' });
    }

    users[userIndex].pin = pin;
    writeJSON(USERS_FILE, users);
    res.json({ message: 'PIN updated', pin });
  });

  // Booking Routes
  app.get('/api/bookings', async (req, res) => {
    console.log('GET /api/bookings hit');
    try {
      const content = await fs.promises.readFile(BOOKINGS_FILE, 'utf-8');
      if (!content || content.trim() === '') {
        console.warn('Bookings file is empty, returning empty array');
        return res.json([]);
      }
      const data = JSON.parse(content);
      console.log(`Successfully read ${data.length} bookings from ${BOOKINGS_FILE}`);
      res.json(data);
    } catch (error) {
      console.error('Error reading bookings:', error);
      res.status(500).json({ 
        error: 'Failed to read bookings', 
        details: error instanceof Error ? error.message : String(error),
        path: BOOKINGS_FILE 
      });
    }
  });

  app.post('/api/bookings', authenticate, (req: any, res) => {
    try {
      const { recurring, ...bookingData } = req.body;
      const bookings = readJSON(BOOKINGS_FILE);
      const newBookings = [];
      const recurringId = recurring > 1 ? Date.now().toString() : undefined;

      for (let i = 0; i < (recurring || 1); i++) {
        const startTime = new Date(bookingData.startTime);
        startTime.setDate(startTime.getDate() + (i * 7));
        const startTimeISO = startTime.toISOString();

        // Check for overlap
        const overlap = bookings.find((b: any) => 
          b.station === bookingData.station && 
          b.startTime === startTimeISO
        );

        if (overlap) {
          if (recurring > 1) {
            return res.status(400).json({ error: `Conflict detected on ${startTime.toLocaleDateString()}. Recurring booking aborted.` });
          }
          return res.status(400).json({ error: 'This station is already booked for this time slot.' });
        }

        const booking = {
          ...bookingData,
          startTime: startTimeISO,
          id: (Date.now() + i).toString(),
          userId: req.user.id,
          recurringId,
          createdAt: new Date().toISOString()
        };
        newBookings.push(booking);
      }

      bookings.push(...newBookings);
      writeJSON(BOOKINGS_FILE, bookings);

      // Booking Confirmation Email
      const user = readJSON(USERS_FILE).find((u: any) => u.id === req.user.id);
      if (user) {
        const dateStr = new Date(bookingData.startTime).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Edmonton' });
        const confirmationHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
            <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background-color: #f3f4f6; padding: 30px; text-align: center; border-bottom: 2px solid #10b981;">
                <img src="${EMAIL_LOGO_URL}" alt="CARA Logo" style="height: 56px; margin-bottom: 15px;" />
                <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: bold;">VE6AO Radio Bookings</h1>
                <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">Booking Confirmation</p>
              </div>
              
              <div style="padding: 30px;">
                <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 0 0 20px 0;">
                  <p style="color: #047857; font-size: 15px; margin: 0; font-weight: bold;">✓ Your booking has been confirmed!</p>
                </div>
                
                <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px 0;">Hi <strong>${user.name}</strong>,</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;"><strong>BOOKING DETAILS</strong></p>
                  <table style="width: 100%; color: #1f2937; font-size: 14px;">
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 10px 0;"><strong>Station:</strong></td>
                      <td style="padding: 10px 0; text-align: right;">${bookingData.station}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 10px 0;"><strong>Date & Time:</strong></td>
                      <td style="padding: 10px 0; text-align: right;">${dateStr}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 10px 0;"><strong>Mode:</strong></td>
                      <td style="padding: 10px 0; text-align: right;">${bookingData.mode}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0;"><strong>Callsign:</strong></td>
                      <td style="padding: 10px 0; text-align: right; font-family: 'Courier New', monospace;">${bookingData.callsign}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                  You can now access the VE6AO booking system to export this booking to your calendar or view all your upcoming reservations.
                </p>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #374151; font-size: 13px; margin: 0 0 15px 0; text-align: center;">
                  <strong>Need Help?</strong><br />
                  Contact us: <a href="mailto:stationteam@caraham.org" style="color: #3b82f6; text-decoration: none;">stationteam@caraham.org</a>
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                  <strong>Please do not reply to this email.</strong> Use the contact email above for support.
                </p>
              </div>
            </div>
          </div>
        `;
        sendEmail(
          user.email,
          'Booking Confirmation - VE6AO Radio',
          `Hi ${user.name}, your booking for ${bookingData.station} at ${dateStr} has been confirmed.`,
          confirmationHtml
        );
      }

      res.status(201).json(newBookings[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save booking' });
    }
  });

  app.delete('/api/bookings/:id', authenticate, (req: any, res) => {
    try {
      const bookings = readJSON(BOOKINGS_FILE);
      const bookingIndex = bookings.findIndex((b: any) => b.id === req.params.id);
      
      if (bookingIndex === -1) return res.status(404).json({ error: 'Booking not found' });
      
      const booking = bookings[bookingIndex];
      if (booking.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      bookings.splice(bookingIndex, 1);
      writeJSON(BOOKINGS_FILE, bookings);

       // Cancellation Email
      const user = readJSON(USERS_FILE).find((u: any) => u.id === booking.userId);
      if (user) {
        const dateStr = new Date(booking.startTime).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Edmonton' });
        const cancellationHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
            <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background-color: #f3f4f6; padding: 30px; text-align: center; border-bottom: 2px solid #ef4444;">
                <img src="${EMAIL_LOGO_URL}" alt="CARA Logo" style="height: 56px; margin-bottom: 15px;" />
                <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: bold;">VE6AO Radio Bookings</h1>
                <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">Booking Cancelled</p>
              </div>
              
              <div style="padding: 30px;">
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 0 0 20px 0;">
                  <p style="color: #991b1b; font-size: 15px; margin: 0; font-weight: bold;">Your booking has been cancelled</p>
                </div>
                
                <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px 0;">Hi <strong>${user.name}</strong>,</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;"><strong>BOOKING DETAILS</strong></p>
                  <table style="width: 100%; color: #1f2937; font-size: 14px;">
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 10px 0;"><strong>Station:</strong></td>
                      <td style="padding: 10px 0; text-align: right;">${booking.station}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 10px 0;"><strong>Date & Time:</strong></td>
                      <td style="padding: 10px 0; text-align: right;">${dateStr}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0;"><strong>Callsign:</strong></td>
                      <td style="padding: 10px 0; text-align: right; font-family: 'Courier New', monospace;">${booking.callsign}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                  If you would like to rebook this time slot or if this cancellation was made in error, please log back into the booking system.
                </p>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #374151; font-size: 13px; margin: 0 0 15px 0; text-align: center;">
                  <strong>Questions or Issues?</strong><br />
                  Contact us: <a href="mailto:stationteam@caraham.org" style="color: #3b82f6; text-decoration: none;">stationteam@caraham.org</a>
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                  <strong>Please do not reply to this email.</strong> Use the contact email above for support.
                </p>
              </div>
            </div>
          </div>
        `;
        sendEmail(
          user.email,
          'Booking Cancelled - VE6AO Radio',
          `Hi ${user.name}, your booking for ${booking.station} at ${dateStr} has been cancelled.`,
          cancellationHtml
        );
      }
      res.json({ message: 'Booking cancelled' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to cancel booking' });
    }
  });

  // Admin: Edit any booking
  app.put('/api/bookings/:id', authenticate, isAdmin, (req, res) => {
    try {
      const bookings = readJSON(BOOKINGS_FILE);
      const bookingIndex = bookings.findIndex((b: any) => b.id === req.params.id);
      if (bookingIndex === -1) return res.status(404).json({ error: 'Booking not found' });

      bookings[bookingIndex] = { ...bookings[bookingIndex], ...req.body };
      writeJSON(BOOKINGS_FILE, bookings);
      res.json(bookings[bookingIndex]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Admin: User Management
  app.get('/api/users', authenticate, isAdmin, (req, res) => {
    const users = readJSON(USERS_FILE).map((u: any) => {
      const { password, pin, ...rest } = u;
      return rest;
    });
    res.json(users);
  });

  app.put('/api/users/:id/role', authenticate, isAdmin, (req, res) => {
    const { role } = req.body;
    const users = readJSON(USERS_FILE);
    const userIndex = users.findIndex((u: any) => u.id === req.params.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    users[userIndex].role = role;
    writeJSON(USERS_FILE, users);
    res.json({ message: 'Role updated' });
  });

  app.delete('/api/users/:id', authenticate, isAdmin, (req: any, res) => {
    const users = readJSON(USERS_FILE);
    const userIndex = users.findIndex((u: any) => u.id === req.params.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Also delete their bookings
    const bookings = readJSON(BOOKINGS_FILE);
    const filteredBookings = bookings.filter((b: any) => b.userId !== req.params.id);
    writeJSON(BOOKINGS_FILE, filteredBookings);

    users.splice(userIndex, 1);
    writeJSON(USERS_FILE, users);
    res.json({ message: 'User deleted' });
  });

  // Helper to get pings
  const getPings = async (): Promise<Record<string, string>> => {
    try {
      if (!fs.existsSync(PINGS_FILE)) return {};
      const content = await fs.promises.readFile(PINGS_FILE, 'utf-8');
      return (!content || content.trim() === '') ? {} : JSON.parse(content);
    } catch {
      return {};
    }
  };

  const savePing = async (stationId: string) => {
    const pings = await getPings();
    pings[stationId] = new Date().toISOString();
    await fs.promises.writeFile(PINGS_FILE, JSON.stringify(pings, null, 2));
  };

  // Station Routes
  app.get('/api/stations', async (req, res) => {
    try {
      const stationsContent = await fs.promises.readFile(STATIONS_FILE, 'utf-8');
      const bookingsContent = await fs.promises.readFile(BOOKINGS_FILE, 'utf-8');
      const pings = await getPings();
      
      const stations = (!stationsContent || stationsContent.trim() === '') ? DEFAULT_STATIONS : JSON.parse(stationsContent);
      const bookings = (!bookingsContent || bookingsContent.trim() === '') ? [] : JSON.parse(bookingsContent);
      
      const now = new Date().toISOString();
      const currentHour = new Date().getHours();
      const todayStr = new Date().toISOString().split('T')[0];

      const stationsWithAvailability = stations.map((s: any) => {
        // Find if there's a booking for this station right now
        const isBooked = bookings.some((b: any) => {
          const bDate = b.startTime.split('T')[0];
          const bHour = new Date(b.startTime).getHours();
          return b.station === s.name && bDate === todayStr && bHour === currentHour;
        });

        return {
          ...s,
          isBooked: s.status === 'operational' ? isBooked : false,
          lastSeen: pings[s.id] || null
        };
      });

      res.json(stationsWithAvailability);
    } catch (error) {
      console.error('Error fetching stations:', error);
      res.status(500).json({ error: 'Failed to fetch stations', details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/stations/:id/heartbeat', async (req, res) => {
    const { id } = req.params;
    const stationsContent = await fs.promises.readFile(STATIONS_FILE, 'utf-8').catch(() => '[]');
    const stations = JSON.parse(stationsContent);
    
    if (!stations.some((s: any) => s.id === id)) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    await savePing(id);
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.put('/api/stations/:id', authenticate, isAdmin, (req, res) => {
    try {
      const { status } = req.body;
      const stations = readJSON(STATIONS_FILE);
      const index = stations.findIndex((s: any) => s.id === req.params.id);
      
      if (index === -1) return res.status(404).json({ error: 'Station not found' });
      
      stations[index].status = status;
      writeJSON(STATIONS_FILE, stations);
      res.json(stations[index]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update station' });
    }
  });

  // Health Reports
  app.post('/api/stations/:id/report', authenticate, async (req: any, res) => {
    try {
      const { severity, description } = req.body;
      const stationId = req.params.id;
      
      const stations = readJSON(STATIONS_FILE);
      const station = stations.find((s: any) => s.id === stationId);
      if (!station) return res.status(404).json({ error: 'Station not found' });

      const report = {
        id: Date.now().toString(),
        stationId,
        userId: req.user.id,
        userName: req.user.callsign,
        severity,
        description,
        timestamp: new Date().toISOString()
      };

      const reports = readJSON(REPORTS_FILE);
      reports.push(report);
      writeJSON(REPORTS_FILE, reports);

      // If high severity, potentially update station status automatically
      if (severity === 'high') {
        const stationIndex = stations.findIndex((s: any) => s.id === stationId);
        stations[stationIndex].status = 'maintenance';
        writeJSON(STATIONS_FILE, stations);
      }

      // Notify Station Team via Email for High/Medium issues
      if (severity === 'high' || severity === 'medium') {
        const adminHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e11d48; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #e11d48; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0;">Equipment Health Alert</h2>
            </div>
            <div style="padding: 20px; background-color: #fff1f2;">
              <p><strong>Station:</strong> ${station.name}</p>
              <p><strong>Severity:</strong> <span style="color: #e11d48; font-weight: bold; text-transform: uppercase;">${severity}</span></p>
              <p><strong>Reported By:</strong> ${req.user.callsign}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <div style="background-color: white; padding: 15px; border-radius: 4px; border: 1px solid #fda4af; margin-top: 20px;">
                <p style="margin: 0; color: #4c0519;"><strong>Issue Details:</strong></p>
                <p style="margin: 10px 0 0 0; line-height: 1.5;">${description}</p>
              </div>
            </div>
          </div>
        `;
        
        // Find admins to notify
        const users = readJSON(USERS_FILE);
        const admins = users.filter((u: any) => u.role === 'admin');
        
        for (const admin of admins) {
          sendEmail(
            admin.email,
            `Health Alert: ${station.name} (${severity.toUpperCase()})`,
            `User ${req.user.callsign} reported a ${severity} issue with ${station.name}: ${description}`,
            adminHtml
          );
        }
      }

      res.status(201).json(report);
    } catch (error) {
      console.error('Error saving health report:', error);
      res.status(500).json({ error: 'Failed to save health report' });
    }
  });

  // Solar Data Proxy
  app.get('/api/solar', (req, res) => {
    https.get('https://www.hamqsl.com/solarxml.php', (response) => {
      res.setHeader('Content-Type', 'application/xml');
      response.pipe(res);
    }).on('error', (err) => {
      console.error('Error fetching solar data:', err);
      res.status(500).json({ error: 'Failed to fetch solar data' });
    });
  });

  app.get('/api/kiosk/active', async (req, res) => {
    try {
      const logsContent = await fs.promises.readFile(KIOSK_LOGS_FILE, 'utf-8').catch(() => '[]');
      const usersContent = await fs.promises.readFile(USERS_FILE, 'utf-8').catch(() => '[]');
      
      const logs = (!logsContent || logsContent.trim() === '') ? [] : JSON.parse(logsContent);
      const users = (!usersContent || usersContent.trim() === '') ? [] : JSON.parse(usersContent);
       
      const activeLogs = logs
        .filter((l: any) => !l.endTime)
        .map((l: any) => {
          const user = users.find((u: any) => u.id === l.userId);
          return {
            ...l,
            userName: user ? user.name : 'Unknown',
            callsign: user ? user.callsign : 'N/A'
          };
        });
      
      res.json(activeLogs);
    } catch (error) {
      console.error('Error fetching active logs:', error);
      res.status(500).json({ error: 'Failed to fetch active logs', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Kiosk Routes
  app.post('/api/kiosk/login', async (req, res) => {
    try {
      const { pin } = req.body;
      const usersContent = await fs.promises.readFile(USERS_FILE, 'utf-8').catch(() => '[]');
      const users = (!usersContent || usersContent.trim() === '') ? [] : JSON.parse(usersContent);
      
      const user = users.find((u: any) => u.pin === pin);

      if (!user) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }

      const bookingsContent = await fs.promises.readFile(BOOKINGS_FILE, 'utf-8').catch(() => '[]');
      const bookings = (!bookingsContent || bookingsContent.trim() === '') ? [] : JSON.parse(bookingsContent);
      
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];

      // Find current or upcoming booking (within 30 mins)
      const upcomingBooking = bookings.find((b: any) => {
        if (b.userId !== user.id) return false;
        const bStart = new Date(b.startTime);
        const diffMs = bStart.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);
        
        // Either currently in the booking hour, or starts within 30 mins
        const isCurrentHour = bStart.getFullYear() === now.getFullYear() &&
                             bStart.getMonth() === now.getMonth() &&
                             bStart.getDate() === now.getDate() &&
                             bStart.getHours() === now.getHours();
                             
        return isCurrentHour || (diffMins > 0 && diffMins <= 30);
      });

      // Check if already checked in
      const logsContent = await fs.promises.readFile(KIOSK_LOGS_FILE, 'utf-8').catch(() => '[]');
      const logs = (!logsContent || logsContent.trim() === '') ? [] : JSON.parse(logsContent);
      const activeLog = logs.find((l: any) => l.userId === user.id && !l.endTime);

      res.json({ 
        user: { id: user.id, callsign: user.callsign, name: user.name },
        currentBooking: upcomingBooking,
        activeLog
      });
    } catch (error) {
      console.error('Error in kiosk login:', error);
      res.status(500).json({ error: 'Internal server error during kiosk login' });
    }
  });

  app.post('/api/kiosk/check-in', (req, res) => {
    const { userId, station } = req.body;
    const logs = readJSON(KIOSK_LOGS_FILE);
    
    // Check if user already has an active session
    if (logs.some((l: any) => l.userId === userId && !l.endTime)) {
      return res.status(400).json({ error: 'User already checked in' });
    }

    // Check if station is already in use
    if (logs.some((l: any) => l.station === station && !l.endTime)) {
      return res.status(400).json({ error: 'Station already in use' });
    }
    
    const newLog = {
      id: Date.now().toString(),
      userId,
      station,
      startTime: new Date().toISOString(),
      endTime: null
    };

    logs.push(newLog);
    writeJSON(KIOSK_LOGS_FILE, logs);
    res.status(201).json(newLog);
  });

  app.post('/api/kiosk/check-out', (req, res) => {
    const { userId } = req.body;
    const logs = readJSON(KIOSK_LOGS_FILE);
    const logIndex = logs.findIndex((l: any) => l.userId === userId && !l.endTime);

    if (logIndex === -1) return res.status(404).json({ error: 'No active session found' });

    logs[logIndex].endTime = new Date().toISOString();
    writeJSON(KIOSK_LOGS_FILE, logs);
    res.json(logs[logIndex]);
  });

  app.get('/api/kiosk/logs', authenticate, isAdmin, async (req, res) => {
    try {
      const logsContent = await fs.promises.readFile(KIOSK_LOGS_FILE, 'utf-8').catch(() => '[]');
      const usersContent = await fs.promises.readFile(USERS_FILE, 'utf-8').catch(() => '[]');
      
      const logs = (!logsContent || logsContent.trim() === '') ? [] : JSON.parse(logsContent);
      const users = (!usersContent || usersContent.trim() === '') ? [] : JSON.parse(usersContent);
      
      const logsWithUsers = logs.map((l: any) => {
        const user = users.find((u: any) => u.id === l.userId);
        return {
          ...l,
          userName: user ? user.name : 'Unknown',
          callsign: user ? user.callsign : 'N/A'
        };
      });
      
      res.json(logsWithUsers);
    } catch (error) {
      console.error('Error fetching kiosk logs:', error);
      res.status(500).json({ error: 'Failed to fetch kiosk logs', details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put('/api/users/:id/pin', authenticate, isAdmin, (req, res) => {
    const { pin } = req.body;
    if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'Invalid PIN format (must be 4 digits)' });
    }
    const users = readJSON(USERS_FILE);
    const userIndex = users.findIndex((u: any) => u.id === req.params.id);
    
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    
    // Check if PIN is already taken
    if (users.some((u: any) => u.pin === pin && u.id !== req.params.id)) {
      return res.status(400).json({ error: 'PIN already in use' });
    }

    users[userIndex].pin = pin;
    writeJSON(USERS_FILE, users);
    res.json({ message: 'PIN updated' });
  });

  // Logo Proxy to serve the logo from the server or fallback
  app.get('/api/logo', (req, res) => {
    const customLogoPath = '/var/www/stationbooking/stationbooking/CARA_Logo_Blankx50.webp';
    
    // 1. Try local custom logo first (this is the user's preference)
    try {
      if (fs.existsSync(customLogoPath)) {
        return res.sendFile(path.resolve(customLogoPath));
      }
    } catch (err) {
      console.error('Error checking custom logo path:', err);
    }

    // 2. Fallback to remote URLs if local file is missing
    const fallbacks = [
      'https://placehold.co/240x80/3b82f6/white?text=CARA+RADIO',
      'https://storage.googleapis.com/mcp-user-content/119103260736/f1986427-010c-402f-b79e-71f0c2394851.png'
    ];

    const tryFetchFallback = (index: number) => {
      if (index >= fallbacks.length) {
        return res.status(404).json({ 
          status: 'error_v4',
          error: 'Logo not found', 
          message: 'Both local file and fallback URLs are failing. Please check if the file path is correct on your server hardware.' 
        });
      }

      const url = fallbacks[index];
      const options = {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
      };

      https.get(url, options, (response) => {
        if (response.statusCode === 200) {
          const contentType = response.headers['content-type'];
          if (contentType) res.setHeader('Content-Type', contentType);
          response.pipe(res);
        } else {
          console.error(`Fallback logo ${index} failed with status: ${response.statusCode}`);
          tryFetchFallback(index + 1);
        }
      }).on('error', (err) => {
        console.error(`Error fetching fallback logo ${index}:`, err);
        tryFetchFallback(index + 1);
      });
    };

    tryFetchFallback(0);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
