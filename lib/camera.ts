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

// True only on a touch device that exposes more than one camera, the single
// case where flipping between a front and rear lens is meaningful. Desktops
// with one webcam, and browsers that block device enumeration, report false.
// Call this only after the camera is running, so the labels and device list are
// fully populated by the granted permission.
export async function canFlipCamera(): Promise<boolean> {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  if (!coarsePointer || !navigator.mediaDevices?.enumerateDevices)
    return false;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter((device) => device.kind === "videoinput");
  return cameras.length > 1;
}
