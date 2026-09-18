export const MANEUVERS = Object.freeze([
  "straight",
  "slight_left",
  "left",
  "sharp_left",
  "slight_right",
  "right",
  "sharp_right",
  "u_turn",
  "arrive",
  "unknown",
]);

// OpenRouteService's numeric step "type" codes, mapped to our small
// frontend-facing maneuver set. Roundabout enter/exit (7, 8) have no
// honest single-word equivalent here, so they normalize to "unknown"
// rather than guessing straight/left/right.
const ORS_TYPE_TO_MANEUVER = {
  0: "left",
  1: "right",
  2: "sharp_left",
  3: "sharp_right",
  4: "slight_left",
  5: "slight_right",
  6: "straight",
  7: "unknown",
  8: "unknown",
  9: "u_turn",
  10: "arrive",
  11: "straight",
  12: "slight_left",
  13: "slight_right",
};

export function normalizeManeuver(orsType) {
  return ORS_TYPE_TO_MANEUVER[orsType] ?? "unknown";
}

const MANEUVER_PHRASES = {
  straight: "Continue straight",
  slight_left: "Bear slightly left",
  left: "Turn left",
  sharp_left: "Make a sharp left turn",
  slight_right: "Bear slightly right",
  right: "Turn right",
  sharp_right: "Make a sharp right turn",
  u_turn: "Make a U-turn",
  arrive: "The destination is ahead",
  unknown: "Continue along the route",
};

const UNNAMED_ROAD = /^-?$|unnamed/i;

// Builds instruction text from a fixed template per maneuver so the
// wording is always a route-shape fact ("turns right ahead"), never a
// pedestrian-safety claim ("it's safe to cross") - the route only knows
// where it goes, not what's currently happening around the user.
export function buildInstruction(maneuver, roadName) {
  const phrase = MANEUVER_PHRASES[maneuver] ?? MANEUVER_PHRASES.unknown;
  if (maneuver === "arrive") return `${phrase}.`;
  const trimmedRoad = typeof roadName === "string" ? roadName.trim() : "";
  const hasRoadName = trimmedRoad && !UNNAMED_ROAD.test(trimmedRoad);
  return hasRoadName ? `${phrase} onto ${trimmedRoad}.` : `${phrase}.`;
}
