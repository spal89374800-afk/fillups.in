<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ca8dee86-9bfd-483a-ac82-45598913e37b

## Folder Structure

All application source lives in two folders:

- `backend/` — Express API, Socket.IO, OTP/email delivery, and `server.ts`.
- `frontend/` — React app, components, styles, Vite config, and its own env files.

Each folder has its own env files, and they are never committed:

| Folder | Local secrets | Template |
| --- | --- | --- |
| `backend/` | `backend/.env.local` | `backend/.env.example` |
| `frontend/` | `frontend/.env.local` | `frontend/.env.example` |

The root `server.ts` is only a small compatibility shim for the Render start command (`npx tsx server.ts`); all server code is inside `backend/`.

## Run Locally

**Prerequisites:**  Node.js

Do not open `index.html` directly as a `file://` URL. This app uses React/TypeScript modules and must be served by the development server.

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [backend/.env.local](backend/.env.local) to your Gemini API key.
3. To enable real Gmail OTP delivery, configure either Gmail SMTP (`SMTP_USER` + `SMTP_PASS`, a Google App Password) or an HTTPS email API (`BREVO_API_KEY`, `RESEND_API_KEY`, or `SENDGRID_API_KEY`) in `backend/.env.local`; see [backend/.env.example](backend/.env.example). **Render free web services block outbound SMTP ports 25/465/587**, so a free Render deployment must use an HTTPS email API (Brevo is recommended). Test OTP is not supported: the code never returns an OTP in the API response. Do not commit or share provider credentials.
   The frontend reads its own `VITE_API_URL` from [frontend/.env.local](frontend/.env.local) (see [frontend/.env.example](frontend/.env.example)); it is the backend URL used when the site is opened from a separate frontend URL.
4. Run the app:
   `npm run dev`
5. Open `http://localhost:3000` in your browser.

## Live Chat and Client Camera

Live order chat is delivered over Socket.IO and remains stored on the order for reconnects. When an operator requests a live photo, an online client receives the request in the app; the camera is opened only after the client taps **Allow Camera & Start Live Preview** and grants browser permission. WebRTC streams the client camera preview to the operator, and the client separately captures and submits the requested photo. Camera access requires HTTPS outside localhost. If the client is offline, the operator can share the secure WhatsApp request link.

`WEBRTC_ICE_SERVERS` accepts a JSON array of WebRTC ICE server entries. The default STUN server may work on some networks, but a TURN service is needed for reliable peer-to-peer media across carrier NATs and restrictive firewalls. Configure the TURN server URL and credentials in `.env.local`; use short-lived provider-issued credentials when possible because ICE settings are delivered to participating browsers. Socket.IO runs on the same host and port as the app.

## Operator UPI Profile (Prototype)

Jan Seva Kendra and Form Filler dashboards include an OTP-verified operator UPI ID profile. Only the UPI ID is collected; no bank account number, bank name, or IFSC is requested. The registered mobile number is used to bind the profile and for OTP verification. The OTP is delivered to the registered Gmail address through SMTP or an HTTPS email API; SMS and WhatsApp OTP are not enabled. UPI profiles are currently held in server memory and cleared on restart.

Checkout uses three separate single-recipient `upi://pay` intents after the citizen approves the proof, because plain UPI P2P cannot route one payment to multiple VPAs:

1. **Government Fee** — full government fee to the assigned operator's UPI ID, confirmed by the operator.
2. **Admin Fee** — `ADMIN_COMMISSION_PERCENT` (default 17%) of the service fee to `ADMIN_UPI_ID`, confirmed by an admin using `ADMIN_TOKEN` (sent as the `x-admin-token` header or `adminToken` body to `POST /api/payments/confirm-split`).
3. **Operator Share** — the remaining 83% of the service fee to the operator's UPI ID, confirmed by the operator.

The citizen total is `govtFee + serviceFee`; the admin fee is carved out of the service fee, not added on top. When all three legs are confirmed the order is marked paid in-app (`isPaymentDoneInApp`) and WhatsApp dispatch unlocks. A submitted UTR alone does not confirm payment. The app does not implement payment-provider webhooks; per-leg confirmation is manual. Per-operator pricing and all orders/chats are stored server-side and filtered by account (client, Jan Seva operator, or form filler).
# fillups.in
