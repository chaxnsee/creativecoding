# Fluid Acid Glass

A real-time, browser-based visual layer rendered over a live webcam feed. The visual behaves like a fluid acid glass—iridescent, refractive, and alive.

## Running Locally

You can run this project with any static file server.

### Option 1: Python (Mac Default)
Run this command in the project folder:
```bash
python3 -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000)

### Option 2: VS Code
Install the "Live Server" extension and click "Go Live".

## Deployment (Vercel)

This project is a **Static Site** (HTML/JS/CSS). It does not require a build step because it uses CDN links for dependencies.

1. **Push to GitHub**
   - Create a new repository on GitHub.
   - Run these commands in your `fluid_glass` folder:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
     git push -u origin main
     ```

2. **Deploy on Vercel**
   - Go to [Vercel.com](https://vercel.com) and log in.
   - Click **"Add New..."** -> **"Project"**.
   - Import your GitHub repository.
   - **Important:** In the "Build & Development Settings", if it detects Vite, **change the "Framework Preset" to "Other"**.
   - Ensure the "Output Directory" is set to `.` (dot) or just leave it blank.
   - Click **Deploy**.

## Technologies
- **Three.js** (WebGL Rendering)
- **MediaPipe** (Hand Tracking)
- **Vanilla JS** (No bundler required)
