# Firewatch

Turn any laptop into a fire monitor. Users Sign In, open the monitor page on a
device, and that device streams its webcam and runs an open-source computer
vision model in the browser to detect fire. When fire is detected, Firewatch
captures a proof frame and emails an alert (via Resend) naming the monitor and
reminding recipients to contact the fire authorities.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind v4
- shadcn/ui components
- Firebase Auth (sign in), Firestore (users, monitors, detections), Storage (proof frames)
- Resend (alert emails)
- In-browser detection: YOLOv8n fire model via `onnxruntime-web`, with a color+flicker heuristic fallback

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in every value:
   ```bash
   cp .env.example .env.local
   ```
   - **Firebase Web SDK**: Firebase console > Project settings > General > Your apps.
   - **Firebase Admin SDK**: Project settings > Service accounts > Generate new private key. Paste the private key on one line with literal `\n` for newlines, in quotes.
   - **Resend**: create an API key and verify the sending domain used in `FIRE_ALERT_FROM`. For quick testing you may send from `onboarding@resend.dev`.

3. In the Firebase console, enable **Email/Password** sign in (Authentication), create a **Firestore** database, and enable **Storage**.

4. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```
   (`firestore.rules` and `storage.rules` live at the project root.)

5. Run the app:
   ```bash
   npm run dev
   ```

## The detection model

The app works out of the box using a documented color+flicker heuristic. For a
trained model, drop a YOLOv8n fire/smoke model at `public/models/fire.onnx` and
the monitor switches to it automatically.

To produce the ONNX file from open-source YOLOv8 fire weights (one-time, offline):

```bash
pip install ultralytics
# using open-source fire/smoke weights, e.g. best.pt from a fire-detection repo
yolo export model=best.pt format=onnx imgsz=640 opset=12 simplify=True
# copy the resulting best.onnx to public/models/fire.onnx
```

> **License note:** Ultralytics YOLOv8 and most published fire weights are
> **AGPL-3.0**. Review the license implications before using them in a commercial
> deployment.

## How it works

- `/monitor` requests the camera, registers a `Monitor` document, sends a
  heartbeat, and runs the detector a few times per second.
- On a fire detection it captures a JPEG frame and POSTs it to
  `/api/detections`, which uploads the frame to Storage, records a `Detection`,
  and sends the Resend alert (subject to a per-monitor cooldown).
- `/dashboard` lists your monitors with live status and a realtime feed of
  detections, each with its proof frame served from `/api/detections/[id]/file`.
- `proxy.ts` redirects unauthenticated visitors away from `/dashboard` and
  `/monitor`.
