import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret, provisionFitDadUser, type FitDadRowInput } from "@/lib/fitDadAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = requireAdminSecret(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { name, email, phone, plan, wingId, createdBy } = body as FitDadRowInput & { createdBy?: string };
    if (!createdBy?.trim()) {
      return NextResponse.json({ error: "MISSING_CREATED_BY" }, { status: 400 });
    }

    const { uid, wingId: assignedWingId, password } = await provisionFitDadUser(
      { name, email, phone, plan, wingId },
      createdBy.trim()
    );

    // For the rep to send the new customer their login info themselves —
    // wa.me only opens a compose window, it can't send automatically (that
    // needs the WhatsApp Business API, out of scope for now).
    const message = `שלום ${name}! נוצר לך חשבון באפליקציית מבנה כנף. התחברות: ${email} / הסיסמה היא מספר הטלפון שלך (${password}) — מומלץ להחליף אותה בכניסה הראשונה.`;
    const whatsappUrl = `https://wa.me/${password}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({ uid, wingId: assignedWingId, whatsappUrl });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code) return NextResponse.json({ error: code }, { status: code === "EMAIL_EXISTS" ? 409 : 400 });
    const msg = err instanceof Error ? err.message : String(err);
    console.error("fitdad create-user error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
