import { NextRequest, NextResponse } from "next/server";
import { admin, getAdminApp } from "@/lib/firebase/admin";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

interface ContactPayload {
  name: string;
  email: string;
  subject: "bug" | "idea" | "other";
  message: string;
  userId?: string;
}

const SUBJECT_LABELS: Record<ContactPayload["subject"], string> = {
  bug: "🐛 דיווח על תקלה",
  idea: "💡 רעיון / פיצ׳ר",
  other: "✉️ פנייה כללית",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactPayload;
    if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!["bug", "idea", "other"].includes(body.subject)) {
      return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    }

    const name = body.name.trim();
    const email = body.email.trim();
    const message = body.message.trim();
    const subjectKey = body.subject;
    const subjectLabel = SUBJECT_LABELS[subjectKey];

    // 1) Persist to Firestore as audit log (so we never lose a submission even if email fails)
    getAdminApp();
    const db = admin.firestore();
    await db.collection("contact_submissions").add({
      name,
      email,
      subject: subjectKey,
      message,
      userId: body.userId ?? null,
      createdAt: new Date().toISOString(),
      status: "new",
    });

    // 2) Send the email
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL;
    const fromEmail = process.env.CONTACT_FROM_EMAIL || "Wingpact <onboarding@resend.dev>";

    if (!apiKey || !toEmail) {
      console.error("Contact form: missing RESEND_API_KEY or CONTACT_TO_EMAIL env var");
      // Still return success — submission is in Firestore
      return NextResponse.json({ ok: true, emailed: false });
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: `[Wingpact] ${subjectLabel} — ${name}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1814; border-bottom: 2px solid #ff6b47; padding-bottom: 8px;">
            ${escapeHtml(subjectLabel)}
          </h2>
          <table style="width: 100%; margin: 16px 0;">
            <tr><td style="padding: 4px 8px; color: #8a7e68;"><b>שם:</b></td><td>${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 4px 8px; color: #8a7e68;"><b>מייל:</b></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
            ${body.userId ? `<tr><td style="padding: 4px 8px; color: #8a7e68;"><b>User ID:</b></td><td style="font-family: monospace; font-size: 12px;">${escapeHtml(body.userId)}</td></tr>` : ""}
          </table>
          <div style="background: #fbf4e6; padding: 16px; border-radius: 12px; white-space: pre-wrap; line-height: 1.6; color: #1a1814;">
${escapeHtml(message)}
          </div>
          <p style="color: #8a7e68; font-size: 12px; margin-top: 24px;">
            לענות — פשוט תלחץ Reply, התשובה תלך ל-${escapeHtml(email)}.
          </p>
        </div>
      `.trim(),
      text: `${subjectLabel}\n\nשם: ${name}\nמייל: ${email}\n${body.userId ? `User ID: ${body.userId}\n` : ""}\n${message}`,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ ok: true, emailed: false });
    }

    console.log("Contact email sent:", data?.id);
    return NextResponse.json({ ok: true, emailed: true });
  } catch (err) {
    console.error("Contact submission error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
