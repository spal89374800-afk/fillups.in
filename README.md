<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ca8dee86-9bfd-483a-ac82-45598913e37b

## Run Locally

**Prerequisites:**  Node.js

Do not open `index.html` directly as a `file://` URL. This app uses React/TypeScript modules and must be served by the development server.

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key.
3. To enable login OTP delivery, configure Gmail SMTP with `SMTP_USER` and `SMTP_PASS` (a Google App Password), and configure the WhatsApp Cloud API with `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID`, and an approved `WHATSAPP_OTP_TEMPLATE_NAME` in `.env.local`. The template must accept the OTP as its first body text parameter; `WHATSAPP_OTP_TEMPLATE_LANGUAGE` defaults to `en_US`. `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `WHATSAPP_API_VERSION` have defaults; see [.env.example](.env.example). Both email and WhatsApp delivery must be configured, and login sends the same OTP to both. Do not commit or share provider credentials.
4. Run the app:
   `npm run dev`
5. Open `http://localhost:3000` in your browser.

## Live Chat and Client Camera

Live order chat is delivered over Socket.IO and remains stored on the order for reconnects. When an operator requests a live photo, an online client receives the request in the app; the camera is opened only after the client taps **Allow Camera & Start Live Preview** and grants browser permission. WebRTC streams the client camera preview to the operator, and the client separately captures and submits the requested photo. Camera access requires HTTPS outside localhost. If the client is offline, the operator can share the secure WhatsApp request link.

`WEBRTC_ICE_SERVERS` accepts a JSON array of WebRTC ICE server entries. The default STUN server may work on some networks, but a TURN service is needed for reliable peer-to-peer media across carrier NATs and restrictive firewalls. Configure the TURN server URL and credentials in `.env.local`; use short-lived provider-issued credentials when possible because ICE settings are delivered to participating browsers. Socket.IO runs on the same host and port as the app.

## Operator UPI Profile (Prototype)

Jan Seva Kendra and Form Filler dashboards include an OTP-verified operator UPI ID profile. Only the UPI ID is collected; no bank account number, bank name, or IFSC is requested. The registered mobile number is used to bind the profile and for OTP verification. The same OTP is delivered to the registered email and WhatsApp number through configured SMTP and WhatsApp Cloud API; SMS OTP is not enabled. UPI profiles are currently held in server memory and cleared on restart.

Checkout uses three separate single-recipient `upi://pay` intents after the citizen approves the proof, because plain UPI P2P cannot route one payment to multiple VPAs:

1. **Government Fee** — full government fee to the assigned operator's UPI ID, confirmed by the operator.
2. **Admin Fee** — `ADMIN_COMMISSION_PERCENT` (default 17%) of the service fee to `ADMIN_UPI_ID`, confirmed by an admin using `ADMIN_TOKEN` (sent as the `x-admin-token` header or `adminToken` body to `POST /api/payments/confirm-split`).
3. **Operator Share** — the remaining 83% of the service fee to the operator's UPI ID, confirmed by the operator.

The citizen total is `govtFee + serviceFee`; the admin fee is carved out of the service fee, not added on top. When all three legs are confirmed the order is marked paid in-app (`isPaymentDoneInApp`) and WhatsApp dispatch unlocks. A submitted UTR alone does not confirm payment. The app does not implement payment-provider webhooks; per-leg confirmation is manual. Per-operator pricing and all orders/chats are stored server-side and filtered by account (client, Jan Seva operator, or form filler).
# fillups.in
