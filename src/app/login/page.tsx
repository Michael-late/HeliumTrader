"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    // Simulate auth — replace with real auth logic
    await new Promise((res) => setTimeout(res, 1200));
    login(email);
    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <>
      <Navbar />
      <div className={styles.page}>
        <div className={styles.glow} />
        <div className={styles.glowSecondary} />

        <div className={styles.card}>
          {/* Logo mark */}
          <div className={styles.logoMark}>
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
              <path
                d="M14 2L26 8V20L14 26L2 20V8L14 2Z"
                stroke="url(#login-logo)"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M14 8L20 11V17L14 20L8 17V11L14 8Z"
                fill="url(#login-logo)"
                opacity="0.7"
              />
              <defs>
                <linearGradient id="login-logo" x1="2" y1="2" x2="26" y2="26">
                  <stop stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your HeliumTrader account</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className={`input ${styles.input}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="password">
                  Password
                </label>
                <Link href="#" className={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                className={`input ${styles.input}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>or</span>
            <span className={styles.dividerLine} />
          </div>

          <p className={styles.switchText}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className={styles.switchLink}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
