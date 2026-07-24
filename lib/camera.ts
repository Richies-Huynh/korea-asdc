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

// Whether a flip control would do anything on this device. Touch devices (coarse
// pointer) are always treated as flippable: mobile browsers (iOS Safari, and
// several Android browsers) report a single videoinput even when both a front
// and rear lens exist, so gating them on a device count would wrongly hide the
// control on exactly the devices that need it. There a flip falls back to
// toggling facingMode. Everything else (laptops, desktops) is flippable only
// when it actually exposes two or more cameras to switch between.
export async function canFlipCamera(): Promise<boolean> {
  if (window.matchMedia("(pointer: coarse)").matches)
    return true;
  const videoInputs = await getVideoInputDevices();
  return videoInputs.length > 1;
}

// Open the "next" camera relative to the one currently in use. On devices that
// expose more than one camera we cycle to the next deviceId (wrapping around),
// which is the only way to switch between two webcams that share a facingMode.
// On devices that report a single videoinput (typically mobile) we toggle the
// facingMode instead, switching between the front and rear lens. The returned
// facingMode reflects the new lens so a caller tracking it stays accurate.
export async function getFlippedCameraStream(
  current: MediaStream,
  facingMode: FacingMode,
): Promise<{ stream: MediaStream; facingMode: FacingMode }> {
  const videoInputs = await getVideoInputDevices();
  if (videoInputs.length > 1) {
    const currentDeviceId = current.getVideoTracks()[0]?.getSettings().deviceId;
    const currentIndex = videoInputs.findIndex((device) => device.deviceId === currentDeviceId);
    const next = videoInputs[(currentIndex + 1) % videoInputs.length];
    return { stream: await getCameraStreamByDeviceId(next.deviceId), facingMode };
  }
  const next = oppositeFacingMode(facingMode);
  return { stream: await getCameraStream(next), facingMode: next };
}
