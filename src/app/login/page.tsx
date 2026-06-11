"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Fingerprint,
  Globe,
  KeyRound,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wifi,
  Lock,
  Eye,
  EyeOff,
  ScanFace,
  CircleUserRound,
  BadgeInfo,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useApp } from "@/context/AppContext";
import { INDIAN_STATES, LANGUAGES, type Language } from "@/lib/translations";

type PanelMode = "password" | "otp" | "google";
type PasswordMode = "login" | "register";
type BusyState = "password" | "otp-send" | "otp-verify" | "google" | null;

const TRUST_LINES = [
  {
    icon: ShieldCheck,
    title: "Role-aware sessions",
    text: "Every session returns a signed token and a typed user profile.",
  },
  {
    icon: ScanFace,
    title: "OTP and Google ready",
    text: "Password login, mobile OTP, and Firebase Google sign-in share one panel.",
  },
  {
    icon: Sparkles,
    title: "Multilingual onboarding",
    text: "Hindi, English, Marathi, Punjabi, Tamil, and Telugu are supported in the flow.",
  },
];

const KPI = [
  { value: "30d", label: "signed sessions" },
  { value: "3", label: "auth paths" },
  { value: "28+", label: "states covered" },
];

function GoogleMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "grid",
        placeItems: "center",
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1,
        color: "#fff",
        background:
          "conic-gradient(from 180deg at 50% 50%, #4285F4 0 25%, #EA4335 25% 50%, #FBBC05 50% 75%, #34A853 75% 100%)",
      }}
    >
      G
    </span>
  );
}

