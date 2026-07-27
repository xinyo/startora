import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Button } from "@/components/base/buttons/button";
import { ApiClientError } from "@/lib/api";
import { PASSWORD_LENGTH } from "@/shared/auth-policy";
import { useAppStore } from "@/store";
import AppLogo from "@/assets/logo-group.svg";

type AuthMode = "login" | "register";

function authErrorMessage(error: unknown, t: TFunction): string {
  if (!(error instanceof ApiClientError)) {
    return t("auth.requestFailed");
  }

  if (error.code === "INVALID_CREDENTIALS") {
    return t("auth.invalidCredentials");
  }
  if (error.code === "USERNAME_TAKEN") {
    return t("auth.usernameTaken");
  }
  if (error.fields?.username) {
    return t("auth.usernameInvalid");
  }
  if (error.fields?.password) {
    return t("auth.passwordInvalid", PASSWORD_LENGTH);
  }
  return t("auth.requestFailed");
}

export function Welcome() {
  const { t } = useTranslation();
  const login = useAppStore((state) => state.login);
  const register = useAppStore((state) => state.register);
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (caughtError) {
      setError(authErrorMessage(caughtError, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="welcome-shell">
      <section className="welcome-story">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>{t("auth.heading")}</h1>
          <p>{t("auth.intro")}</p>
        </div>
        <div className="story-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="auth-panel" aria-label={t("auth.brand")}>
        <div className="auth-card">
          <img className="brand-mark" src={AppLogo} alt="" />
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => changeMode("login")}
            >
              {t("auth.loginTab")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => changeMode("register")}
            >
              {t("auth.registerTab")}
            </button>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)}>
            <label className="field">
              <span>{t("auth.username")}</span>
              <input
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("auth.usernamePlaceholder")}
                minLength={3}
                maxLength={50}
                pattern="[A-Za-z0-9._-]+"
                required
              />
            </label>
            <label className="field">
              <span>{t("auth.password")}</span>
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t(
                  "auth.passwordPlaceholder",
                  PASSWORD_LENGTH,
                )}
                minLength={PASSWORD_LENGTH.min}
                maxLength={PASSWORD_LENGTH.max}
                required
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="auth-submit"
              isLoading={submitting}
            >
              {submitting
                ? t(mode === "login" ? "auth.loggingIn" : "auth.registering")
                : t(mode === "login" ? "auth.login" : "auth.register")}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
