// Shared camera helpers used by every capture surface (the fire monitor and the
// prevention scanner) so lens selection and the "flip camera" affordance behave
// identically across the app.

export type FacingMode = "user" | "environment";

// Translate a getUserMedia failure into copy the operator can act on. The raw
// DOMException message ("Permission denied") reads like an app authorization
// bug, so we map the known camera failures to a clear next step and only fall
// back to a generic message for the unexpected.
function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError")
      return "Camera access is blocked. Allow the camera for this site in your browser settings, then try again.";
    if (error.name === "NotReadableError")
      return "The camera is in use by another app. Close it, then try again.";
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError")
      return "No camera was found on this device.";
  }
  return "Could not access the camera. Check your browser's camera permissions, then try again.";
}

// Request the device camera, preferring the front ("user") or rear
// ("environment") lens. The constraint is non-exact, so a device with a single
// camera (most desktops) still returns that camera rather than failing. Camera
// failures are rethrown with an actionable message so callers can surface it
// directly.
export async function getCameraStream(facingMode: FacingMode): Promise<MediaStream> {
  // getUserMedia is only exposed on a secure (HTTPS or localhost) origin, where
  // navigator.mediaDevices is otherwise undefined.
  if (!navigator.mediaDevices)
    throw new Error("Camera access needs a secure (HTTPS) connection.");
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
  } catch (error) {
    throw new Error(cameraErrorMessage(error));
  }
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
