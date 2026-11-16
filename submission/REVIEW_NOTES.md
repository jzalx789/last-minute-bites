# Last Minute Bites prototype review notes

Group S01G10. App version 1.4.3. Updated 16 November 2026.

## Submission

- Working app URL: <https://last-minute-bites-demo.jzalx789.workers.dev/>
- Complete source code: `S01G10.zip`. Extract the `S01G10` folder and read its root `README.md` for local setup and tests.
- Optional launch file: `S01G10.html` opens the same hosted URL. The hosted app needs an internet connection.

The instructor has approved the HTML, CSS and JavaScript mobile-friendly web app with a Cloudflare backend and database, and confirmed that an Android APK is not required. Core functions, at least two advanced features, stable execution and documentation remain required.

## Open the hosted app

Use an Android or iOS browser, either on a device or in an OS emulator. The app can be used directly from its URL; adding it to the Home Screen is optional.

Select **Register**, use a unique email address, choose a password and confirm the user agreement. Create a kitchen when prompted. Returning users can sign in with their own account. No shared demo login is needed. This prototype does not require email verification and does not provide automated password-reset emails.

No developer account, Cloudflare account, API key or local software installation is needed to review the hosted app.

## Suggested review flow

1. Add food with its remaining quantity and unit. Enter a package date or select the option for an unknown date.
2. Open My food, search or filter the inventory, and reload to check that saved records persist.
3. Select a food and record a partial amount used. Review the remaining quantity; full use and restoration are also available.
4. Select ingredients and open Recipes. Review the mode, number of dishes and preferences before explicitly generating recipes. Generation does not deduct stock; recording actual consumption is a separate action.
5. To review sharing, use a second account in a separate browser session. The owner can create an invitation code in Shared kitchen; the second account can join using that code. Each account retains its own sign-in details.
6. Review settings for language, text size, reminders, kitchen access and privacy controls.

## External services and permissions

Cloudflare hosts the app and stores shared kitchen records in a persistent SQLite-backed Durable Object. Shared changes are refreshed by polling rather than WebSocket push.

DeepSeek supplies AI recipes and food suggestions through a private server-side service. Text AI and photo AI require separate consent and are off by default. Follow the in-app explanation before enabling either choice. Reviewers do not need to supply a provider key. Internet access, provider availability and the project's existing request limits apply; manual inventory remains available when AI is disabled or unavailable.

Camera access is requested when scanning an invitation. Notification permission is requested only when reminders are explicitly enabled. On iOS, web push requires opening the app from its Home Screen icon. These permissions are optional for reviewing manual inventory.

## Local source setup and verification

The root `README.md` gives the Node.js 24 and Python 3.12 setup, dependency installation and two local Wrangler processes. Use its isolated test configuration for development; it connects to a fake AI/push fixture rather than the hosted production records. Fixture results verify app behaviour and do not measure real AI quality or phone notification delivery.

The hosted backend's private API and deployment credentials are not required for these local fixture tests and are not included in the source export. Production deployment is managed separately by the team.

## Verification evidence

The version 1.4.3 runtime passed [Prototype acceptance](https://github.com/jzalx789/last-minute-bites/actions/runs/43817100586), including Worker and Python tests plus API, Chromium and WebKit flows. Automated mobile viewport tests are distinct from Android/iOS device or OS emulator evidence. The team still needs to record current-version device or OS emulator browser testing and complete the related course documentation.
