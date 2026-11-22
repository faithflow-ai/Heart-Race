/**
 * Email sending through Resend (resend.com, free tier). Turned on by setting
 * RESEND_API_KEY and EMAIL_FROM in Vercel. Without them, features that need
 * email (Forgot password) stay hidden.
 */
export const emailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

export async function sendEmail(to: string, subject: string, text: string) {
  if (!emailEnabled()) throw new Error("Email is not set up.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
  });
  if (!res.ok) throw new Error(`Email failed (${res.status}): ${await res.text()}`);
}
