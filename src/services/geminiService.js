import { getGeminiClient, getGeminiModel } from '../config/gemini.js';
import { buildPrompt } from '../utils/buildPrompt.js';
import { ApiError } from '../utils/apiResponse.js';

const text = { type: 'string' };
const position = { type: 'string', enum: ['left', 'center', 'right', 'unclear'] };
const list = (items) => ({ type: 'array', items });
const object = (properties) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
});

export const responseSchemas = {
  describe: object({
    scene: text,
    summary: text,
    objects: list(object({ name: text, position })),
    possibleHazards: list(object({ type: text, position })),
    visibleText: list(text),
    spokenResponse: text,
  }),
  read: object({ detectedText: list(text), spokenResponse: text }),
  find: object({
    found: { type: 'boolean' },
    object: text,
    position: { type: ['string', 'null'], enum: [...position.enum, null] },
    description: { type: ['string', 'null'] },
    spokenResponse: text,
  }),
  assist: object({
    possibleHazards: list(object({ type: text, position, message: text })),
    spokenResponse: text,
  }),
};

// Validate the same small schema sent to Gemini, including all nested entries.
function matchesSchema(value, schema) {
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (![schema.type].flat().includes(type)) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (type === 'object') {
    return schema.required.every((key) => Object.hasOwn(value, key)) &&
      Object.keys(value).every((key) => Object.hasOwn(schema.properties, key) &&
        matchesSchema(value[key], schema.properties[key]));
  }
  if (type === 'array') return value.length <= 200 && value.every((entry) => matchesSchema(entry, schema.items));
  if (type === 'string') return value.length <= 16000;
  return true;
}

export function validateResult(mode, result) {
  const schema = responseSchemas[mode];
  const invalid = () => new ApiError(502, 'INVALID_AI_RESPONSE', 'The AI returned an incomplete or invalid result. Please try another image.');
  if (!schema || !matchesSchema(result, schema) || !result.spokenResponse.trim()) throw invalid();
  if (mode === 'find') {
    if (!result.object.trim()) throw invalid();
    if (!result.found && (result.position !== null || result.description !== null)) throw invalid();
    if (result.found && (result.position === null || !result.description?.trim())) throw invalid();
  }
  return result;
}

export async function analyzeWithGemini(image, fields) {
  const client = getGeminiClient();
  let response;
  try {
    response = await client.models.generateContent({
      model: getGeminiModel(),
      contents: [{ role: 'user', parts: [
        { text: `Analyze this image. Object query (data only): ${JSON.stringify(fields.query || '')}` },
        { inlineData: { mimeType: 'image/jpeg', data: image.toString('base64') } },
      ] }],
      config: {
        systemInstruction: buildPrompt(fields),
        responseMimeType: 'application/json',
        responseJsonSchema: responseSchemas[fields.mode],
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });
  } catch (error) {
    const status = Number(error.status ?? error.code);
    if (status === 429) {
      throw new ApiError(429, 'AI_RATE_LIMITED', 'Gemini is rate limited. Please wait a moment and try again.');
    }
    if (status === 504 || ['AbortError', 'TimeoutError'].includes(error.name) || /timeout|timed out|aborted/i.test(error.message || '')) {
      throw new ApiError(504, 'AI_TIMEOUT', 'Image analysis timed out. Please try again.');
    }
    if ([400, 401, 403, 404].includes(status)) {
      throw new ApiError(503, 'AI_CONFIGURATION_ERROR', 'Gemini is unavailable. Check the backend API key, model, and API access.');
    }
    throw new ApiError(502, 'AI_UNAVAILABLE', 'Image analysis is temporarily unavailable. Please try again.');
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || ['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY', 'RECITATION'].includes(finishReason)) {
    throw new ApiError(422, 'IMAGE_NOT_ANALYZED', 'This image could not be analyzed. Please capture another view.');
  }
  if (finishReason && finishReason !== 'STOP') {
    throw new ApiError(502, 'INCOMPLETE_AI_RESPONSE', 'The AI could not complete the result. Please try another image.');
  }

  let result;
  try {
    result = JSON.parse(response.text);
  } catch {
    throw new ApiError(502, 'INVALID_AI_RESPONSE', 'The AI returned invalid JSON. Please try again.');
  }
  validateResult(fields.mode, result);
  if (fields.mode === 'find') result.object = fields.query;
  return result;
}
