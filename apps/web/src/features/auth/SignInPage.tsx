import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { AuthLangPills } from "./AuthLangPills";
import styles from "./AuthPages.module.css";

export function SignInPage() {
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("demo@fiscor.ai");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState(params.get("expired") ? t("sessionExpired") : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate(ROUTES.analyst);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("signInFailed")));
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
            <span className={styles.muted}>{t("forgotPassword")}</span>
          </div>
          <div className={styles.demo} dangerouslySetInnerHTML={{ __html: t("demoNote") }} />
        </form>
      </section>
    </div>
  );
}
