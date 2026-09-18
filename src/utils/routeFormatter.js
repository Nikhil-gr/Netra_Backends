/**
 * Format route data into SAFEPath accessibility standard response format.
 * Optimizes instructions for screen readers, voice navigation, and visually impaired users.
 *
 * @param {Object} start - Start location {name, latitude, longitude}
 * @param {Object} destination - Destination location {name, latitude, longitude}
 * @param {Object} routeData - Route data {distance, duration, steps}
 * @returns {Object} Formatted route response
 */
export function formatRouteResponse(start, destination, routeData) {
  const formattedSteps = formatStepsForAccessibility(routeData.steps);

  return {
    start: {
      name: sanitizeText(start.name),
      latitude: start.latitude,
      longitude: start.longitude,
    },
    destination: {
      name: sanitizeText(destination.name),
      latitude: destination.latitude,
      longitude: destination.longitude,
    },
    route: {
      distance: {
        rawMeters: routeData.distance,
        readable: formatDistance(routeData.distance),
      },
      duration: {
        rawSeconds: routeData.duration,
        readable: formatDuration(routeData.duration),
      },
      totalSteps: formattedSteps.length,
      steps: formattedSteps,
    },
  };
}

/**
 * Clean, merge micro-turns, and optimize instruction steps for blind users.
 *
 * @param {Array} rawSteps - Raw steps from routing API
 * @returns {Array} Accessibility-friendly steps
 */
function formatStepsForAccessibility(rawSteps) {
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) return [];

  const processedSteps = [];

  for (let i = 0; i < rawSteps.length; i++) {
    const rawStep = rawSteps[i];
    const prevStep = processedSteps[processedSteps.length - 1];

    let instruction = cleanInstruction(
      rawStep.instruction || "",
      i === 0,
      i === rawSteps.length - 1,
    );

    // Normalize non-Latin scripts (e.g. Devanagari) to readable Romanized text for TTS screen readers
    instruction = sanitizeText(instruction);

    const stepObj = {
      stepNumber: processedSteps.length + 1,
      instruction,
      latitude: Number(rawStep.latitude),
      longitude: Number(rawStep.longitude),
    };

    // Filter out invalid coordinates
    if (!instruction || isNaN(stepObj.latitude) || isNaN(stepObj.longitude)) {
      continue;
    }

    // DEDUPLICATION: Merge identical consecutive instructions (e.g. repeated micro-turns)
    if (
      prevStep &&
      prevStep.instruction.toLowerCase() === stepObj.instruction.toLowerCase()
    ) {
      continue;
    }

    processedSteps.push(stepObj);
  }

  // Re-index step numbers sequentially after filtering
  return processedSteps.map((step, idx) => ({
    ...step,
    stepNumber: idx + 1,
  }));
}

/**
 * Clean and simplify routing instructions for accessible voice navigation.
 *
 * @param {string} instruction - Raw instruction from routing provider
 * @param {boolean} isFirst - Is this the first step of the route
 * @param {boolean} isLast - Is this the destination step
 * @returns {string} Voice-ready instruction
 */
function cleanInstruction(instruction, isFirst = false, isLast = false) {
  if (typeof instruction !== "string") return "";

  // 1. Strip HTML tags and entities
  let cleaned = instruction
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  if (!cleaned) return "";

  // 2. First and Last step formatting
  if (isFirst) {
    if (/^north/i.test(cleaned)) return "Head north to start your walk";
    if (/^south/i.test(cleaned)) return "Head south to start your walk";
    if (/^east/i.test(cleaned)) return "Head east to start your walk";
    if (/^west/i.test(cleaned)) return "Head west to start your walk";
    return `Start walking by heading ${cleaned}`;
  }

  if (isLast || /arrive|destination/i.test(cleaned)) {
    return "You have reached your destination.";
  }

  // 3. Clear, action-oriented voice mappings for blind navigation
  // Converts vague terms into spatial cues
  cleaned = cleaned
    .replace(/^sharp right/i, "Make a sharp right turn")
    .replace(/^right/i, "Turn right")
    .replace(/^slight right/i, "Bear slightly right")
    .replace(/^sharp left/i, "Make a sharp left turn")
    .replace(/^left/i, "Turn left")
    .replace(/^slight left/i, "Bear slightly left")
    .replace(/^keep right/i, "Stay on the right side")
    .replace(/^keep left/i, "Stay on the left side")
    .replace(/^straight/i, "Continue walking straight");

  // Fix sentence casing if instruction starts with lowercase (e.g., "onto Ring Road")
  if (/^[a-z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Ensure every step starts with an explicit directional action verb
  if (
    !/^(Turn|Make|Bear|Stay|Continue|Head|Walk|Follow|Cross|You)/i.test(cleaned)
  ) {
    cleaned = `Turn ${cleaned.toLowerCase()}`;
  }

  return cleaned;
}

/**
 * Sanitizes local scripts (like Devanagari) and replaces them with Romanized text
 * so Text-To-Speech systems do not crash or skip words.
 */
function sanitizeText(text) {
  if (typeof text !== "string") return "";

  return (
    text
      // Common localized street mappings for Nepal/Kathmandu area
      .replace(/गुहेश्वरी मार्ग/g, "Guhyeshwari Marg")
      .replace(/उमाकुण्ड मार्ग/g, "Umakunda Marg")
      // Fallback cleanup for non-ASCII noise
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Human-readable distance formatter (e.g., 3831m -> "3.8 km" or "450 meters")
 */
function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} meters`;
}

/**
 * Human-readable duration formatter (e.g., 2758s -> "46 mins")
 */
function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} hr ${remainingMins} mins`;
  }
  return `${minutes} mins`;
}
