import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authApi } from "@/api";
import { ROUTES } from "@/constants";
import { getApiErrorMessage } from "@/lib/api-error";
import { AuthLangPills } from "./AuthLangPills";
import styles from "./AuthPages.module.css";

export function VerifyEmailPage() {
  const { t } = useTranslation("auth");
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">(
    token ? "loading" : "error",
  );
  const [error, setError] = useState(token ? "" : t("verifyMissingToken"));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await authApi.verifyEmail(token);
        if (!cancelled) setStatus("ok");
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus("error");
          setError(getApiErrorMessage(err, t("verifyFailed")));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  return (
    <div className={styles.wrap}>
      <aside className={styles.hero}>
        <div className={styles.brandRow}>
          Fiscor<span>AI</span>
          <em>{t("tagline")}</em>
        </div>
        <div className={styles.heroCopy}>
          <h1>{t("verifyHeroTitle")}</h1>
          <p>{t("verifyHeroBody")}</p>
        </div>
        <div className={styles.heroFoot}>{t("footer")}</div>
      </aside>
      <section className={styles.panel}>
        <AuthLangPills />
        <div className={styles.card}>
          <h2>{t("verifyTitle")}</h2>
          {status === "loading" ? <p className={styles.sub}>{t("verifying")}</p> : null}
          {status === "ok" ? <div className={styles.success}>{t("verifyDone")}</div> : null}
          {status === "error" ? <div className={styles.error}>{error}</div> : null}
          <div className={styles.links}>
            <Link to={`${ROUTES.signin}?verified=1`}>{t("backToSignIn")}</Link>
            {status === "error" ? (
              <Link to={ROUTES.signup}>{t("createAccountLink")}</Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
