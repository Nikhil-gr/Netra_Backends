# Netra backend

A small Express API for four camera modes: describe surroundings, read visible
text, find an object, and identify obvious environmental obstacles. React owns
the camera, microphone, speech recognition, text-to-speech, vibration, and UI.

## Run locally

Use Node.js 22.12 or newer. From this backend folder:

```sh
npm install
```

Copy `.env.example` to `.env` (the scaffold already has an empty `.env`).
PowerShell: `Copy-Item .env.example .env`. Fill in `GEMINI_API_KEY` with a
[Google AI Studio key](https://aistudio.google.com/apikey). Keep the key on the
backend, never in a React `VITE_` variable.

For history, start MongoDB locally or set `MONGODB_URI` to your MongoDB connection
string. Leave it empty to test analysis without history.

```sh
npm run dev
# Or without watching files:
npm start
```

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.
Base URL: `http://localhost:5000/api/v1`.
The server starts without credentials so you can check health immediately.
Real analysis requires a working Gemini key and internet access.

| Variable | Default / purpose |
| --- | --- |
| `PORT` | `5000` |
| `GEMINI_API_KEY` | Required for analysis |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite`; must support image input and structured JSON |
| `MONGODB_URI` | Example: `mongodb://127.0.0.1:27017/netra`; empty disables history |
| `CLOUDINARY_CLOUD_NAME` | Required to store images with saved history |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret; keep it on the backend |
| `CORS_ORIGIN` | Comma-separated exact origins; defaults to `http://localhost:5173,http://127.0.0.1:5173` |

For a phone demo, use your computer's LAN address in the frontend API URL and
add the frontend's exact origin to `CORS_ORIGIN`. Browser camera access requires
a secure frontend context (HTTPS, or localhost on the same device).

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Liveness; no Gemini or MongoDB calls |
| POST | `/api/v1/analyze` | Analyze an image and optionally save the result |
| GET | `/api/v1/history` | List saved results, newest first |
| POST | `/api/v1/history` | Manually save a previous analysis result |
| DELETE | `/api/v1/history/:id` | Delete one scoped history item |
| POST | `/api/v1/sos/trigger` | Create an SOS event and return a dialable URI |
| POST | `/api/v1/parental/pairing-code` | Create a short-lived child pairing code |
| POST | `/api/v1/parental/link` | Claim a pairing code as a parent |

Health returns exactly:

    {"success":true,"service":"netra-api","status":"healthy"}

### Analyze

Send `multipart/form-data`:

| Field | Values |
| --- | --- |
| `image` | Required JPEG, JPG, PNG, or WebP; at most 5 MiB |
| `mode` | Required: `describe`, `read`, `find`, or `assist` |
| `query` | Optional text, at most 200 characters; required and nonblank for `find` |
| `language` | `en` (default) or `ne` |
| `saveHistory` | String `true` (default) or `false` |

PowerShell example (replace the image path):

```powershell
curl.exe http://localhost:5000/api/v1/analyze -F "image=@C:/photos/room.jpg" -F "mode=find" -F "query=chair" -F "language=en" -F "saveHistory=true"
```

Example response:

    {
      "success": true,
      "data": {
        "mode": "find",
        "query": "chair",
        "language": "en",
        "result": {
          "found": true,
          "object": "chair",
          "position": "right",
          "description": "A chair beside a table.",
          "spokenResponse": "A chair is visible on your right."
        },
        "historySaved": true,
        "historyId": "<MongoDB document ID>"
      }
    }

With saving disabled, `historySaved` is false and `historyId` is null. When
saving was requested but fails, analysis still succeeds and adds a
`historyWarning` string. With saved history, the processed photo is stored in
Cloudinary and MongoDB stores its URL and public ID instead of image bytes.

Every mode returns `result.spokenResponse`. Other fields are:

- `describe`: `scene`, `summary`, `objects: [{ name, position }]`,
  `possibleHazards: [{ type, position }]`, `visibleText: string[]`.
- `read`: `detectedText: string[]` in reading order, preserving original scripts.
- `find`: `found`, `object`, `position`, `description`. Not clearly found is a
  normal HTTP 200 result: `found: false`, `position: null`, `description: null`.
- `assist`: `possibleHazards: [{ type, position, message }]`.

Positions are `left`, `center`, `right`, or `unclear`, relative to the image.
For `ne`, prompts request natural Nepali in `spokenResponse`; keys and position
enums remain English. Actual wording depends on Gemini's output.

### React integration

```js
const formData = new FormData();
// Set imageBlob.type to the real image MIME type when capturing the camera.
formData.append('image', imageBlob, 'capture.jpg');
formData.append('mode', 'find');
formData.append('query', 'chair');
formData.append('language', 'en');
formData.append('saveHistory', 'true');

const response = await fetch('http://localhost:5000/api/v1/analyze', {
  method: 'POST',
  body: formData,
}); // The browser sets Content-Type and the multipart boundary.
const payload = await response.json();
if (!response.ok) throw new Error(payload.error.message);
const { result, historySaved, historyWarning } = payload.data;
// Display result and speak result.spokenResponse using frontend TTS.
```

### History

`GET /api/v1/history?page=1&limit=20&mode=find` returns
`{ success: true, data: { items, page, limit } }`. `mode` is optional;
`limit` is 1–100; `page` is 1–10000. Items contain `_id`, `mode`, `query`,
`language`, `result`, and `createdAt`.

For a Save button, analyze with `saveHistory=false`, then send
`POST /api/v1/history` with `Content-Type: application/json` and
`{ mode, query, language, result }` copied from the analysis response. It validates
the result and returns HTTP 201 with `{ success: true, data: <saved record> }`.
Do not manually save after automatic saving unless you want a duplicate.

History routes return 503 if MongoDB is unavailable. If the initial connection
fails, correct the URI/start MongoDB and restart the API. Users are optional:
anonymous analysis continues to work without signup. `GET /history` returns
anonymous records only; `GET /history?userId=<id>` returns only that user's
records. Use `DELETE /history/:id?userId=<id>` for a user item, or
`DELETE /history?userId=<id>` / `DELETE /history?anonymous=true` to clear a
safe, explicit history scope.

## Processing and errors

Multer holds uploads in memory. Sharp checks the actual decoded format, rejects
animated or over-50-megapixel images, applies EXIF rotation, fits within 1024 ×
1024 without enlargement, and produces JPEG at quality 75 with metadata removed.
Images go to Gemini inline and are never written to local disk or MongoDB.
When history is requested, the processed JPEG is uploaded to Cloudinary and its
URL is stored with the MongoDB history record. Buffer references are released
after each request.

The official `@google/genai` SDK sends a separate system prompt and JSON schema
per mode. The backend parses and validates returned fields, nested objects,
and position values. It never returns raw markdown or invents a result when
AI fails. References: [Google SDK](https://github.com/googleapis/js-genai),
[structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

Errors use `{ success: false, error: { code, message } }`:

| Status | Examples |
| --- | --- |
| 400 | Missing image, invalid fields, corrupt image, malformed multipart/JSON |
| 413 | Image over 5 MiB or JSON over 256 KiB |
| 415 | Wrong content type or unsupported image format |
| 422 | Gemini cannot analyze the image due to content restrictions |
| 429 | API rate limit or Gemini quota/rate limit |
| 502 | Gemini unavailable, invalid JSON, or incomplete result |
| 503 | Gemini configuration error or history unavailable |
| 504 | Gemini timeout (30 seconds) |

Analysis allows 20 requests per minute per IP; history allows 60. Health is
not rate limited. Limits use process memory for a single-server MVP. If deploying
behind a reverse proxy, configure Express `trust proxy` for your actual trusted
proxy topology before relying on per-IP limits. The local default does not
trust forwarded headers.

Prompts prohibit identity guesses, exact distance estimates, medical diagnosis,
and assurances that a path is safe. Assist mode provides image observations,
not autonomous navigation.

## Quick verification

```powershell
curl.exe http://localhost:5000/api/v1/health
curl.exe http://localhost:5000/api/v1/history
curl.exe http://localhost:5000/api/v1/analyze -F "image=@C:/photos/room.jpg" -F "mode=describe" -F "saveHistory=false"
curl.exe http://localhost:5000/api/v1/analyze -F "image=@C:/photos/sign.jpg" -F "mode=read" -F "language=ne"
curl.exe http://localhost:5000/api/v1/analyze -F "image=@C:/photos/room.jpg" -F "mode=find" -F "query=chair"
curl.exe http://localhost:5000/api/v1/analyze -F "image=@C:/photos/path.jpg" -F "mode=assist"
```

Verify no-key health, all four modes with your Gemini key, English and Nepali,
a missing object (200), missing find query (400), oversized image (413),
unsupported file (415), and history with MongoDB connected/disconnected.
Listen to real outputs before your demo; structural validation cannot verify
the accuracy of what Gemini sees.

## Authenticated family features

Public image analysis and navigation remain available without login. History,
settings, SOS, and parental routes require `Authorization: Bearer <token>`.
Set `AUTH_TOKEN_SECRET` in `.env` to a random value of at least 32 characters.

Register a parent and child together with `POST /api/v1/auth/register-family`:

```json
{
  "parent": { "name": "Maya", "email": "maya@example.com", "password": "at-least-8-characters", "phone": "+9779812345678" },
  "child": { "name": "Aarav", "email": "aarav@example.com", "password": "at-least-8-characters", "phone": "+9779812345679" }
}
```

This automatically creates the parent-child link. Each account signs in through
`POST /api/v1/auth/login` with `{ "email", "password" }` and receives a token.
There is no pairing-code route in this flow. A signed-in child triggers SOS with
`POST /api/v1/sos/trigger`; the backend snapshots the linked parent's required
phone number and returns its `tel:` URI. The frontend starts the call.

Private endpoints derive the caller from the token: `/history` accesses only the
signed-in user's records, `/settings` accesses only their preferences, and
parental endpoints authorize the signed-in parent or child through FamilyLink.
For a signed-in child, `PUT /parental/location` needs only coordinates; for a
signed-in parent, `GET /parental/children/:childId/history` returns linked child
history when the link's `historyVisible` control is enabled.

## Users, SOS, parental controls, and settings

`POST /users` accepts `name`, `email`, optional `role` (`parent` or `child`),
and optional `emergencyContacts`. Contacts use `{ name, relationship?, phone,
isPrimary? }`; phone numbers are normalized to a dialable `+` form. One contact
is primary (the first is made primary if none is supplied). A role can be set
once but cannot be changed afterward.

```json
POST /api/v1/users
{"name":"Aarav","email":"aarav@example.com","role":"child","emergencyContacts":[{"name":"Mom","relationship":"mother","phone":"+9779812345678","isPrimary":true}]}
```

SOS is an event record, not a server-side telephone call. `POST /sos/trigger`
accepts `{ userId, location?: { latitude, longitude, accuracy? } }` and returns
`{ eventId, contact, dialUri, location, status, triggeredAt }`. The frontend
uses `dialUri` (for example, `window.location.href = data.dialUri`). Record
client actions with `POST /sos/:id/dial-started` or `POST /sos/:id/cancel`, each
with `{ userId }`. `GET /sos?userId=...&limit=20` returns only that user's SOS
events.

Pairing uses a six-digit code that expires in ten minutes; only its hash is
stored. A child creates it with `POST /parental/pairing-code` and
`{ childUserId }`. A parent claims it with `POST /parental/link` and
`{ parentUserId, code }`. The response includes `linkId`, minimal parent and
child summaries, and `{ trackingEnabled, historyVisible, sosVisible }`.

| Method | Endpoint | Contract |
| --- | --- | --- |
| GET | `/parental/children?parentUserId=...` | Active child summaries only |
| GET | `/parental/parents?childUserId=...` | Active parent summaries only |
| DELETE | `/parental/links/:id?requesterUserId=...` | Either linked user revokes; `{ revoked: true }` |
| PUT | `/parental/links/:id/controls` | `{ parentUserId, trackingEnabled?, historyVisible?, sosVisible? }` |
| PUT | `/parental/location` | `{ childUserId, latitude, longitude, accuracy?, heading?, speed?, capturedAt? }`; upserts latest only |
| GET | `/parental/children/:childId/location?parentUserId=...` | Linked parent gets latest location, or `location: null` |
| GET | `/parental/children/:childId/sos?parentUserId=...` | Child SOS only if `sosVisible` |
| GET | `/parental/children/:childId/history?parentUserId=...` | Child history only if `historyVisible` |

Settings use canonical `language`, `speechRate` (0.5–2), `autoSpeak`, and
`vibrationEnabled`. Legacy `voiceEnabled` is accepted as an alias and is kept
equal to `autoSpeak` in responses. Use `GET /settings/user/:userId` and
`PUT /settings/user/:userId` (upsert) for a user's preferences.

### MVP limitations

There is deliberately no authentication/JWT system in this hackathon backend.
User IDs in requests are demo-level identification, not production-grade
authorization. Production must add real authentication and authorization before
using family location or SOS features. A web browser/device must submit child
location; background tracking can stop when it is closed, suspended, locked, or
loses location permission. Location writes are rate-limited and only the latest
location per child is stored.
