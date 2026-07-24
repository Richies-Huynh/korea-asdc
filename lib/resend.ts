import { Resend } from "resend";
import { Detection, Monitor } from "@/lib/types";

export async function sendFireAlert(
  monitor: Monitor,
  detection: Detection,
  imageBuffer: Buffer,
): Promise<void> {
  const from = process.env.FIRE_ALERT_FROM;
  const to = process.env.FIRE_ALERT_RECIPIENT;
  if (!from || !to)
    throw new Error("FIRE_ALERT_FROM and FIRE_ALERT_RECIPIENT must be set");

  const resend = new Resend(process.env.RESEND_API_KEY);

  const detectedAt = new Date(detection.detected_at).toLocaleString();
  const confidence = Math.round(detection.confidence * 100);
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #b91c1c;">Fire Detected</h2>
      <p>A fire monitor has detected a probable fire. Contact your local fire authorities immediately.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Monitor</td><td style="padding: 4px 0;"><strong>${monitor.name}</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Detected At</td><td style="padding: 4px 0;">${detectedAt}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Confidence</td><td style="padding: 4px 0;">${confidence}%</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Method</td><td style="padding: 4px 0;">${detection.method}</td></tr>
      </table>
      <p style="color: #6b7280;">Proof frame captured at the moment of detection:</p>
      <img src="cid:fire-frame" alt="Captured frame showing the detected fire" style="max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This alert was generated automatically by Firewatch. Please verify and escalate to emergency services.</p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Fire Detected on ${monitor.name}`,
    html,
    attachments: [
      {
        filename: `fire-${monitor.id}-${detection.detected_at}.jpg`,
        content: imageBuffer.toString("base64"),
        contentId: "fire-frame",
      },
    ],
  });

  if (error)
    throw new Error(`Resend failed to send the fire alert: ${error.message}`);
}
