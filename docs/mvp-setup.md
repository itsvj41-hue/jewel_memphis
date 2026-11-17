# Golden Jewelers counter: MVP setup

One counter app, opened with a shared PIN. Orders are saved to Supabase. Metal prices come from goldapi.io when a key is set, and otherwise use the owner rates in Settings.

## What staff do
1. Open the app and enter the counter PIN.
2. Create the quote: customer, ornament, design, estimate, CAD, confirm.
3. Send to workshop, then print the workshop ticket.
4. Tap **Lock** when leaving the counter. The app also locks after 12 hours.

## Setup (Vercel)
Set these for **Production** (and Preview if you test branches):

| Name | Value |
|---|---|
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (Sensitive) |
| `STAFF_PIN` | the counter PIN, 4 to 6 digits (Sensitive) |
| `JWT_SECRET` | 32+ random characters (Sensitive) |
| `METALS_API_KEY` | goldapi.io key (Sensitive), optional |
| `METALS_API_PROVIDER` | `goldapi`, optional |

Then redeploy.

## Database
Run `supabase/schema.sql` once in the Supabase SQL editor. It creates `custom_orders` and `metal_rates`, with row-level security on and no public access. The server uses the service role key.

## Checks after deploy
- `/api/rates` returns JSON with `"source":"live"`, or the app shows owner rates.
- The live site asks for the PIN, and a wrong PIN is refused. Ten wrong tries in 15 minutes from one address are blocked for 15 minutes.
- After unlocking, a test order saves and appears under **Orders**.
- `/api/orders` returns `401` before unlocking.

## Security notes
- The PIN is checked on the server and is never stored in the browser.
- The unlock cookie is HttpOnly, Secure and SameSite=Strict, and expires after 12 hours.
- To change the PIN, edit `STAFF_PIN` in Vercel and redeploy. Everyone must unlock again.
- Anyone with the PIN can see and change all orders, so share it only with counter staff.

## Development
- `npm test`: 34 tests (pricing, order state, settings, PIN lock).
- `npm run lint` and `npm run build`.
