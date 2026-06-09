import { notFound } from "next/navigation";
import Link from "next/link";
import { getPost, getAllSlugs, posts } from "@/lib/blog/posts";
import { Clock, Tag, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Wingpact`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  מוטיבציה: "#ff6b47",
  תזונה: "#4caf96",
  כושר: "#5b8dee",
  טכנולוגיה: "#9c6fde",
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const catColor = CATEGORY_COLORS[post.category] ?? "#f5dd4b";

  // Related posts (same category, excluding current)
  const related = posts
    .filter((p) => p.slug !== slug && p.category === post.category)
    .slice(0, 2);

  return (
    <main className="min-h-screen" style={{ background: "#fbf4e6" }}>
      <PublicNav />

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-6 pt-6 text-sm flex items-center gap-1" style={{ color: "#9e8e7e" }}>
        <Link href="/" className="hover:text-[#ff6b47] transition-colors">
          בית
        </Link>
        <ChevronRight size={14} />
        <Link href="/blog" className="hover:text-[#ff6b47] transition-colors">
          בלוג
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: "#6b5e4e" }}>{post.title}</span>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-6 py-8">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${catColor}22`, color: catColor }}
          >
            <Tag size={11} />
            {post.category}
          </span>
          <span className="text-xs flex items-center gap-1" style={{ color: "#9e8e7e" }}>
            <Clock size={11} />
            {post.readingTime} דק׳ קריאה
          </span>
          <span className="text-xs" style={{ color: "#9e8e7e" }}>
            {new Date(post.date).toLocaleDateString("he-IL")}
          </span>
        </div>

        <h1 className="text-3xl font-bold leading-tight mb-4" style={{ color: "#1a1814" }}>
          {post.title}
        </h1>
        <p className="text-lg mb-8" style={{ color: "#6b5e4e" }}>
          {post.description}
        </p>

        {/* Divider */}
        <div
          className="h-1 rounded-full mb-8"
          style={{ background: `linear-gradient(90deg, #f5dd4b, ${catColor})` }}
        />

        {/* Content */}
        <div
          className="prose prose-lg max-w-none"
          style={{ color: "#1a1814" }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div
          className="mt-12 p-6 rounded-2xl text-center"
          style={{ background: "linear-gradient(135deg, #fff9e6, #fff0e6)" }}
        >
          <p className="font-bold text-xl mb-2" style={{ color: "#1a1814" }}>
            מוכן להתחיל את המסע?
          </p>
          <p className="text-sm mb-4" style={{ color: "#6b5e4e" }}>
            הצטרף לאלפי אנשים שמורידים משקל יחד עם Wingpact
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-8 py-3 rounded-full text-white font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, #f5dd4b, #ff6b47)" }}
          >
            הצטרף בחינם
          </Link>
        </div>
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 pb-20">
          <h2 className="text-xl font-bold mb-5" style={{ color: "#1a1814" }}>
            מאמרים נוספים
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="group bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <p
                  className="font-bold mb-1 group-hover:underline"
                  style={{ color: "#1a1814" }}
                >
                  {r.title}
                </p>
                <p className="text-sm line-clamp-2" style={{ color: "#6b5e4e" }}>
                  {r.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
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
        <Link href="/calculator" className="hover:text-[#ff6b47] transition-colors">
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
        <linearGradient id="wg-c" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5dd4b" />
          <stop offset="1" stopColor="#ff6b47" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="48" ry="48" fill="url(#wg-c)" />
      <path
        d="M50 75 C30 60 15 45 20 30 C25 15 40 20 50 35 C60 20 75 15 80 30 C85 45 70 60 50 75Z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}
