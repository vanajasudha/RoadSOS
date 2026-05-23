<div align="center">

# RoadSOS

### *Every second counts. We give you those seconds back.*

[![React Native](https://img.shields.io/badge/React%20Native-0.85.3-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactnative.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express%204-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Android](https://img.shields.io/badge/Android-API%2024+-3DDC84?style=flat-square&logo=android&logoColor=white)](https://developer.android.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**An autonomous crash detection and emergency dispatch platform for Indian roads.**

[Problem](#the-problem) · [Solution](#the-solution) · [Features](#features) · [How It Works](#how-it-works) · [Architecture](#architecture) · [Setup](#setup) · [API](#api-reference) · [Roadmap](#roadmap)

---

</div>

## The Problem

> **1 road accident every minute. 1 death every 4 minutes.** *(MoRTH 2023)*

India records **4.6 lakh road accidents annually** — killing 1.68 lakh people. The deadliest variable isn't speed or road condition. It's **response time**.

The critical survival window is the **first 15 minutes**. But most victims can't call for help — they're unconscious, in shock, or their phone is out of reach. Bystanders freeze. Precious minutes vanish.

Existing emergency apps require the victim to be conscious and coherent enough to open an app and make a call. That's exactly the moment they can't.

---

## The Solution

RoadSOS is a **zero-friction emergency response platform** that detects crashes *before you can react* and dispatches help *without requiring you to do anything*.

- **Crash happens** → Accelerometer detects the impact (≥3G)
- **15-second countdown** → You can cancel if you're okay
- **No response** → GPS coordinates, hospital selection, and SMS alerts fire automatically
- **Help dispatched** → Hospital + all your emergency contacts notified instantly
- **You track** → Live ambulance ETA on screen

The entire sequence from crash to dispatch takes **under 30 seconds** and requires **zero user interaction** if you're incapacitated.

---

## Features

### Emergency Core
| Feature | What it does |
|---|---|
| **Auto Crash Detection** | Accelerometer streams at 100ms; impact ≥ 28 m/s² (≈ 3G) triggers the alert pipeline |
| **15-Second Countdown** | Conscious users cancel; unconscious users get help automatically |
| **One-Tap SOS** | Manual SOS → hospital selection → GPS dispatch in under 5 seconds |
| **GPS Hospital Dispatch** | Fetches nearest hospitals live via Overpass API; user picks one, backend SMS-notifies it |
| **SMS to Contacts** | Every registered emergency contact gets an automated SMS on every alert |
| **Live ETA Tracker** | Animated real-time view showing ambulance inbound with countdown |

### Safety Toolkit
| Feature | What it does |
|---|---|
| **Nearby Services** | Live map of hospitals, police stations, towing services around your GPS position |
| **Emergency Quick-Dial** | One-tap calling to 100, 101, 108, 112, and 1033 |
| **Medical QR Code** | Scannable card with blood group, allergies, medications — for first responders when you can't speak |
| **Emergency Contacts** | Up to 5 contacts stored and auto-notified on every SOS |
| **Alert History** | Full timeline of every SOS and crash event |

### Resilience
| Feature | What it does |
|---|---|
| **Offline-First Pipeline** | Alert queued to AsyncStorage when offline; auto-synced the moment connectivity returns |
| **Drive Mode** | Simulate crash scenarios to test your entire emergency setup before you need it |
| **OTP Authentication** | Passwordless login via MSG91 SMS — no friction at onboarding |

---

## How It Works

### Crash Detection Pipeline

```
Accelerometer (100ms polling)
        │
        ▼
magnitude = √(x² + y² + z²)
        │
        ├── < 28 m/s²  → normal, keep polling
        │
        └── ≥ 28 m/s²  AND  cooldown > 10s
                │
                ▼
        CountdownScreen (15 seconds)
                │
                ├── User cancels → back to HomeScreen
                │
                └── Timer expires (no input)
                        │
                        ▼
                 Auto-dispatch alert
                 (last cached GPS coords)
```

### Emergency SOS Flow

```
User taps SOS / Auto-dispatch fires
        │
        ▼
Acquire GPS coordinates
        │
        ▼
Fetch nearby hospitals  ──── Overpass API ────►  OpenStreetMap data
        │
        ▼
SelectHospitalScreen  (user picks hospital)
        │
        ▼
POST /api/alerts  ──── HTTP ────► Node.js Backend
                                        │
                              ┌─────────┴──────────┐
                              ▼                     ▼
                    SMS to Hospital          SMS to all contacts
                    (MSG91 API)              (MSG91 API)
                              │
                              ▼
                    Alert saved to MongoDB
                              │
                              ▼
                    Response → AlertSentScreen → HelpOnWayScreen
```

### Offline-First Sync

```
Alert triggered offline
        │
        ▼
Save to AsyncStorage queue
        │
Network restored  ←── NetworkContext polls every 30s
        │
        ▼
POST /api/alerts/bulk-sync  →  Backend processes queue
        │
        ▼
Remove synced IDs from AsyncStorage
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RoadSOS Mobile (Android)                    │
│                                                                     │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │  Auth Layer   │  │   Navigation   │  │    Sensor Engine       │  │
│  │               │  │                │  │                        │  │
│  │  OTP via      │  │  React Nav 7   │  │  react-native-sensors  │  │
│  │  MSG91 + JWT  │  │  Native Stack  │  │  RxJS stream @ 100ms   │  │
│  │  AsyncStorage │  │  + Bottom Tabs │  │  √(x²+y²+z²) ≥ 28     │  │
│  └───────┬───────┘  └───────┬────────┘  └──────────┬─────────────┘  │
│          └──────────────────┼─────────────────────-┘               │
│                     ┌───────▼────────┐                              │
│                     │  App Contexts  │                              │
│                     │                │                              │
│                     │  AuthContext   │  ← JWT + user state          │
│                     │  NetworkContext│  ← online/offline + sync     │
│                     └───────┬────────┘                              │
│                     ┌───────▼────────┐                              │
│                     │    Services    │                              │
│                     │                │                              │
│                     │  api.js        │  ← Axios + JWT interceptor   │
│                     │  connectivity  │  ← two-tier health check     │
│                     │  offlineStorage│  ← AsyncStorage queue        │
│                     └───────┬────────┘                              │
└─────────────────────────────┼───────────────────────────────────────┘
                              │  HTTP REST (JWT Bearer)
              ┌───────────────▼──────────────────────┐
              │           Node.js Backend              │
              │                                        │
              │  Express 4 · Mongoose 8 · JWT          │
              │  5 controllers · 5 route groups        │
              │  MSG91 SMS service + console fallback  │
              └───────────────┬──────────────────────┘
                              │
              ┌───────────────▼──────────────────────┐
              │         External Services              │
              │                                        │
              │  MongoDB Atlas  (cloud database)       │
              │  MSG91 API v2   (SMS dispatch)         │
              │  Overpass API   (hospital lookup)      │
              └──────────────────────────────────────┘
```

---

## Tech Stack

### Mobile — React Native Android

| Layer | Technology | Why |
|---|---|---|
| Framework | React Native 0.85.3 · React 19.2.3 | Cross-platform base, mature ecosystem |
| JS Engine | Hermes (AOT compiled) | Faster startup, lower memory on mid-range Android |
| Navigation | React Navigation 7 (Native Stack + Bottom Tabs) | Native-feel transitions, deep linking ready |
| HTTP | Axios 1.16 with JWT interceptor | Automatic token injection on every request |
| Local Storage | AsyncStorage 3.0.2 | Offline alert queue + token persistence |
| GPS | react-native-geolocation-service 5.3.1 | High-accuracy foreground positioning |
| Accelerometer | react-native-sensors 7.3.6 | RxJS observable stream for crash detection |
| Network State | @react-native-community/netinfo 12.0.1 | Real-time connectivity detection |
| QR Code | react-native-qrcode-svg 6.3.21 | Medical profile QR generation |

### Backend — Node.js

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js + Express 4.19 | Fast, lightweight, familiar |
| Database | MongoDB Atlas + Mongoose 8 | Schema flexibility for evolving alert data |
| Auth | jsonwebtoken 9 + MSG91 OTP | Passwordless; no password breach risk |
| SMS | MSG91 API v2 | India-optimized gateway, transactional DLT-compliant |
| CORS | cors 2.8.5 | Mobile-to-backend cross-origin handling |

---

## Project Structure

```
RoadSOS/
│
├── backend/
│   ├── controllers/
│   │   ├── authController.js        # OTP send/verify, JWT generation
│   │   ├── alertsController.js      # SOS dispatch + MSG91 + contact SMS
│   │   ├── contactsController.js    # Emergency contact CRUD
│   │   ├── medicalProfileController.js  # Medical QR data
│   │   └── nearbyController.js      # Overpass API proxy
│   ├── models/
│   │   ├── User.js                  # Phone, name, OTP, location
│   │   ├── AccidentAlert.js         # Alert + dispatch tracking
│   │   ├── EmergencyContact.js      # Contact name, phone, relationship
│   │   └── MedicalProfile.js        # Blood group, allergies, medications
│   ├── routes/                      # Route mounting (auth/alerts/contacts/nearby/medical)
│   ├── middleware/
│   │   └── auth.js                  # JWT verification middleware
│   ├── services/
│   │   └── smsService.js            # MSG91 integration + console fallback
│   ├── server.js                    # Express app, MongoDB connect, route mount
│   └── .env                         # Secrets (NEVER commit real credentials)
│
└── RoadSOSMobile/
    ├── src/
    │   ├── screens/                 # 14 screens (see full list below)
    │   ├── components/
    │   │   └── OfflineBanner.js     # Connectivity status bar
    │   ├── context/
    │   │   ├── AuthContext.js       # Auth state, JWT persistence
    │   │   └── NetworkContext.js    # Online/offline + sync trigger
    │   ├── services/
    │   │   ├── api.js               # Axios client + JWT interceptor
    │   │   ├── connectivity.js      # Two-tier: NetInfo + backend health check
    │   │   └── offlineStorage.js    # AsyncStorage helpers for queue
    │   └── theme/
    │       └── colors.js            # Design tokens
    ├── App.js                       # Root: navigation stack + accelerometer setup
    ├── index.js                     # Entry point
    └── android/                     # Native Android project (Gradle)
```

### All 14 Screens

| Screen | Tab/Stack | Purpose |
|---|---|---|
| `LoginScreen` | Auth | Phone number entry (+91) |
| `OTPScreen` | Auth | 6-digit OTP verification; name capture for new users |
| `HomeScreen` | Tab | SOS button, drive mode, connectivity indicator |
| `NearbyServicesScreen` | Tab | Live hospitals, police, towing via GPS |
| `EmergencyNumbersScreen` | Tab | 100, 101, 108, 112, 1033 one-tap dial |
| `AlertHistoryScreen` | Tab | Timeline of all SOS and crash events |
| `OfflineModeScreen` | Tab | Pending queue view + manual sync |
| `ProfileScreen` | Tab | User info, logout |
| `SelectHospitalScreen` | Stack | Hospital picker before dispatch |
| `CountdownScreen` | Stack | 15-second auto-alert countdown with cancel |
| `AlertSentScreen` | Stack | Dispatch confirmation + contact status |
| `HelpOnWayScreen` | Stack | Animated ambulance tracker with ETA |
| `ContactsScreen` | Stack | Add/edit up to 5 emergency contacts |
| `MedicalQRScreen` | Stack | Generate and display medical QR code |

---

## Setup

> Full dev setup takes about 20 minutes if you already have Node.js and Android Studio installed.

### Prerequisites

- **Node.js** >= 18 ([nodejs.org](https://nodejs.org))
- **Java JDK 17** — required by Android Gradle
- **Android Studio** with an emulator (API 33+) configured and running
- `adb` in your `PATH` (comes with Android Studio's platform-tools)
- **React Native environment** — follow the [official Android setup guide](https://reactnative.dev/docs/set-up-your-environment) before proceeding

---

### Step 1 — Clone and install dependencies

```sh
git clone https://github.com/your-org/RoadSOS.git
cd RoadSOS

# Backend
cd backend
npm install

# Mobile
cd ../RoadSOSMobile
npm install
```

---

### Step 2 — Configure the backend

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?appName=Cluster123
JWT_SECRET=your-super-secret-key-change-this-in-prod

# MSG91 — leave blank to use console fallback (no real SMS sent)
MSG91_AUTH_KEY=
MSG91_SENDER_ID=ROADSS
MSG91_ROUTE=4
```

> Free MongoDB Atlas cluster: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

---

### Step 3 — Configure the mobile API URL

Open [RoadSOSMobile/src/services/api.js](RoadSOSMobile/src/services/api.js) and set the correct backend URL:

**Android Emulator** (connects to your host machine via the AVD bridge):
```js
const IS_PROD = false;
// base URL resolves to: http://10.0.2.2:5000
```

**Physical Device** (must be on the same WiFi as your dev machine):
```js
// Set baseURL to your machine's LAN IP:
baseURL: 'http://192.168.X.X:5000'
// Run `ipconfig` on Windows to find your IPv4 address
```

---

### Step 4 — Start three terminals

**Terminal 1 — Backend:**
```sh
cd backend
npm start
# Expected: "Server running on port 5000" + "MongoDB connected"
```

**Terminal 2 — Metro bundler:**
```sh
cd RoadSOSMobile
npx react-native start
# Wait for: "Metro waiting on exp://..."
```

**Terminal 3 — Install on Android:**
```sh
cd RoadSOSMobile/android
.\gradlew installDebug          # Windows
# ./gradlew installDebug        # macOS / Linux

# Or from RoadSOSMobile/:
npx react-native run-android
```

The app launches automatically. All three terminals must stay running during development.

---

### Subsequent sessions (app already installed)

```sh
# Terminal 1
cd backend && npm start

# Terminal 2
cd RoadSOSMobile && npx react-native start
```

Open the app on your emulator. Shake device (or `Ctrl+M`) → **Reload** if the screen is blank.

---

### Build a release APK

```sh
cd RoadSOSMobile/android
.\gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

Requires `roadsos-release.keystore` referenced in `gradle.properties`.

---

## API Reference

All authenticated endpoints require `Authorization: Bearer <token>` (auto-injected by Axios interceptor).

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/` | GET | No | Health check — returns `{ success: true }` |
| `/api/auth/send-otp` | POST | No | Send OTP to phone number via MSG91 |
| `/api/auth/verify-otp` | POST | No | Verify OTP → returns JWT + user object |
| `/api/auth/me` | GET | Yes | Get authenticated user's profile |
| `/api/auth/profile` | PATCH | Yes | Update user display name |
| `/api/alerts` | POST | Yes | Dispatch SOS alert (GPS + hospital + contacts) |
| `/api/alerts` | GET | Yes | Fetch authenticated user's alert history |
| `/api/alerts/:id/resolve` | PATCH | Yes | Mark an alert as resolved |
| `/api/alerts/bulk-sync` | POST | Yes | Sync offline-queued alerts in one batch |
| `/api/nearby` | GET | Yes | Nearby hospitals/police/towing via Overpass |
| `/api/contacts` | GET | Yes | List all emergency contacts |
| `/api/contacts` | POST | Yes | Add an emergency contact |
| `/api/contacts/:id` | DELETE | Yes | Remove an emergency contact |
| `/api/medical-profile` | GET | Yes | Fetch medical QR profile data |
| `/api/medical-profile` | POST | Yes | Create/update medical profile |

### Alert dispatch payload

```json
POST /api/alerts
{
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "address": "MG Road, Bengaluru"
  },
  "selectedHospital": {
    "name": "Manipal Hospital",
    "phone": "+918022222222"
  },
  "triggerType": "manual" | "crash"
}
```

---

## Android Build Notes

| Setting | Value |
|---|---|
| Package ID | `com.roadsosmobile` |
| Min SDK | API 24 (Android 7.0) |
| Target ABIs | `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` |
| JS Engine | Hermes (enabled) |
| New Architecture | `newArchEnabled=false` — keep this off (Fabric causes black screen on API 37 emulators) |

---

## Troubleshooting

**Blank screen on launch**
Metro is not running. Start it with `npx react-native start`, then shake device → **Reload**.

**App stuck in offline mode**
Backend is unreachable. Verify it's running (`npm start`) and `api.js` has the correct URL (`10.0.2.2:5000` for emulator, LAN IP for physical device).

**"Cannot connect to Metro" on physical device**
```sh
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5000 tcp:5000
```

**Black screen on emulator first boot**
Confirm `newArchEnabled=false` in [android/gradle.properties](RoadSOSMobile/android/gradle.properties), then `.\gradlew clean installDebug`.

**Module not found / stale cache**
```sh
npx react-native start --reset-cache
```

**Gradle build failure after npm install**
```sh
cd RoadSOSMobile/android
.\gradlew clean
.\gradlew installDebug
```

**GPS not working on emulator**
Android Studio → Extended Controls → Location → set coordinates → **Send**.

---

## Roadmap

- [ ] Background crash detection (foreground service — survives app close)
- [ ] FCM push notifications for incoming help confirmation
- [ ] iOS support
- [ ] WhatsApp/SMS fallback for contacts without the app
- [ ] Hindi, Tamil, Telugu language support
- [ ] Direct integration with India's 112 Emergency Response Support System (ERSS)
- [ ] Wearable companion (auto-detect via BLE heart rate + accelerometer)
- [ ] Fleet/logistics dashboard for ambulance dispatch coordination

---

<div align="center">

**Built to close the gap between the moment of impact and the moment help arrives.**

*React Native · Node.js · MongoDB Atlas · MSG91 · Overpass API · Offline-First*

</div>
