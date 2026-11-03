// Scene motion and the opening controller share these shot boundaries.
// Give the coach a slower, readable entrance. The camera still starts ahead
// of the vehicle, so the first beat remains a quiet road before the bus eases
// into the frame and reveals the temple.
// Give the establishing shot time to show the coach leaving the lower
// mountain road and climbing the full surveyed route to the temple apron.
// The previous 14-second cut began near the top of the road and read as a
// teleport into the forecourt.
// Let the arrival coach take a slower, calmer pass through the mountain road.
// The camera uses this same clock, so its elevated pull-in also reads more
// slowly instead of racing toward the gate at the end of the opening.
export const OPENING_ROAD_DURATION_MS = 36_000;
export const OPENING_ALIGHTING_DURATION_MS = 9_000;
export const DEPARTURE_ROAD_DURATION_MS = 10_000;

// Authored first-person travel shots. Keep the scene transition clock and the
// character walk clock on the same values so the cut happens after the group
// has finished walking and the camera has had time to show the route.
// The gate-to-registration procession is deliberately unhurried so the
// followers have time to settle into a loose group around Lu Chen.
export const CORRIDOR_TRAVEL_REGISTER_SECONDS = 14.4;
export const CORRIDOR_TRAVEL_REFECTORY_SECONDS = 9.3;
export const CORRIDOR_TRAVEL_RETURN_SECONDS = 9.0;
export const CORRIDOR_TRAVEL_LISTEN_SECONDS = 9.0;
export const HALL_TRAVEL_SECONDS = 11.4;
