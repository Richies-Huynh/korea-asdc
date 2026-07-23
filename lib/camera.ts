// Shared camera helpers used by every capture surface (the fire monitor and the
// prevention scanner) so lens selection and the "flip camera" affordance behave
// identically across the app.

export type FacingMode = "user" | "environment";

// Request the device camera, preferring the front ("user") or rear
// ("environment") lens. The constraint is non-exact, so a device with a single
// camera (most desktops) still returns that camera rather than failing.
export function getCameraStream(facingMode: FacingMode): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
}

// The other lens, so a flip control can toggle between front and rear.
export function oppositeFacingMode(facingMode: FacingMode): FacingMode {
  return facingMode === "user" ? "environment" : "user";
}

// True on touch devices, where a front and rear lens are essentially always
// present and flipping between them is meaningful. We deliberately do not gate
// on an enumerateDevices() videoinput count: mobile browsers (iOS Safari, and
// several Android browsers) report a single videoinput even when both lenses
// exist, which would wrongly hide the flip control on exactly the devices that
// need it. A flip that finds no alternate lens simply returns the same camera,
// thanks to the non-exact facingMode constraint, so trusting the touch signal
// never breaks capture. Desktops with a mouse report a fine pointer and false.
export async function canFlipCamera(): Promise<boolean> {
  return window.matchMedia("(pointer: coarse)").matches;
}
