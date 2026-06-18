# MAVLink Telemetry Dashboard

A real-time telemetry dashboard for MAVLink-based drones (e.g. Pixhawk).  
Built by **Wingspan Global Pvt Ltd**.

## Stack
- **Frontend**: Vite + Vanilla JS + uPlot (WebSocket charts)
- **Backend**: Python asyncio + websockets + pymavlink

---

## Quick Start

### Option A — One-click launcher (recommended)
Double-click `start.bat`

This will:
1. Check for Python and Node.js
2. Install npm packages if needed (first run only)
3. Launch the MAVLink WebSocket bridge (`server.py`) in a separate window
4. Start the Vite dev server and open your browser at `http://localhost:3000`

### Option B — Manual

**Terminal 1 — Backend:**
```bash
python server.py --baud 57600 --ws-port 8765
```

**Terminal 2 — Frontend:**
```bash
npm install   # only needed once
npm run dev   # starts Vite at http://localhost:3000
```

---

## Usage
1. Connect your Pixhawk via USB
2. The bridge auto-detects the COM port and streams MAVLink data
3. Open `http://localhost:3000` in a browser
4. Blue **Connected** dot = bridge is active; click any stream to add a live chart

## Options
| Flag | Default | Description |
|------|---------|-------------|
| `--baud` | `57600` | Serial baud rate |
| `--ws-port` | `8765` | WebSocket server port |
