# SpliitUp — Work Log

Project: SpliitUp Trip Budget Splitting app.
Stack adaptation: Express+MongoDB → Next.js API Routes + Prisma/SQLite (environment is a Next.js sandbox). Vanilla-JS SPA implemented as a single client component. All business logic, schema, UX, and design preserved.

---
Task ID: 1-7
Agent: main (orchestrator)
Task: Build complete SpliitUp trip budget splitting app (schema, API, frontend, theme, verification).

Work Log:
- Defined Prisma schema: Trip, Member, Expense, Handover, Settlement, PendingJoin. Pushed to SQLite (`bun run db:push`).
- Built `src/lib/spliitup.ts` (server helpers): genTripId, genId, formatINR, computeEqualSplits (paise-adjusted), computeBalances, suggestSettlements (two-pointer netting), recomputeSettlements, shapeTrip.
- Built `src/lib/spliitup-client.ts` (client helpers): types, PREDEFINED_CATEGORIES, formatINR, escapeHtml, computeEqualSplits, computeBalances (mirrors server), api() fetch wrapper, timeAgo/formatDate.
- Built 18 REST API routes under `src/app/api/trips/[tripId]/...`: create/get/patch/delete trip, login, close, members, join-request, pending (list/approve/reject), expenses (add/edit/delete/approve/reject), handovers (add/delete), settlements (list/recompute/pay/receive).
- Implemented permission rules: owner-only edit/delete; creator-only approve/reject/close/delete/settings; trip-closed 403 on POST/DELETE for expenses/handovers/members.
- Set dark theme in `src/app/globals.css` (#060b14 bg, #111d32 cards, #1e3255 borders, emerald/amber/red accents) + custom scrollbar + animations.
- Loaded Space Grotesk (headings) + DM Sans (body) via next/font; FontAwesome 6 via CDN in `src/app/layout.tsx`.
- Built SPA in `src/app/page.tsx` + `src/components/spliitup/ui.tsx`: Landing (sticky footer), Create/Login modals, Join flow (`#join-TRIPID`, member dropdown + join request), Creator Dashboard (collapsible sidebar: Overview/Members/Expenses/Handovers/Settlements/Pending/Settings), Member Dashboard (sticky header + tab bar: My View/Add Expense/Add Handover/History), ExpenseForm (equal+custom split with live validation), HandoverForm, SettingsBody (custom categories, share link, close/delete), toasts, confirm modals.
- Fixed a balance-formula sign bug: handovers/settlements now use (given - received) so giving money increases your balance per spec (A owes B 500 but gave B 1000 handover => A net +500). Fixed in both server and client libs.
- Added Mark Paid / Mark Received buttons to member My View so the two-step settlement confirmation works for non-creator members.
- Discovered environment quirk: the Write/Bash tool strips the literal sequence "[h" (lowercase h after bracket). Worked around by naming the handover dynamic route `[HandoverId]` (capital H) and avoiding bracket-access with h-prefixed tokens everywhere.
- Lint clean (`bun run lint` passes with 0 errors). Dev server compiles with no runtime errors.

Stage Summary:
- Browser-verified golden path: created trip (Goa 2025, ID A2NSL3) -> added member Priya -> added ₹1000 equal-split dinner (Rahul 500 / Priya 500) -> recorded ₹1000 handover Priya->Rahul -> balances correctly flipped to Rahul -500 / Priya +500 (handover deduction works) -> suggested settlement Rahul->Priya 500 -> Rahul marked paid -> Priya (member session) marked received -> both settled at ₹0.
- Verified custom split: ₹600 cab (Rahul 400 / Priya 200) with explanation, sum validated, displayed correctly.
- Verified responsive: mobile (390px) hamburger sidebar drawer opens with all nav items; desktop fixed sidebar.
- VLM-verified landing page visual: dark near-black background, emerald accent, SpliitUp logo, 3 buttons, footer at bottom.
- All core business logic (equal/custom splits with paise rounding, handover chaining & deduction, auto-netting two-pointer, two-step settlement confirmation, approval modes, trip closure 403, owner permissions) implemented and working.

---
Task ID: 8
Agent: main (orchestrator)
Task: Add a "How it works" onboarding wizard that auto-shows when someone opens a share link, plus a manual trigger on the landing page.

Work Log:
- Created `src/components/spliitup/onboarding.tsx` with a 5-step `OnboardingWizard`: (1) Welcome, (2) Expenses & Splits (equal/custom + dinner example), (3) Handovers (cash transfer + balance-adjustment example), (4) Smart Settlements (auto-netting + two-step Mark Paid/Received), (5) Member Dashboard tabs overview.
- Wizard features: gradient icon per step, progress dots (clickable), Back/Next nav, Skip (top-right + first-step Back), keyboard arrows (←/→) + Esc to skip, "Get Started" on last step, scrollable body, mobile bottom-sheet on small screens.
- Remembers "seen" state in sessionStorage (`spliitup_onboarding_v1`) so it doesn't nag on reload.
- Wired into `src/app/page.tsx`: auto-triggers when arriving via `#join-TRIPID` (init + hashchange effects) if not seen before; added `closeOnboarding` handler; rendered `<OnboardingWizard>` with a `key` to reset step on each open (avoids set-state-in-effect lint).
- Added a "How it works — Splits, Handovers & Settlements" pill button below the main CTAs on the landing page so anyone can view the explainer anytime.

Stage Summary:
- Lint clean. Browser-verified: landing "How it works" button opens wizard; Next advances through 5 slides with correct content; Skip dismisses; Get Started completes; wizard auto-opens on first share-link visit and does NOT repeat on reload.
- VLM-confirmed the welcome slide visual: green logo, 5 progress dots (1/5 active), Skip + Next buttons.


