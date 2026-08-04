import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authApi, usersApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { Toast } from "@/components/Toast";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import styles from "./AccountPage.module.css";

export function AccountPage() {
  const { t } = useTranslation("account");
  const { user } = useAuth();
  const { toast, flash } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: async () => {
      const r = await usersApi.profile();
      return r.data.data;
    },
  });

  useEffect(() => {
    setEmail(user?.email || "");
  }, [user?.email]);

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setName(p.alias || p.username || "");
  }, [profileQuery.data]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user?.userId) return;
      await usersApi.update(user.userId, { alias: name });
    },
    onSuccess: async () => {
      flash(t("profileSaved"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
    },
    onError: () => flash(t("profileFailed")),
  });

  const savePassword = useMutation({
    mutationFn: async () => {
      if (!currentPw) throw new Error("CURRENT_REQUIRED");
      if (newPw !== newPw2) throw new Error("MISMATCH");
      if (!newPw) throw new Error("REQUIRED");
      await authApi.changePassword(currentPw, newPw);
    },
    onSuccess: () => {
      setCurrentPw("");
      setNewPw("");
      setNewPw2("");
      flash(t("passwordChanged"));
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.message === "CURRENT_REQUIRED") {
        flash(t("currentPasswordRequired"));
        return;
      }
      if (e instanceof Error && e.message === "MISMATCH") {
        flash(t("passwordsMismatch"));
        return;
      }
      if (e instanceof Error && e.message === "REQUIRED") {
        flash(t("passwordRequired"));
        return;
      }
      flash(getApiErrorMessage(e, t("passwordFailed")));
    },
  });

  return (
    <div className={styles.page}>
      <Toast message={toast} />

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>{t("profile")}</div>
          <div className={styles.fields}>
            <label>
              <span className={styles.label}>{t("name")}</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span className={styles.label}>{t("email")}</span>
              <input type="email" value={email} disabled style={{ background: "var(--surface-app)", color: "var(--text-secondary)" }} />
            </label>
          </div>
          <button className={styles.btnPrimary} onClick={() => saveProfile.mutate()}>
            {t("saveChanges")}
          </button>
        </div>

        <div className={styles.rightCol}>
          <Link to={ROUTES.amazonConnection} className={styles.card} style={{ textDecoration: "none" }}>
            <div className={styles.cardHeadWithChip}>
              <div className={styles.cardTitle}>{t("amazonTitle")}</div>
              <span className={styles.chipStatus}>{t("comingSoon")}</span>
            </div>
            <div className={styles.hint}>{t("amazonMovedHint")}</div>
          </Link>

          <div className={styles.card}>
            <div className={styles.cardTitle}>{t("password")}</div>
            <div className={styles.fields}>
              <label>
                <span className={styles.label}>{t("currentPassword")}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
              </label>
              <label>
                <span className={styles.label}>{t("newPassword")}</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </label>
              <label>
                <span className={styles.label}>{t("confirmPassword")}</span>
                <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
              </label>
            </div>
            <button className={styles.btnPrimary} onClick={() => savePassword.mutate()}>
              {t("changePassword")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
