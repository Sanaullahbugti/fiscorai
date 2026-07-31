import { Navigate, Outlet, Route, Routes, Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { SignInPage, SignUpPage } from "@/features/auth/AuthPages";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ReviewPage } from "@/features/review/ReviewPage";
import { AnalystPage } from "@/features/analyst/AnalystPage";
import { AccountPage } from "@/features/account/AccountPage";
import { BillingPage } from "@/features/billing/BillingPage";
import { ContactPage, FaqPage, LegalPage } from "@/features/help/HelpPages";
import { LandingPage } from "@/features/landing/LandingPage";

function Protected() {
  const { user } = useAuth();
  if (!user?.jwtToken) return <Navigate to={ROUTES.signin} replace />;
  return <Outlet />;
}

function PublicLegal({ kind }: { kind: "privacy" | "terms" }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-app)", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <Link
          to={ROUTES.home}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 17,
            color: "var(--text-primary)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 20,
          }}
        >
          Fiscor<span style={{ color: "var(--brand-accent)" }}>AI</span>
        </Link>
        <LegalPage kind={kind} />
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<LandingPage />} />
      <Route path={ROUTES.signin} element={<SignInPage />} />
      <Route path={ROUTES.signup} element={<SignUpPage />} />
      <Route path={ROUTES.privacy} element={<PublicLegal kind="privacy" />} />
      <Route path={ROUTES.terms} element={<PublicLegal kind="terms" />} />
      <Route element={<Protected />}>
        <Route element={<AppShell />}>
          <Route path={ROUTES.graphics} element={<DashboardPage />} />
          <Route path={ROUTES.information} element={<ReportsPage />} />
          <Route path={ROUTES.review} element={<ReviewPage />} />
          <Route path={ROUTES.analyst} element={<AnalystPage />} />
          <Route path={ROUTES.account} element={<AccountPage />} />
          <Route path={ROUTES.billing} element={<BillingPage />} />
          <Route path={ROUTES.faq} element={<FaqPage />} />
          <Route path={ROUTES.contact} element={<ContactPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
