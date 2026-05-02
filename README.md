# Mr.Certi – E-Certificate Distribution Platform

A modern web application for automated certificate generation, distribution, and tracking.

## ✨ Features

- **Organizer Dashboard** – Upload participant lists (CSV), manage certificate templates, bulk-generate certificates, send email notifications, track delivery status
- **Participant Dashboard** – Login, view and download certificates
- **Firebase Backend** – Authentication, Firestore Database, Cloud Storage
- **Auto Certificate Generation** – Canvas-based name insertion into templates
- **Sky Blue + White Theme** – Clean, modern, responsive UI

## 🛠 Tech Stack

- **Frontend:** HTML, CSS, JavaScript (ES Modules)
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Fonts:** Google Fonts (Inter)

## 🚀 Getting Started

1. Clone this repository
2. Serve locally with any static server:
   ```bash
   node server.js
   ```
3. Open `http://localhost:3000`

## 📂 Project Structure

```
Mr.Certi/
├── index.html          # Landing page + Auth modal
├── organizer.html      # Organizer dashboard
├── participant.html    # Participant dashboard
├── server.js           # Simple Node.js static server
├── firebase-config.js  # Firebase configuration
├── css/
│   ├── global.css      # Design system & global styles
│   ├── auth.css        # Auth form styles
│   └── dashboard.css   # Dashboard layout styles
└── js/
    ├── auth.js         # Firebase auth (login/signup/reset)
    ├── landing.js      # Landing page interactions
    ├── organizer.js    # Organizer dashboard logic
    └── participant.js  # Participant dashboard logic
```

## 🔥 Firebase Setup

1. Enable **Email/Password** authentication in Firebase Console → Authentication → Sign-in method
2. Create a **Firestore Database** in Firebase Console
3. Enable **Firebase Storage**

## 📜 License

MIT
