import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi } from "@/api";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api-error";
import { AuthLangPills } from "./AuthLangPills";
import styles from "./AuthPages.module.css";

export function SignInPage() {
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("expired") ? t("sessionExpired") : "");
  const [info, setInfo] = useState(params.get("verified") ? t("verifyDone") : "");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    setNeedsVerify(false);
    try {
      await login(email, password);
      navigate(ROUTES.analyst);
    } catch (err: unknown) {
      if (getApiErrorCode(err) === "EMAIL_NOT_VERIFIED") {
        setNeedsVerify(true);
        setError(t("emailNotVerified"));
      } else {
        setError(getApiErrorMessage(err, t("signInFailed")));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setResending(true);
    setError("");
    try {
      await authApi.resendVerification(email);
      setInfo(t("resendSent"));
      setNeedsVerify(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("resendFailed")));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <aside className={styles.hero}>
        <div className={styles.brandRow}>
          Fiscor<span>AI</span>
          <em>{t("tagline")}</em>
        </div>
        <div className={styles.heroCopy}>
          <h1>{t("heroTitleSignIn")}</h1>
          <p>{t("heroBodySignIn")}</p>
          <div className={styles.bullets}>
            <div>{t("bullet1")}</div>
            <div>{t("bullet2")}</div>
            <div>{t("bullet3")}</div>
          </div>
        </div>
        <div className={styles.heroFoot}>{t("footer")}</div>
      </aside>
      <section className={styles.panel}>
        <AuthLangPills />
        <form className={styles.card} onSubmit={onSubmit}>
          <h2>{t("signInTitle")}</h2>
          <p className={styles.sub}>{t("signInSub")}</p>
          {error ? <div className={styles.error}>{error}</div> : null}
          {info ? <div className={styles.success}>{info}</div> : null}
          {needsVerify ? (
            <button type="button" className={styles.secondaryBtn} disabled={resending} onClick={onResend}>
              {resending ? t("sending") : t("resendVerification")}
            </button>
          ) : null}
          <label>
            <span>{t("email")}</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            <span>{t("password")}</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          <button disabled={loading} type="submit">
            {loading ? t("signingIn") : t("signInCta")}
          </button>
          <div className={styles.links}>
            <Link to={ROUTES.signup}>{t("createAccountLink")}</Link>
            <Link to={ROUTES.forgotPassword}>{t("forgotPassword")}</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
