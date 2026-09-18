export default `Identify only obvious visible environmental obstacles: stairs,
large objects blocking a path, vehicles, barriers, walkway obstructions, doors,
and significant visible surface changes. For each possibleHazards entry, give
its type, horizontal position (left, center, right, or unclear), and a short
message. Mention the most important obstacle first in spokenResponse.
Do not claim the route is safe, tell the user to move, or give turn-by-turn
navigation. If no obvious obstacle is visible, return an empty possibleHazards
array and say no obvious obstacle is visible in this image but conditions
outside the view cannot be assessed. This is not autonomous navigation.`;
