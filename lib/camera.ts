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
// ("environment") lens. By default the constraint is non-exact, so a device
// with a single camera (most desktops) still returns that camera rather than
// failing. Pass exact to demand the given lens, which forces the browser to
// actually switch on a phone rather than possibly handing back the same camera.
// Camera failures are rethrown with an actionable message so callers can
// surface it directly.
export async function getCameraStream(facingMode: FacingMode, exact = false): Promise<MediaStream> {
  // getUserMedia is only exposed on a secure (HTTPS or localhost) origin, where
  // navigator.mediaDevices is otherwise undefined.
  if (!navigator.mediaDevices)
    throw new Error("Camera access needs a secure (HTTPS) connection.");
  try {
    const facingConstraint = exact ? { exact: facingMode } : facingMode;
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingConstraint }, audio: false });
  } catch (error) {
    throw new Error(cameraErrorMessage(error));
  }
}

// Request one specific camera by its deviceId. Used to cycle between the several
// cameras a laptop or desktop exposes (a built-in webcam plus one or more USB
// cameras), which facingMode cannot tell apart.
export function getCameraStreamByDeviceId(deviceId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } }, audio: false });
}

// The other lens, so a flip control can toggle between front and rear.
export function oppositeFacingMode(facingMode: FacingMode): FacingMode {
  return facingMode === "user" ? "environment" : "user";
}

// Every camera this browser exposes. Labels and deviceIds are only populated
// once camera permission has been granted, so this is meaningful while a capture
// is already running.
export async function getVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

// Whether a flip should switch the front/rear lens via facingMode rather than
// cycle through deviceIds. True on touch devices (coarse pointer) — phones and
// tablets — where a "flip" means the front/rear lens and facingMode expresses
// that directly and reliably. It stays true even though modern mobile browsers
// now expose each lens as its own deviceId: cycling those ids is unreliable
// there because a track's reported deviceId often does not match any id from
// enumerateDevices (notably iOS Safari), so the cycle lands back on the same
// lens and the flip appears to do nothing. Everything else (laptops, desktops)
// has no meaningful facingMode and flips by cycling deviceIds instead.
function prefersFacingModeFlip(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

// Whether a flip control would do anything on this device. Touch devices always
// can (front/rear lens). Everything else is flippable only when it actually
// exposes two or more cameras to switch between.
export async function canFlipCamera(): Promise<boolean> {
  if (prefersFacingModeFlip())
    return true;
  const videoInputs = await getVideoInputDevices();
  return videoInputs.length > 1;
}

// Open the "next" camera relative to the one currently in use. On touch devices
// we toggle the facingMode, switching between the front and rear lens; the
// switch is requested as exact so the browser actually changes lens rather than
// possibly returning the same one, falling back to a non-exact request if that
// lens cannot be opened. On everything else we cycle to the next deviceId
// (wrapping around), the only way to switch between webcams that share a
// facingMode. The returned facingMode reflects the new lens so a caller tracking
// it stays accurate.
export async function getFlippedCameraStream(
  current: MediaStream,
  facingMode: FacingMode,
): Promise<{ stream: MediaStream; facingMode: FacingMode }> {
  if (prefersFacingModeFlip()) {
    const next = oppositeFacingMode(facingMode);
    try {
      return { stream: await getCameraStream(next, true), facingMode: next };
    } catch {
      return { stream: await getCameraStream(next), facingMode: next };
    }
  }
  const videoInputs = await getVideoInputDevices();
  const currentDeviceId = current.getVideoTracks()[0]?.getSettings().deviceId;
  const currentIndex = videoInputs.findIndex((device) => device.deviceId === currentDeviceId);
  const next = videoInputs[(currentIndex + 1) % videoInputs.length];
  return { stream: await getCameraStreamByDeviceId(next.deviceId), facingMode };
}
