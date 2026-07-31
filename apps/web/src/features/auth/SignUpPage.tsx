import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { AuthLangPills } from "./AuthLangPills";
import styles from "./AuthPages.module.css";

export function SignUpPage() {
  const { t } = useTranslation("auth");
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("passwordsMismatch"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(email, username || email.split("@")[0], password, "Free");
      navigate(ROUTES.signin);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("registrationFailed")));
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
          <h1>{t("heroTitleSignUp")}</h1>
          <p>{t("heroBodySignUp")}</p>
        </div>
        <div className={styles.heroFoot}>{t("footer")}</div>
      </aside>
      <section className={styles.panel}>
        <AuthLangPills />
        <form className={styles.card} onSubmit={onSubmit}>
          <h2>{t("signUpTitle")}</h2>
          <p className={styles.sub}>{t("signUpSub")}</p>
          {error ? <div className={styles.error}>{error}</div> : null}
          <label>
            <span>{t("email")}</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            <span>{t("username")}</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            <span>{t("password")}</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          <label>
            <span>{t("confirmPassword")}</span>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" required />
          </label>
          <button disabled={loading} type="submit">
            {loading ? t("creating") : t("createAccountCta")}
          </button>
          <div className={styles.links}>
            <Link to={ROUTES.signin}>{t("alreadyHaveAccount")}</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
