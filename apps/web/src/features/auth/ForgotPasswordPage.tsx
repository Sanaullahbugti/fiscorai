import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi } from "@/api";
import { ROUTES } from "@/constants";
import { getApiErrorMessage } from "@/lib/api-error";
import { AuthLangPills } from "./AuthLangPills";
import styles from "./AuthPages.module.css";

export function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("forgotFailed")));
    } finally {
      setLoading(false);
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
          <h1>{t("forgotHeroTitle")}</h1>
          <p>{t("forgotHeroBody")}</p>
        </div>
        <div className={styles.heroFoot}>{t("footer")}</div>
      </aside>
      <section className={styles.panel}>
        <AuthLangPills />
        <form className={styles.card} onSubmit={onSubmit}>
          <h2>{t("forgotTitle")}</h2>
          <p className={styles.sub}>{t("forgotSub")}</p>
          {error ? <div className={styles.error}>{error}</div> : null}
          {sent ? (
            <div className={styles.success}>{t("forgotSent")}</div>
          ) : (
            <>
              <label>
                <span>{t("email")}</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                />
              </label>
              <button disabled={loading} type="submit">
                {loading ? t("sending") : t("forgotCta")}
              </button>
            </>
          )}
          <div className={styles.links}>
            <Link to={ROUTES.signin}>{t("backToSignIn")}</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