function passwordScore(password: string) {
  if (!password) {
    return { score: 0, label: "", color: "transparent" };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9!@#$%^&*]/.test(password)) score += 1;

  const labels = ["", "Starter", "Fair", "Strong", "Enterprise"];
  const colors = ["transparent", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  return {
    score,
    label: labels[score] || "",
    color: colors[score] || "transparent",
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading } = useApp();

  const [panel, setPanel] = useState<PanelMode>("password");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("login");
  const [busy, setBusy] = useState<BusyState>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [language, setLanguage] = useState<Language>("hi");
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCodeFromDev, setOtpCodeFromDev] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.isAdmin ? "/admin/dashboard" : "/app/home");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    setError("");
    setSuccess("");
    setBusy(null);
    setOtp("");
    setOtpSent(false);
    setOtpCodeFromDev("");
    setOtpCooldown(0);
  }, [panel]);

  useEffect(() => {
    setError("");
    setSuccess("");
    setBusy(null);
    setShowPassword(false);
    setPassword("");
  }, [passwordMode]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setOtpCooldown((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  const strength = useMemo(() => passwordScore(password), [password]);

  const authSummary = useMemo(
    () => [
      { label: passwordMode === "login" ? "Sign in" : "Create account", value: "Password" },
      { label: "Fast fallback", value: "OTP" },
      { label: "Federated", value: "Google" },
    ],
    [passwordMode]
  );

  const submitPasswordFlow = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError("");
      setSuccess("");

      if (passwordMode === "login") {
        if (!username.trim()) {
          setError("Please enter your username.");
          return;
        }
        if (!password) {
          setError("Please enter your password.");
          return;
        }

        setBusy("password");
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: username.trim().toLowerCase(),
              password,
            }),
          });
          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(data.message || "Login failed");
          }

          login(data.data.token, data.data.user);
          setSuccess("Signed in successfully. Redirecting to your workspace.");
          router.push(data.data.user.isAdmin ? "/admin/dashboard" : "/app/home");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Login failed.");
        } finally {
          setBusy(null);
        }
        return;
      }

      if (!name.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (!username.trim()) {
        setError("Please choose a username.");
        return;
      }
      if (username.trim().length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }
      if (!/^[a-z0-9_]+$/.test(username.trim().toLowerCase())) {
        setError("Use only lowercase letters, numbers, and underscores in your username.");
        return;
      }
      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (!state) {
        setError("Please choose your state.");
        return;
      }

      setBusy("password");
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim().toLowerCase(),
            password,
            name: name.trim(),
            state,
            language,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Registration failed");
        }

        login(data.data.token, data.data.user);
        setSuccess("Account created. Taking you into the workspace.");
        router.push("/app/home");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed.");
      } finally {
        setBusy(null);
      }
    },
    [login, name, password, passwordMode, router, state, username, language]
  );

  const sendOtp = useCallback(async () => {
    setError("");
    setSuccess("");

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setBusy("otp-send");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not send OTP");
      }

      setOtpSent(true);
      setOtpCooldown(30);
      setOtpCodeFromDev(data.data?.otp || "");
      setSuccess("OTP sent. Check your phone or the dev helper below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP.");
    } finally {
      setBusy(null);
    }
  }, [phone]);

  const verifyOtp = useCallback(async () => {
    setError("");
    setSuccess("");

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("OTP must be exactly 6 digits.");
      return;
    }

    setBusy("otp-verify");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          otp: otp.trim(),
          name: name.trim() || undefined,
          state: state || undefined,
          language,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "OTP verification failed");
      }

      login(data.data.token, data.data.user);
      setSuccess("Verified successfully. Opening your dashboard.");
      router.push("/app/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setBusy(null);
    }
  }, [language, login, name, otp, phone, router, state]);

  const connectGoogle = useCallback(async () => {
    setError("");
    setSuccess("");

    setBusy("google");
    try {
      const isDev = process.env.NODE_ENV !== "production";
      let idToken = "dev-local-google-token";
      let googleDisplayName: string | undefined;

      if (isFirebaseConfigured) {
        const firebaseAuth = (await import("firebase/auth")) as any;
        const provider = new firebaseAuth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        provider.addScope("email");
        provider.addScope("profile");

        const credential = await firebaseAuth.signInWithPopup(auth, provider);
        idToken = await credential.user.getIdToken();
        googleDisplayName = credential.user.displayName || undefined;
      } else if (!isDev) {
        throw new Error("Google sign-in is not configured yet. Add Firebase env vars to enable it.");
      }

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          name: name.trim() || googleDisplayName || undefined,
          state: state || undefined,
          language,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Google sign-in failed");
      }

      login(data.data.token, data.data.user);
      setSuccess("Google account connected. Taking you to the dashboard.");
      router.push(data.data.user.isAdmin ? "/admin/dashboard" : "/app/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(null);
    }
  }, [language, login, name, router, state]);

  const panelTitle =
    panel === "password"
      ? passwordMode === "login"
        ? "Welcome back"
        : "Create your account"
      : panel === "otp"
        ? "Mobile OTP access"
        : "Connect with Google";

  const panelCopy =
    panel === "password"
      ? passwordMode === "login"
        ? "Sign in with your enterprise username and password."
        : "Set up a new farmer workspace with your profile details."
      : panel === "otp"
        ? "Fast mobile sign-in for farmers who prefer one-time codes."
        : "Use Google once, then keep the same signed session for your workspace.";

  return (
    <main className="min-h-screen bg-[#07100c] text-slate-100">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),transparent_35%,transparent_65%,rgba(59,130,246,0.08))]" />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <section className="hidden lg:flex flex-col justify-between rounded-[32px] border border-white/10 bg-slate-950/60 p-10 shadow-2xl shadow-emerald-950/20 backdrop-blur">
            <div className="space-y-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <Sparkles className="h-4 w-4" />
                Enterprise Access Suite
              </div>

              <div className="max-w-xl space-y-5">
                <h1 className="text-5xl font-black leading-[1.02] tracking-tight text-white">
                  One login surface.
                  <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-200 bg-clip-text text-transparent">
                    Three working paths.
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300">
                  Password access, mobile OTP, and Google sign-in live in one polished panel so the
                  farm workspace feels predictable from the first screen.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {KPI.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="text-2xl font-bold text-white">{item.value}</div>
                    <div className="mt-1 text-sm text-slate-400">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {TRUST_LINES.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                    <div className="mt-0.5 rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-2 text-emerald-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{title}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <BadgeCheck className="h-4 w-4" />
                  Signed sessions
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Tokens are stored once and reused across the app until the session expires.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center gap-2 text-sm text-cyan-300">
                  <Wifi className="h-4 w-4" />
                  Field-friendly
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Clear labels, clear errors, and a layout that stays readable on mobile.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10">
                  <img src="/logo.jpg" alt="Kisan Diary" className="h-10 w-10 rounded-xl object-cover" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Kisan Diary
                  </div>
                  <div className="text-sm text-slate-400">Farm ops access console</div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="hidden border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 md:inline-flex"
                onClick={() => router.push("/")}
              >
                Back to home
              </Button>
            </div>

            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
              {([
                { id: "password", label: "Password", icon: Lock },
                { id: "otp", label: "Phone OTP", icon: Phone },
                { id: "google", label: "Google", icon: GoogleMark },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPanel(id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition"
                  style={{
                    background: panel === id ? "rgba(16,185,129,0.16)" : "transparent",
                    color: panel === id ? "#d1fae5" : "#94a3b8",
                    boxShadow: panel === id ? "inset 0 0 0 1px rgba(52,211,153,0.22)" : "none",
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-5 space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">{panelTitle}</h2>
              <p className="max-w-xl text-sm leading-6 text-slate-400">{panelCopy}</p>
            </div>

            {panel === "password" && (
              <>
                <div className="mb-5 flex items-center rounded-2xl border border-white/10 bg-white/5 p-1">
                  {([
                    { id: "login", label: "Sign in" },
                    { id: "register", label: "Create account" },
                  ] as const).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPasswordMode(id)}
                      className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition"
                      style={{
                        background: passwordMode === id ? "rgba(255,255,255,0.08)" : "transparent",
                        color: passwordMode === id ? "#ffffff" : "#94a3b8",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={submitPasswordFlow} className="space-y-4" noValidate>
                  {passwordMode === "register" && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Full name
                      </label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="auth-input"
                          style={{ paddingLeft: 44 }}
                          placeholder="Ramlal Yadav"
                          autoComplete="name"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Username
                    </label>
                    <div className="relative">
                      <CircleUserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={username}
                        onChange={(e) =>
                          setUsername(
                            passwordMode === "register"
                              ? e.target.value.replace(/\s/g, "").toLowerCase()
                              : e.target.value
                          )
                        }
                        className="auth-input"
                        style={{ paddingLeft: 44 }}
                        placeholder="your_handle"
                        autoComplete="username"
                      />
                    </div>
                    {passwordMode === "register" && (
                      <p className="mt-2 text-xs text-slate-500">
                        Use lowercase letters, numbers, and underscores only.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                        style={{ paddingLeft: 44, paddingRight: 48 }}
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        autoComplete={passwordMode === "login" ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {passwordMode === "register" && password && (
                      <div className="mt-3">
                        <div className="mb-2 flex gap-1">
                          {[1, 2, 3, 4].map((part) => (
                            <div
                              key={part}
                              className="h-1.5 flex-1 rounded-full bg-white/10"
                              style={{
                                background: part <= strength.score ? strength.color : undefined,
                              }}
                            />
                          ))}
                        </div>
                        <div className="text-xs" style={{ color: strength.color }}>
                          {strength.label ? `${strength.label} password` : ""}
                        </div>
                      </div>
                    )}
                  </div>

                  {passwordMode === "register" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          State
                        </label>
                        <Select value={state} onValueChange={setState}>
                          <SelectTrigger
                            className="h-12 rounded-xl border border-white/10 bg-white/5 text-slate-100"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              borderColor: "rgba(255,255,255,0.1)",
                              color: state ? "#f8fafc" : "#94a3b8",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-slate-500" />
                              <SelectValue placeholder="Choose state" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="auth-select-content">
                            {INDIAN_STATES.map((item) => (
                              <SelectItem key={item} value={item} className="auth-select-item">
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Language
                        </label>
                        <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                          <SelectTrigger
                            className="h-12 rounded-xl border border-white/10 bg-white/5 text-slate-100"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              borderColor: "rgba(255,255,255,0.1)",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-slate-500" />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="auth-select-content">
                            {LANGUAGES.map((item) => (
                              <SelectItem key={item.code} value={item.code} className="auth-select-item">
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
                      <p className="text-sm leading-6 text-red-100">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                      <p className="text-sm leading-6 text-emerald-100">{success}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    isLoading={busy === "password"}
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-950/30 hover:from-emerald-400 hover:to-teal-400"
                  >
                    {passwordMode === "login" ? "Sign in" : "Create account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </>
            )}

            {panel === "otp" && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Mobile number
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="auth-input"
                        style={{ paddingLeft: 44 }}
                        placeholder="9876543210"
                        inputMode="numeric"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Full name
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="auth-input"
                        style={{ paddingLeft: 44 }}
                        placeholder="Ramlal Yadav"
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      State
                    </label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger
                        className="h-12 rounded-xl border border-white/10 bg-white/5 text-slate-100"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          borderColor: "rgba(255,255,255,0.1)",
                          color: state ? "#f8fafc" : "#94a3b8",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <SelectValue placeholder="Choose state" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="auth-select-content">
                        {INDIAN_STATES.map((item) => (
                          <SelectItem key={item} value={item} className="auth-select-item">
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Language
                    </label>
                    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                      <SelectTrigger
                        className="h-12 rounded-xl border border-white/10 bg-white/5 text-slate-100"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          borderColor: "rgba(255,255,255,0.1)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-slate-500" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="auth-select-content">
                        {LANGUAGES.map((item) => (
                          <SelectItem key={item.code} value={item.code} className="auth-select-item">
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      OTP
                    </label>
                    <div className="relative">
                      <Fingerprint className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="auth-input"
                        style={{ paddingLeft: 44, letterSpacing: "0.35em" }}
                        placeholder="123456"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={busy === "otp-send"}
                    onClick={sendOtp}
                    className="h-12 rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  >
                    {otpSent ? "Resend OTP" : "Send OTP"}
                  </Button>
                  <Button
                    type="button"
                    isLoading={busy === "otp-verify"}
                    onClick={verifyOtp}
                    className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-950/30 hover:from-emerald-400 hover:to-teal-400"
                  >
                    Verify and continue
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <BadgeInfo className="h-4 w-4 text-amber-300" />
                    {otpCooldown > 0 ? `Resend available in ${otpCooldown}s` : "OTP can be resent now."}
                  </div>
                  {otpCodeFromDev && (
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                      Dev OTP: {otpCodeFromDev}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
                    <p className="text-sm leading-6 text-red-100">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                    <p className="text-sm leading-6 text-emerald-100">{success}</p>
                  </div>
                )}
              </div>
            )}

            {panel === "google" && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Display name
                    </label>
                    <div className="relative">
                      <CircleUserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="auth-input"
                        style={{ paddingLeft: 44 }}
                        placeholder="Google profile name"
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      State
                    </label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger
                        className="h-12 rounded-xl border border-white/10 bg-white/5 text-slate-100"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          borderColor: "rgba(255,255,255,0.1)",
                          color: state ? "#f8fafc" : "#94a3b8",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <SelectValue placeholder="Choose state" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="auth-select-content">
                        {INDIAN_STATES.map((item) => (
                          <SelectItem key={item} value={item} className="auth-select-item">
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Language
                    </label>
                    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                      <SelectTrigger
                        className="h-12 rounded-xl border border-white/10 bg-white/5 text-slate-100"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          borderColor: "rgba(255,255,255,0.1)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-slate-500" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="auth-select-content">
                        {LANGUAGES.map((item) => (
                          <SelectItem key={item.code} value={item.code} className="auth-select-item">
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  <GoogleMark className="h-5 w-5" />
                  <p>
                    {isFirebaseConfigured
                      ? "Google sign-in is enabled and will create or open your workspace session."
                      : "Add the Firebase env vars first to enable the popup sign-in flow."}
                  </p>
                </div>

                <Button
                  type="button"
                  isLoading={busy === "google"}
                  onClick={connectGoogle}
                  disabled={!isFirebaseConfigured}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-white to-slate-100 text-slate-950 shadow-lg shadow-black/20 hover:from-slate-100 hover:to-white disabled:opacity-50"
                >
                  <GoogleMark className="mr-2 h-4 w-4" />
                  Continue with Google
                </Button>

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
                    <p className="text-sm leading-6 text-red-100">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                    <p className="text-sm leading-6 text-emerald-100">{success}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
              {authSummary.map((item) => (
                <div key={item.value} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.value}</div>
                  <div className="mt-1 text-sm font-medium text-slate-200">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 text-xs text-slate-500">
              <p>Protected by signed sessions and server-side validation.</p>
              <Link href="/app/home" className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200">
                Demo home
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
