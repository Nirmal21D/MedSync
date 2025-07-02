# MedSync

A modern hospital management system with role-based dashboards and patient management.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/nirmaldarekarixkcgandhi-2939s-projects/v0-medsync-project)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/j8XgQuDDauq)

## Overview

MedSync is a full-featured hospital management platform supporting multiple roles:
- **Doctor**: Manage assigned patients, add/edit/discharge, view/add notes, update vitals, manage prescriptions and appointments, update patient history.
- **Nurse**: View assigned patients, update vitals, add nursing notes.
- **Receptionist**: Register new patients, assign doctors/beds, manage appointments.
- **Pharmacist**: View and process prescriptions.
- **Admin**: Manage staff, beds, and inventory.
- **Lab Doctor**: Generate lab reports for patients.
- **MD (Medical Doctor)**: eSign operation documents.
- **Other Roles**: Request lab reports for patients.

## Key Features

- **Role-based Dashboards**: Each user sees a dashboard tailored to their role.
- **Patient Management**: Add, edit, discharge, and search patients. Doctors can update patient history and add notes.
- **Vitals Tracking**: Vitals (BP, HR, Temp, O2) can be updated and viewed.
- **Appointments & Prescriptions**: Schedule and manage appointments, create and process prescriptions.
- **Bed Management**: Assign and manage beds for patients.
- **Conditional UI**: Special actions based on role:
  - Lab Doctor: "Generate Report" button
  - MD: "eSign Operation Doc" button
  - Others: "Request Lab Report" button
- **Firestore Integration**: All data is persisted in Firebase Firestore.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd MedSync
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```
3. **Set up Firebase:**
   - Add your Firebase config to `lib/firebase.ts`.
4. **Run locally:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

## Deployment

Your project is live at:

**[https://vercel.com/nirmaldarekarixkcgandhi-2939s-projects/v0-medsync-project](https://vercel.com/nirmaldarekarixkcgandhi-2939s-projects/v0-medsync-project)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/j8XgQuDDauq](https://v0.dev/chat/projects/j8XgQuDDauq)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
