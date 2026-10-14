import type { Metadata } from "next";
import Image from "next/image";
import { AppleBadge, GooglePlayBadge, WingLogo } from "./shared";

export const metadata: Metadata = {
  title: "Wingpact Book Mode — One Habit at a Time companion",
  description:
    "The companion app for One Habit at a Time. Redeem your code, install one habit at a time, and track it with daily check-ins and AI meal analysis.",
};

export default function OneHabitLanding() {
  return (
    <div dir="ltr" className="bg-wing-bg text-wing-ink min-h-screen">
      {/* Nav */}
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <WingLogo size={30} />
          <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-wing-muted">
            Wingpact &middot; Book Mode
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a href="/he" className="text-sm font-medium text-wing-muted hover:text-wing-ink transition-colors">
            עברית
          </a>
          <a href="https://wingpact.app" className="hidden sm:inline text-sm font-medium text-wing-muted hover:text-wing-ink transition-colors">
            wingpact.app &rarr;
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-10 pb-20 text-center">
        <h1 className="font-black text-[clamp(38px,7vw,64px)] leading-[0.95] tracking-tight mb-6">
          One habit.
          <br />
          <span className="bg-gradient-to-r from-wing-honey to-wing-heat bg-clip-text text-transparent">
            One at a time.
          </span>
        </h1>
        <p className="text-lg leading-relaxed text-wing-ink/70 max-w-xl mx-auto mb-10">
          The free companion app for <em>One Habit at a Time</em>. Redeem the code
          from your book, and turn each of the 8 habits into a daily practice &mdash;
          with check-ins, AI meal analysis, and no trial clock on Habit One.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
          <AppleBadge />
          <GooglePlayBadge />
        </div>
        <p className="text-xs text-wing-muted">Free through Habit One &middot; no credit card needed to start</p>
      </section>

      {/* Habits screenshot showcase */}
      <section className="max-w-4xl mx-auto px-6 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-wing-heat mb-3">How it works</div>
          <h2 className="font-black text-3xl leading-tight mb-5">
            Not another habit tracker.
            <br />
            The book&apos;s own method, in your pocket.
          </h2>
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wing-sunrise to-wing-coral flex items-center justify-center font-black text-sm flex-shrink-0">1</div>
              <div>
                <p className="font-bold mb-0.5">Your current habit, front and center</p>
                <p className="text-sm text-wing-ink/65 leading-relaxed">Cue, routine, reward, and your own trigger sentence &mdash; the exact way the book teaches it.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wing-sunrise to-wing-coral flex items-center justify-center font-black text-sm flex-shrink-0">2</div>
              <div>
                <p className="font-bold mb-0.5">The book&apos;s own answers, when you need them</p>
                <p className="text-sm text-wing-ink/65 leading-relaxed">&ldquo;What you&apos;re probably thinking&rdquo; and hard-situation tips for the habit you&apos;re actually on.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wing-sunrise to-wing-coral flex items-center justify-center font-black text-sm flex-shrink-0">3</div>
              <div>
                <p className="font-bold mb-0.5">Mark it installed, unlock the next</p>
                <p className="text-sm text-wing-ink/65 leading-relaxed">No rush &mdash; the book&apos;s own benchmark is a median of 66 days, not a deadline.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="rounded-[2rem] border-[6px] border-wing-ink overflow-hidden shadow-2xl max-w-[280px]">
            <Image src="/onehabit/habits.jpg" alt="The Habits tab, showing Habit 1: Water Before Food" width={720} height={1559} className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* More screenshots */}
      <section className="bg-wing-surface border-y border-wing-border py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-wing-heat mb-3 text-center">Day to day</div>
          <h2 className="font-black text-3xl text-center mb-10">Simple tools, built around the habit</h2>
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="rounded-2xl border-[5px] border-wing-ink overflow-hidden shadow-xl">
              <Image src="/onehabit/dashboard.jpg" alt="Home dashboard" width={720} height={1559} className="w-full h-auto" />
            </div>
            <div className="rounded-2xl border-[5px] border-wing-ink overflow-hidden shadow-xl mt-8">
              <Image src="/onehabit/meals.jpg" alt="Meal photo logging" width={720} height={1559} className="w-full h-auto" />
            </div>
            <div className="rounded-2xl border-[5px] border-wing-ink overflow-hidden shadow-xl">
              <Image src="/onehabit/wing.jpg" alt="Your wing, up to 2 friends free" width={720} height={1559} className="w-full h-auto" />
            </div>
          </div>
          <p className="text-center text-sm text-wing-muted mt-8 max-w-md mx-auto">
            A 2-minute daily check-in, a photo of your plate for instant AI analysis,
            and up to 2 friends riding free on your subscription once you&apos;re in.
          </p>
        </div>
      </section>

      {/* Redeem steps */}
      <section id="redeem" className="max-w-3xl mx-auto px-6 py-20">
        <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-wing-heat mb-3 text-center">Get started</div>
        <h2 className="font-black text-3xl text-center mb-12">Three steps, from the last page of your book</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-wing-surface border border-wing-border rounded-2xl p-6">
            <div className="w-9 h-9 rounded-full bg-wing-ink text-wing-bg flex items-center justify-center font-black mb-4">1</div>
            <p className="font-bold mb-1.5">Download Wingpact</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">From the App Store or Google Play above. Sign up with email or Google &mdash; same login as any Wingpact user.</p>
          </div>
          <div className="bg-wing-surface border border-wing-border rounded-2xl p-6">
            <div className="w-9 h-9 rounded-full bg-wing-ink text-wing-bg flex items-center justify-center font-black mb-4">2</div>
            <p className="font-bold mb-1.5">Enter your code</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">
              The code printed in <em>One Habit at a Time</em> unlocks Book Mode on your account instantly.
            </p>
          </div>
          <div className="bg-wing-surface border border-wing-border rounded-2xl p-6">
            <div className="w-9 h-9 rounded-full bg-wing-ink text-wing-bg flex items-center justify-center font-black mb-4">3</div>
            <p className="font-bold mb-1.5">Start Habit One</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">Free for as long as you need it. No trial clock, no card required.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-wing-surface border-y border-wing-border py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-wing-heat mb-3 text-center">Membership</div>
          <h2 className="font-black text-3xl text-center mb-3">Free habit one. Simple after that.</h2>
          <p className="text-center text-wing-ink/65 max-w-lg mx-auto mb-12">
            Once you&apos;ve marked Habit One installed and move on to Habit Two, keep
            the rest of the method unlocked &mdash; and invite up to 2 friends free.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 max-w-xl mx-auto">
            <div className="bg-wing-bg border-2 border-wing-heat rounded-2xl p-7 relative">
              <div className="absolute -top-3 right-6 bg-wing-heat text-white text-xs font-bold px-3 py-1 rounded-full">
                Save 17%
              </div>
              <p className="font-bold text-wing-ink/70 mb-1">Yearly</p>
              <p className="font-black text-4xl mb-1">$79</p>
              <p className="text-sm text-wing-muted">per year</p>
            </div>
            <div className="bg-wing-bg border border-wing-border rounded-2xl p-7">
              <p className="font-bold text-wing-ink/70 mb-1">Monthly</p>
              <p className="font-black text-4xl mb-1">$7.90</p>
              <p className="text-sm text-wing-muted">per month</p>
            </div>
          </div>
          <div className="flex justify-center mt-10">
            <div className="rounded-2xl border-[5px] border-wing-ink overflow-hidden shadow-xl max-w-[220px]">
              <Image src="/onehabit/subscription.jpg" alt="Book Mode subscription screen" width={720} height={1559} className="w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 py-20">
        <h2 className="font-black text-3xl text-center mb-10">Questions</h2>
        <div className="space-y-6">
          <div>
            <p className="font-bold mb-1">Do I have to finish Habit One by a deadline?</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">No &mdash; take as long as the book recommends (median 66 days, range 18&ndash;254) before marking it installed.</p>
          </div>
          <div>
            <p className="font-bold mb-1">I&apos;m already a Wingpact user &mdash; can I redeem a code?</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">Yes. From Settings, look for &ldquo;I have a code from the book&rdquo; &mdash; it adds Book Mode to your existing account, no new signup.</p>
          </div>
          <div>
            <p className="font-bold mb-1">Does it use pounds or kilograms?</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">Pounds and feet/inches in English, matching how the book talks about your body. The Hebrew edition uses kilograms and centimeters.</p>
          </div>
          <div>
            <p className="font-bold mb-1">What about Android?</p>
            <p className="text-sm text-wing-ink/65 leading-relaxed">It&apos;s on Google Play as well as the App Store &mdash; same account, same code.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-wing-border py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-wing-muted">
          <div className="flex items-center gap-2">
            <WingLogo size={22} />
            <span>Wingpact</span>
          </div>
          <div className="flex gap-6">
            <a href="https://wingpact.app/privacy" className="hover:text-wing-ink transition-colors">Privacy</a>
            <a href="https://wingpact.app/terms" className="hover:text-wing-ink transition-colors">Terms</a>
            <a href="https://wingpact.app/contact" className="hover:text-wing-ink transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
