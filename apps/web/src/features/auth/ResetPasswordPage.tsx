import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi } from "@/api";
import { ROUTES } from "@/constants";
import { getApiErrorMessage } from "@/lib/api-error";
import { AuthLangPills } from "./AuthLangPills";
import styles from "./AuthPages.module.css";

export function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(token ? "" : t("resetMissingToken"));
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(t("resetMissingToken"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("resetFailed")));
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
          <h1>{t("resetHeroTitle")}</h1>
          <p>{t("resetHeroBody")}</p>
        </div>
        <div className={styles.heroFoot}>{t("footer")}</div>
      </aside>
      <section className={styles.panel}>
        <AuthLangPills />
        <form className={styles.card} onSubmit={onSubmit}>
          <h2>{t("resetTitle")}</h2>
          <p className={styles.sub}>{t("resetSub")}</p>
          {error ? <div className={styles.error}>{error}</div> : null}
          {done ? (
            <>
              <div className={styles.success}>{t("resetDone")}</div>
              <div className={styles.links}>
                <Link to={ROUTES.signin}>{t("backToSignIn")}</Link>
              </div>
            </>
          ) : (
            <>
              <label>
                <span>{t("password")}</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  minLength={6}
                />
              </label>
              <label>
                <span>{t("confirmPassword")}</span>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  required
                  minLength={6}
                />
              </label>
              <button disabled={loading || !token} type="submit">
                {loading ? t("saving") : t("resetCta")}
              </button>
              <div className={styles.links}>
                <Link to={ROUTES.forgotPassword}>{t("forgotPassword")}</Link>
                <Link to={ROUTES.signin}>{t("backToSignIn")}</Link>
              </div>
            </>
          )}
        </form>
      </section>
    </div>
  );
}
