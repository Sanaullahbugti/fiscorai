import { Navigate, Outlet, Route, Routes, Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { SignInPage, SignUpPage, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "@/features/auth/AuthPages";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ReviewPage } from "@/features/review/ReviewPage";
import { AnalystPage } from "@/features/analyst/AnalystPage";
import { AccountPage } from "@/features/account/AccountPage";
import { AmazonConnectionPage } from "@/features/amazon/AmazonConnectionPage";
import { BillingPage } from "@/features/billing/BillingPage";
import { ThankYouPage } from "@/features/billing/ThankYouPage";
import { PaymentFailedPage } from "@/features/billing/PaymentFailedPage";
import { ContactPage, FaqPage, LegalPage } from "@/features/help/HelpPages";
import { LandingPage } from "@/features/landing/LandingPage";
import type { ReactNode } from "react";

function Protected() {
  const { user } = useAuth();
  if (!user?.jwtToken) return <Navigate to={ROUTES.signin} replace />;
  return <Outlet />;
}

type LegalKind = "privacy" | "terms" | "refund" | "cookies";

function PublicChrome({ children }: { children: ReactNode }) {
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
        {children}
      </div>
    </div>
  );
}

function PublicLegal({ kind }: { kind: LegalKind }) {
  return (
    <PublicChrome>
      <LegalPage kind={kind} />
    </PublicChrome>
  );
}

/** FAQ is public for landing visitors; signed-in users keep the app shell. */
function FaqLayout() {
  const { user } = useAuth();
  if (user?.jwtToken) return <AppShell />;
  return (
    <PublicChrome>
      <Outlet />
    </PublicChrome>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<LandingPage />} />
      <Route path={ROUTES.signin} element={<SignInPage />} />
      <Route path={ROUTES.signup} element={<SignUpPage />} />
      <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
      <Route path={ROUTES.verifyEmail} element={<VerifyEmailPage />} />
      <Route path={ROUTES.privacy} element={<PublicLegal kind="privacy" />} />
      <Route path={ROUTES.terms} element={<PublicLegal kind="terms" />} />
      <Route path={ROUTES.refund} element={<PublicLegal kind="refund" />} />
      <Route path={ROUTES.cookies} element={<PublicLegal kind="cookies" />} />
      <Route element={<FaqLayout />}>
        <Route path={ROUTES.faq} element={<FaqPage />} />
      </Route>
      <Route element={<Protected />}>
        <Route element={<AppShell />}>
          <Route path={ROUTES.graphics} element={<DashboardPage />} />
          <Route path={ROUTES.information} element={<ReportsPage />} />
          <Route path={ROUTES.review} element={<ReviewPage />} />
          <Route path={ROUTES.analyst} element={<AnalystPage />} />
          <Route path={ROUTES.account} element={<AccountPage />} />
          <Route path={ROUTES.amazonConnection} element={<AmazonConnectionPage />} />
          <Route path={ROUTES.billing} element={<BillingPage />} />
          <Route path={ROUTES.thankyou} element={<ThankYouPage />} />
          <Route path={ROUTES.paymentFailed} element={<PaymentFailedPage />} />
          <Route path={ROUTES.contact} element={<ContactPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
