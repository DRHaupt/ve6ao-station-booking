# Mobile, PWA & Capacitor

The VE6AO Booking app is built to work perfectly on desktops, mobile browsers, and as a native Android app.

## Progressive Web App (PWA)

A PWA allows users to "install" the website to their home screen without going to an app store.

### Key Files:
-   `manifest.json`: Defines the name, theme color (`#ef4444`), and the CARA logo icon.
-   `sw.js` (Service Worker): Caches the main page and icons so the app can load even if the user has a poor cellular connection.
-   `index.html`: Contains the logic to register the service worker when the page loads.

---

## Native Android App (Capacitor)

We use **Capacitor** by Ionic to wrap our React website into a real Android installation package (`.apk`).

### Configuration
The app detects where it is running using this logic in `App.tsx`:
```javascript
const isNative = window.location.protocol === 'capacitor:';
const API_BASE_URL = isNative ? 'https://booking.ve6ao.ca' : '';
```
When running as a mobile app, it skips using "local" relative paths and points all data requests to the external server URL.

### Building the Mobile App:
To update the mobile code after making web changes:
1.  **Build Web**: `npm run build`
2.  **Sync to Android**: `npx cap sync`
3.  **Open Android Studio**: `npx cap open android`
4.  **Generate APK**: In Android Studio, go to `Build > Build Bundle(s) / APK(s) > Build APK`.

---

## Cross-Origin Resource Sharing (CORS)

Mobile apps do not follow the same security rules as web browsers. Specifically, an Android app is considered a different "origin" (`capacitor://localhost`).

In `server.ts`, we have enabled CORS to allow requests from the app:
```typescript
app.use(cors({
  origin: '*', // Allows the mobile app to talk to the server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Logos and Assets

Because the mobile app is a local file on the phone, it cannot find `/api/logo` unless we provide the full URL. All images in the app are dynamically prefixed with the `API_BASE_URL` to ensure they load correctly regardless of where the app is installed.
