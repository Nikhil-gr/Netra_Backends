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
| `GEMINI_MODEL` | `gemini-2.5-flash-lite`; must support image input and structured JSON |
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
fails, correct the URI/start MongoDB and restart the API. There is no auth or
user model: history is shared by all clients of this hackathon backend.

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
