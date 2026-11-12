<div align="center">

# 🎯 INTERVEXA

### AI-Powered Interview & Placement Preparation Platform

*Prepare. Assess. Get Placed.*

![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=node.js&logoColor=white)
![Firebase](https://img.shields.io/badge/Auth%20%26%20Data-Firebase-FFCA28?logo=firebase&logoColor=black)
![AI](https://img.shields.io/badge/AI-LLM%20via%20API-A855F7)
![Status](https://img.shields.io/badge/Status-Working%20Prototype-22C55E)

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technologies Used](#-technologies-used)
- [System Architecture](#-system-architecture)
- [Project Folder Structure](#-project-folder-structure)
- [Prerequisites](#-prerequisites)
- [Installation and Setup](#-installation-and-setup)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Application Workflow](#-application-workflow)
- [API Endpoints](#-api-endpoints)
- [Data Model](#-data-model)
- [Screenshots](#-screenshots)
- [Known Limitations](#-known-limitations)
- [Future Enhancements](#-future-enhancements)
- [Contributors](#-contributors)
- [Acknowledgements](#-acknowledgements)

---

## 📖 Overview

**INTERVEXA** is a web-based platform that helps engineering students prepare for campus placements in one place. Preparation today is scattered: one tool for resumes, another for aptitude, another for coding, and very little realistic interview practice. INTERVEXA brings all of these together and uses a Large Language Model (LLM) to generate content, evaluate answers and give personalised feedback.

A student can:

1. Get an **ATS score and feedback** on their resume.
2. Take **aptitude tests** (full 30-question test or topic-wise practice).
3. Solve **coding problems** in an editor with syntax highlighting.
4. Attend a **voice-based AI mock interview** with live and final feedback.
5. **Track progress** across every module on a single dashboard.

> This project was built as a final-year Engineering project.

### 🧠 How the AI works (in short)

INTERVEXA uses **Prompt Engineering with pre-trained LLMs**. Each module sends a structured prompt (role, task, rules and required JSON output format) to the AI model through the backend. We do **not** train any model ourselves. Prompts live in the backend route files under `server/routes/`.

---

## ✨ Key Features

| Module | What it does |
|---|---|
| 🔐 **Authentication** | Email/password sign-up and sign-in, plus **Continue with Google**, using Firebase Authentication |
| 👤 **Profile** | Name, college, branch, graduation year, CGPA, skills, target role, GitHub/LinkedIn and profile photo |
| 📄 **Resume Analyzer** | Upload a resume and receive an ATS score (0–100), a selected/rejected decision, skills found, strengths, weaknesses and improvement tips |
| 🧠 **Aptitude Round** | **Full Test** (30 questions, 30-minute timer) and **Practice Mode** by section and topic, with a question palette, bookmarks, answer review and explanations |
| 💻 **Coding Round** | **Assessment** (4 problems) and **Practice** by topic (including a Random option) with a CodeMirror editor, hints and AI-based code review |
| 🎥 **AI Mock Interview** | Role-based HR and technical questions, spoken questions, voice answers with live transcript, per-question timer, skip option, live feedback and a downloadable final report |
| 📊 **Progress Tracker** | Attempt history, average and best scores, pass rate, score trend, day streak, last-7-days activity and strong/weak topic insights |
| 💡 **How it Works** | A panel in each module showing the flow, algorithm, steps, technologies and common viva questions |
| 🌗 **Modern UI** | Dark, premium interface with a landing page and login modal |

### Module details

<details>
<summary><b>📄 Resume Analyzer</b></summary>

- The resume is read in the browser and sent to the backend.
- The AI acts as a strict ATS evaluator and returns structured JSON.
- Output: ATS score, decision, skills found, strengths, weaknesses, tips.
- The score is saved to the user's history.

</details>

<details>
<summary><b>🧠 Aptitude Round</b></summary>

- **Full Test:** 30 mixed questions (Quantitative, Verbal, Logical Reasoning) with a 30-minute timer.
- **Practice Mode:** choose a section, topic and difficulty.
- Sections and topics:
  - **Quantitative:** Number System, Percentages, Time & Work, Speed & Distance, Simple & Compound Interest
  - **Verbal:** Reading Comprehension, Grammar & Vocabulary, Sentence Correction
  - **Logical Reasoning:** Blood Relations, Coding & Decoding, Data Interpretation, Syllogisms
- Scoring is a simple percentage: `(correct answers / total questions) × 100`. Pass mark is 60%.

</details>

<details>
<summary><b>💻 Coding Round</b></summary>

- **Assessment mode:** 4 problems. **Practice mode:** 2 problems per topic.
- Topics: Arrays, Strings, Linked Lists, Stacks & Queues, Trees, Recursion, Sorting & Searching, Dynamic Programming, and Random.
- Languages: Python, Java, C++, JavaScript.
- The AI reviews the submitted code against test cases and returns a score, verdict, complexity analysis and feedback.
- Code is **reviewed by the AI, not executed** in a sandbox.

</details>

<details>
<summary><b>🎥 AI Mock Interview</b></summary>

- 15 job roles to choose from (for example Software Engineer, Data Analyst, Java Developer, Full Stack Developer).
- 7 questions per interview, mixing HR and technical, with "Tell me about yourself" always first.
- The browser reads questions aloud (Speech Synthesis) and converts your spoken answer to text (Web Speech API).
- 60-second timer per question and a Skip option.
- After every answer, the AI gives short spoken feedback. At the end you get an overall score, strengths, weaknesses, suggestions and per-question ratings.
- The final report can be downloaded as an HTML file.

</details>

---

## 🛠 Technologies Used

| Layer | Technology |
|---|---|
| **Frontend** | React.js, Vite, JavaScript, HTML, CSS |
| **Code editor** | CodeMirror (`@uiw/react-codemirror`) with Python, Java, C++ and JavaScript language support |
| **Charts** | SVG-based charts on the Progress page |
| **Backend** | Node.js, Express.js, REST API, CORS, dotenv, node-fetch |
| **Authentication** | Firebase Authentication (Email/Password and Google) |
| **Database** | Firebase Firestore |
| **File storage** | Firebase Storage (profile photos) |
| **AI / LLM** | Pre-trained LLMs accessed via an OpenAI-compatible chat completions API, routed through a local **OmniRoute** gateway |
| **Voice** | Web Speech API (speech-to-text), Speech Synthesis API (text-to-speech) |
| **Tools** | Git, GitHub, VS Code, npm |

---

## 🏗 System Architecture

```
┌──────────────┐     ┌────────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Student    │ ──▶ │  React Frontend    │ ──▶ │  Node.js/Express │ ──▶ │  OmniRoute  │ ──▶  LLM
│   (Browser)  │     │  (Vite, port 5173) │     │  Backend (5000)  │     │ (localhost) │     providers
└──────────────┘     └─────────┬──────────┘     └──────────────────┘     └─────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Firebase            │
                    │  • Authentication    │
                    │  • Firestore         │
                    │  • Storage           │
                    └──────────────────────┘
```

### Request flow for an AI feature

1. The student performs an action in the React app (for example, uploads a resume).
2. The frontend calls the Express backend (`/api/...`).
3. The backend builds a structured prompt and sends it to the LLM gateway.
4. The AI returns a JSON response.
5. The backend cleans and parses the response and returns it to the frontend.
6. The frontend displays the result and saves the attempt to Firestore.

### Design decisions

- **AI calls go through the backend** so API keys and prompts are never exposed in the browser.
- **Authentication and data go straight from the frontend to Firebase**, which keeps login and saving results simple.
- **A routing gateway (OmniRoute)** lets the backend use several AI providers behind one endpoint, so the app keeps working if one provider is unavailable.

---

## 📁 Project Folder Structure

```
mockAi/
├── client/                         # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── App.jsx                 # Auth state, profile loading, routing between pages
│   │   ├── Dashboard.jsx           # Dashboard layout and navigation
│   │   ├── LoginPage.jsx           # Landing page and sign-in / sign-up modal
│   │   ├── Profilesetup.jsx        # Profile creation and editing
│   │   ├── ResumeAnalyzer.jsx      # Resume module
│   │   ├── AptitudeRound.jsx       # Aptitude module
│   │   ├── CodingRound.jsx         # Coding module
│   │   ├── MockInterview.jsx       # AI interview module
│   │   ├── ProgressPage.jsx        # Progress tracker
│   │   ├── HowItWorks.jsx          # "How it Works" panel for each module
│   │   ├── api.js                  # Frontend functions that call the backend
│   │   ├── firebase.js             # Firebase initialisation
│   │   └── main.jsx
│   ├── .env                        # Frontend environment variables (not committed)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                         # Node.js + Express backend
│   ├── routes/
│   │   ├── resume.js               # POST /api/resume/analyze
│   │   ├── aptitude.js             # POST /api/aptitude/generate
│   │   ├── coding.js               # POST /api/coding/generate | evaluate | hint
│   │   └── interview.js            # POST /api/interview/questions | live-feedback | feedback
│   ├── gemini.js                   # askAI() helper that calls the LLM gateway
│   ├── index.js                    # Express app entry point
│   ├── .env                        # Backend environment variables (not committed)
│   └── package.json
│
├── docs/
│   └── screenshots/                # Add your screenshots here
├── .gitignore
└── README.md
```

> Files such as `theme.js` and `ThemeContext.jsx` may also exist in `client/src/` depending on your version.

---

## ✅ Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js** | v18 or newer, with npm |
| **Git** | To clone the repository |
| **Firebase project** | With **Authentication** (Email/Password and Google), **Firestore** and **Storage** enabled |
| **LLM gateway** | A running OpenAI-compatible endpoint. This project uses **OmniRoute** at `http://localhost:20128/v1` with at least one connected provider and a routing combo configured |
| **Browser** | Google Chrome or Microsoft Edge recommended, for speech recognition and camera/microphone access |
| **Webcam and microphone** | Required for the AI Mock Interview |

---

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/hemanthkumarkt/intervexa.git
cd intervexa
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

If packages are missing, install them manually:

```bash
npm install express cors dotenv node-fetch@2
```

### 3. Install frontend dependencies

```bash
cd ../client
npm install
```

If CodeMirror is missing:

```bash
npm install @uiw/react-codemirror @codemirror/lang-python @codemirror/lang-java @codemirror/lang-cpp @codemirror/lang-javascript @codemirror/theme-one-dark
```

### 4. Set up Firebase

1. Create a project in the [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** → Sign-in methods → **Email/Password** and **Google**.
3. Create a **Firestore Database**.
4. Enable **Storage**.
5. Register a Web app and copy its configuration into `client/src/firebase.js`.
6. Add `localhost` to **Authentication → Settings → Authorized domains** (usually present by default).
7. Set Firestore security rules so each user can access only their own data. Example:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Set up the AI gateway

1. Start OmniRoute and open its dashboard.
2. Connect at least one provider.
3. Create a routing combo for the app.
4. Create an API key and use it in `server/.env`.

The backend sends requests to `http://localhost:20128/v1/chat/completions`. If you use a different gateway, update the URL and model name in `server/gemini.js`.

---

## 🔑 Environment Variables

> ⚠️ Never commit `.env` files or real keys. The `.gitignore` already excludes them.

### `server/.env`

```env
PORT=5000
OMNI_KEY=your_llm_gateway_api_key_here
```

### `client/.env`

The Firebase configuration is set in `client/src/firebase.js`. Add any other `VITE_` variables your version uses, for example:

```env
# Only needed if your build uses the optional D-ID avatar integration
VITE_DID_KEY=your_did_api_key_here
```

> Vite only exposes variables that start with `VITE_`. Restart the dev server after editing `.env`.

---

## ▶️ Running the Application

Open **three terminals** (VS Code: `Terminal → New Terminal`).

**Terminal 1: AI gateway**

Start OmniRoute and confirm it is running at `http://localhost:20128`.

**Terminal 2: Backend**

```bash
cd server
node index.js
```

Expected output:

```
Server running on port 5000
```

**Terminal 3: Frontend**

```bash
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

### Troubleshooting

| Problem | Fix |
|---|---|
| `EADDRINUSE: address already in use :::5000` | Another backend instance is running. Close it, or run `npx kill-port 5000` |
| CORS error in the browser console | The frontend port must be listed in the `cors` origins in `server/index.js` (5173 and 5174 are the usual ones) |
| AI request returns 500 | Check the backend terminal. Make sure the AI gateway is running and a provider is connected |
| `.env` changes not applied | Restart the dev server |
| Camera or microphone not working | Allow permissions in the browser and close other apps using the camera |

---

## 🔄 Application Workflow

```
Landing page → Sign in / Sign up (Email or Google)
        │
        ▼
Profile setup (first time) → Dashboard
        │
        ├── 📄 Resume Analyzer  → ATS score + feedback
        ├── 🧠 Aptitude Round   → Full Test / Practice → score + review
        ├── 💻 Coding Round     → Assessment / Practice → AI code review
        ├── 🎥 AI Interview     → Questions → voice answers → live + final feedback
        └── 📊 Progress         → History, trends, streaks and insights
```

**Detailed flow**

1. The user signs in. Firebase Authentication verifies the account.
2. On first login the user completes their profile, which is stored in Firestore.
3. The user opens a module. Anything AI-related is requested through the Express backend.
4. After finishing a module, the result (type, topic, score, result, date and more) is saved under the user's `attempts` in Firestore.
5. The dashboard and Progress page read this history and update in real time.

---

## 🔌 API Endpoints

All endpoints are served by the Express backend on `http://localhost:5000`.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/resume/analyze` | Analyse resume text and return ATS results |
| `POST` | `/api/aptitude/generate` | Generate aptitude MCQs (`topic`, `difficulty`, `count`) |
| `POST` | `/api/coding/generate` | Generate coding problems (`topic`, `difficulty`, `count`) |
| `POST` | `/api/coding/evaluate` | Review submitted code against test cases |
| `POST` | `/api/coding/hint` | Get a short hint without the full solution |
| `POST` | `/api/interview/questions` | Generate interview questions for a job role |
| `POST` | `/api/interview/live-feedback` | Quick feedback on a single answer |
| `POST` | `/api/interview/feedback` | Final interview report |

---

## 🗄 Data Model

INTERVEXA stores application data in **Firebase Firestore**.

```
users (collection)
└── {uid} (document)                 # profile
    ├── name, college, location, dob
    ├── branch, gradYear, cgpa, experience
    ├── skills[], targetRole
    ├── github, linkedin, imageUrl
    └── attempts (sub-collection)
        └── {attemptId} (document)
            ├── type        # resume | aptitude | coding | interview
            ├── subtype     # topic or job role
            ├── score       # 0–100
            ├── result      # passed | failed | selected | rejected
            ├── difficulty, language, correct, total   # where applicable
            └── date        # server timestamp
```

Profile photos are stored in Firebase Storage under `profileImages/{uid}`.

---

## 📸 Screenshots

> Replace the placeholders below with your own screenshots saved in `docs/screenshots/`.

| Landing Page | Login |
|:---:|:---:|
| ![Landing Page](docs/screenshots/landing.png) | ![Login](docs/screenshots/login.png) |

| Dashboard | Resume Analyzer |
|:---:|:---:|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Resume Analyzer](docs/screenshots/resume.png) |

| Aptitude Round | Coding Round |
|:---:|:---:|
| ![Aptitude](docs/screenshots/aptitude.png) | ![Coding](docs/screenshots/coding.png) |

| AI Mock Interview | Progress Tracker |
|:---:|:---:|
| ![Interview](docs/screenshots/interview.png) | ![Progress](docs/screenshots/progress.png) |

| How it Works Panel |
|:---:|
| ![How it Works](docs/screenshots/how-it-works.png) |

---

## ⚠️ Known Limitations

- **Coding evaluation is AI-based review.** Submitted code is not compiled or run in a sandbox, so results depend on the AI's reading of the logic.
- **Resume parsing is basic.** The resume is read in the browser. Text-based files work best, and scanned or image-only PDFs may not be analysed accurately.
- **AI output varies.** Because responses come from an LLM, scores and questions can differ between attempts.
- **The interview avatar is a static photo.** Voice is produced by the browser's built-in text-to-speech.
- **Speech recognition depends on the browser.** It works best in Chrome and Edge.
- **The AI gateway runs locally,** so it must be running whenever the backend needs to call the AI.

---

## 🚀 Future Enhancements

- 🧑‍💻 Real code execution in a secure sandbox with actual test-case verification
- 🎭 Lip-synced animated AI interviewer avatar
- 😊 Emotion and confidence analysis from facial expressions during interviews
- 🏢 Company-specific question banks (for example TCS, Infosys, Wipro)
- 📝 AI-assisted resume builder
- 🏆 Leaderboard and peer comparison across a campus
- 📱 Mobile application
- 🗃 Optional migration of application data to a relational database such as MySQL
- 🚢 Cloud deployment of the frontend and backend

---

## 👥 Contributors

**Department of Information Science and Engineering**
**Sapthagiri College of Engineering, Bengaluru**

| Name |
|---|
| Ananya Behera |
| Hariprasad C R |
| Hemanth Kumar K T |
| Maneesh M |

**Project Guide:** Prof. Roopa K T, Assistant Professor, Dept. of ISE

---

## 🙏 Acknowledgements

- Our project guide and the Department of Information Science and Engineering for their guidance and support.
- Sapthagiri College of Engineering for the opportunity to build this project.
- The open-source community behind React, Vite, Express, Firebase and CodeMirror.

---

<div align="center">

**INTERVEXA** · *Prepare. Assess. Get Placed.* 🎯

</div>
