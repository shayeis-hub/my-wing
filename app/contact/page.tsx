import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-wing-bg p-6 flex flex-col items-center justify-center" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <Link href="/login" className="text-wing-primary text-sm">← חזרה</Link>
        </div>

        <div className="text-center space-y-2">
          <div className="text-5xl">✉️</div>
          <h1 className="text-2xl font-bold text-slate-800">צור קשר</h1>
          <p className="text-slate-500 text-sm">נשמח לשמוע ממך — שאלות, הצעות או בעיות</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">שלח לנו מייל ישירות:</p>
            <a
              href="mailto:shayeis@gmail.com?subject=Wingpact - פנייה"
              className="block w-full py-3 bg-wing-primary text-white rounded-2xl font-medium text-center hover:bg-sky-600 transition-colors"
            >
              shayeis@gmail.com
            </a>
          </div>

          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-400">נחזור אליך בהקדם האפשרי</p>
          </div>
        </div>
      </div>
    </div>
  );
}
