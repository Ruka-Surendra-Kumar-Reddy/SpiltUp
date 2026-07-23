"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/spliitup/ui";
import { Logo } from "@/components/spliitup/ui";

export interface OnboardingStep {
  icon: string;
  iconBg: string;
  title: string;
  body: React.ReactNode;
}

/* Illustrative example block used inside slides */
function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-background/50 p-3.5 text-left">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <i className="fa-solid fa-lightbulb mr-1" /> Example
      </p>
      {children}
    </div>
  );
}

function Pill({ icon, label, value, tone = "muted" }: { icon: string; label: string; value: string; tone?: "muted" | "primary" | "warning" }) {
  const tones = {
    muted: "bg-secondary text-foreground",
    primary: "bg-primary/15 text-primary border border-primary/30",
    warning: "bg-warning/15 text-warning border border-warning/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      <i className={`fa-solid ${icon}`} /> {label}: <span className="font-bold">{value}</span>
    </span>
  );
}

export const ONBOARDING_KEY = "spliitup_onboarding_v1";

export function getSteps(): OnboardingStep[] {
  return [
    {
      icon: "fa-arrow-right-arrow-left",
      iconBg: "from-primary to-emerald-500",
      title: "Welcome to SpliitUp",
      body: (
        <>
          <p className="text-sm text-muted-foreground">
            Split trip expenses with friends, track cash handovers, and settle up with the
            fewest transactions possible — all in Indian Rupees (₹).
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Here's a quick 30-second tour of how everything works. You can skip anytime.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill icon="fa-divide" label="Splits" value="Equal / Custom" tone="primary" />
            <Pill icon="fa-hand-holding-dollar" label="Handovers" value="Cash transfers" tone="warning" />
            <Pill icon="fa-arrow-right-arrow-left" label="Settlements" value="Auto-netted" />
          </div>
        </>
      ),
    },
    {
      icon: "fa-receipt",
      iconBg: "from-emerald-500 to-teal-500",
      title: "Expenses & Splits",
      body: (
        <>
          <p className="text-sm text-muted-foreground">
            When someone pays for the group, they add an <span className="text-foreground font-medium">expense</span>.
            SpliitUp splits it two ways:
          </p>
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <i className="fa-solid fa-divide" /> Equal Split
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Divided equally among selected people. Paise are auto-adjusted so the total matches exactly.
                Needs a short <span className="text-foreground">reason</span>.
              </p>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-warning">
                <i className="fa-solid fa-sliders" /> Custom Split
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You enter specific amounts per person. They must add up to the total.
                Needs a short <span className="text-foreground">explanation</span>.
              </p>
            </div>
          </div>
          <Example>
            <p className="text-xs text-muted-foreground">
              Rahul pays ₹1,000 for dinner and splits it equally with Priya:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill icon="fa-user" label="Rahul" value="₹500" tone="primary" />
              <Pill icon="fa-user" label="Priya" value="₹500" tone="primary" />
            </div>
          </Example>
        </>
      ),
    },
    {
      icon: "fa-hand-holding-dollar",
      iconBg: "from-amber-500 to-orange-500",
      title: "Handovers",
      body: (
        <>
          <p className="text-sm text-muted-foreground">
            A <span className="text-warning font-medium">handover</span> is a cash transfer between two people —
            separate from expenses. Example: "Priya gave Rahul ₹1,000 to use for the trip."
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Handovers adjust everyone's <span className="text-foreground font-medium">net balance</span>.
            They can even chain: A → B, then B → C.
          </p>
          <Example>
            <p className="text-xs text-muted-foreground">
              You owe Rahul ₹500. But last week you <span className="text-warning">gave him ₹1,000</span> as a handover.
            </p>
            <p className="mt-2 text-xs text-foreground">
              So your real balance is <span className="text-primary font-bold">+₹500</span> — Rahul owes you back!
            </p>
          </Example>
        </>
      ),
    },
    {
      icon: "fa-arrow-right-arrow-left",
      iconBg: "from-sky-500 to-cyan-500",
      title: "Smart Settlements",
      body: (
        <>
          <p className="text-sm text-muted-foreground">
            At the end, SpliitUp <span className="text-foreground font-medium">auto-calculates</span> who owes whom —
            using the <span className="text-foreground font-medium">fewest transactions</span> possible (auto-netting).
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Each settlement is confirmed in two steps:</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary text-sm font-bold">1</span>
              <div>
                <p className="text-sm font-medium">Payer taps "Mark Paid"</p>
                <p className="text-xs text-muted-foreground">I've handed over the cash.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary text-sm font-bold">2</span>
              <div>
                <p className="text-sm font-medium">Receiver taps "Mark Received"</p>
                <p className="text-xs text-muted-foreground">Confirmed — settlement completed.</p>
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: "fa-gauge-high",
      iconBg: "from-violet-500 to-fuchsia-500",
      title: "Your Member Dashboard",
      body: (
        <>
          <p className="text-sm text-muted-foreground">Once you join, you'll see four tabs:</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3">
              <i className="fa-solid fa-gauge-high mt-0.5 text-primary" />
              <div>
                <p className="text-sm font-medium">My View</p>
                <p className="text-xs text-muted-foreground">Your balance, who you owe, who owes you.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3">
              <i className="fa-solid fa-receipt mt-0.5 text-primary" />
              <div>
                <p className="text-sm font-medium">Add Expense</p>
                <p className="text-xs text-muted-foreground">Log something you paid for, split among friends.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3">
              <i className="fa-solid fa-hand-holding-dollar mt-0.5 text-warning" />
              <div>
                <p className="text-sm font-medium">Add Handover</p>
                <p className="text-xs text-muted-foreground">Record a cash transfer between two members.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3">
              <i className="fa-solid fa-clock-rotate-left mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">History</p>
                <p className="text-xs text-muted-foreground">Everything you've added, with edit/delete.</p>
              </div>
            </div>
          </div>
        </>
      ),
    },
  ];
}

/**
 * Onboarding wizard shown when someone arrives via a share link (#join-TRIPID).
 * Multi-step with Next / Back / Skip. Remembered in sessionStorage so it
 * doesn't repeat on every reload within the same browser session.
 */
export function OnboardingWizard({
  open,
  onComplete,
  onSkip,
}: {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const steps = getSteps();
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      if (e.key === "ArrowRight" && !isLast) setStep((s) => Math.min(s + 1, steps.length - 1));
      if (e.key === "ArrowLeft" && step > 0) setStep((s) => Math.max(s - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, isLast, step, steps.length, onSkip]);

  if (!open) return null;
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="spl-scale-in flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border bg-card shadow-2xl max-h-[94vh]">
        {/* header with gradient + skip */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onSkip}
            className="absolute right-4 top-4 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            Skip <i className="fa-solid fa-forward ml-0.5" />
          </button>
          <div className="flex flex-col items-center text-center">
            <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${current.iconBg} text-white text-2xl shadow-lg`}>
              <i className={`fa-solid ${current.icon}`} />
            </div>
            {step === 0 && (
              <div className="mt-3">
                <Logo size="sm" />
              </div>
            )}
            <h2 className="mt-3 font-heading text-xl font-bold">{current.title}</h2>
          </div>
        </div>

        {/* progress dots */}
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-secondary"
              }`}
            />
          ))}
        </div>

        {/* body */}
        <div className="spl-scroll overflow-y-auto px-6 pb-2">
          <div key={step} className="spl-fade-in">{current.body}</div>
        </div>

        {/* footer nav */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
          <Btn
            variant="ghost"
            onClick={() => (step === 0 ? onSkip() : setStep((s) => Math.max(0, s - 1)))}
            className={step === 0 ? "text-muted-foreground" : ""}
          >
            <i className={`fa-solid ${step === 0 ? "fa-xmark" : "fa-arrow-left"}`} />
            {step === 0 ? "Skip" : "Back"}
          </Btn>
          <span className="text-xs text-muted-foreground">
            {step + 1} / {steps.length}
          </span>
          {isLast ? (
            <Btn variant="primary" onClick={onComplete}>
              <i className="fa-solid fa-rocket" /> Get Started
            </Btn>
          ) : (
            <Btn variant="primary" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
              Next <i className="fa-solid fa-arrow-right" />
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
