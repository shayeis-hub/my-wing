"use client";
import Link from "next/link";
import { posts } from "@/lib/blog/posts";
import { Clock, Tag } from "lucide-react";
import { PublicAdBanner } from "@/components/ads/PublicAdBanner";

const CATEGORY_COLORS: Record<string, string> = {
  מוטיבציה: "#ff6b47",
  תזונה: "#4caf96",
  כושר: "#5b8dee",
  טכנולוגיה: "#9c6fde",
};

export default function BlogPage() {
  return (
    <main className="min-h-screen" style={{ background: "#fbf4e6" }}>
      {/* Nav */}
      <PublicNav />

      {/* Hero */}
      <section className="px-6 py-14 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-3" style={{ color: "#1a1814" }}>
          בלוג Wingpact
        </h1>
        <p className="text-lg" style={{ color: "#6b5e4e" }}>
          מדע, טיפים ומוטיבציה לדרך לעבר המשקל שלך
        </p>
      </section>

      {/* Ad banner */}
      <div className="max-w-5xl mx-auto px-6 mb-2">
        <PublicAdBanner className="rounded-xl overflow-hidden" />
      </div>

      {/* Posts grid */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const catColor = CATEGORY_COLORS[post.category] ?? "#f5dd4b";
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Color band */}
                <div
                  className="h-2"
                  style={{ background: `linear-gradient(90deg, #f5dd4b, ${catColor})` }}
                />
                <div className="p-5 flex flex-col flex-1">
                  {/* Category */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <Tag size={12} style={{ color: catColor }} />
                    <span className="text-xs font-semibold" style={{ color: catColor }}>
                      {post.category}
                    </span>
                  </div>

                  <h2
                    className="font-bold text-lg leading-snug mb-2 group-hover:underline"
                    style={{ color: "#1a1814" }}
                  >
                    {post.title}
                  </h2>
                  <p className="text-sm flex-1 mb-4" style={{ color: "#6b5e4e" }}>
                    {post.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs" style={{ color: "#9e8e7e" }}>
                    <span>{new Date(post.date).toLocaleDateString("he-IL")}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {post.readingTime} דק׳ קריאה
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function PublicNav() {
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
      style={{ background: "#fbf4e6", borderColor: "#e8dcc8" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <WingLogoSmall />
        <span className="font-bold text-lg" style={{ color: "#1a1814" }}>
          Wingpact
        </span>
      </Link>
      <div className="flex items-center gap-5 text-sm font-medium" style={{ color: "#6b5e4e" }}>
        <Link href="/blog" className="hover:text-[#ff6b47] transition-colors">
          בלוג
        </Link>
        <Link href="/calorie-calculator" className="hover:text-[#ff6b47] transition-colors">
          מחשבון
        </Link>
        <Link href="/faq" className="hover:text-[#ff6b47] transition-colors">
          שאלות נפוצות
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-1.5 rounded-full text-white text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
        >
          התחל עכשיו
        </Link>
      </div>
    </nav>
  );
}

function WingLogoSmall() {
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="wg-b" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5dd4b" />
          <stop offset="1" stopColor="#ff6b47" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="48" ry="48" fill="url(#wg-b)" />
      <path
        d="M50 75 C30 60 15 45 20 30 C25 15 40 20 50 35 C60 20 75 15 80 30 C85 45 70 60 50 75Z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}
