"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const { login, register, user } = useAuth();
    const router = useRouter();
    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (user) {
        router.push("/");
        return null;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            if (mode === "login") {
                await login(email, password);
            } else {
                await register(email, password, name);
            }
            router.push("/");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="card w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/30 mx-auto mb-4">
                        KG
                    </div>
                    <h1 className="page-title">
                        {mode === "login" ? "Welcome Back" : "Create Account"}
                    </h1>
                    <p className="page-subtitle">
                        {mode === "login"
                            ? "Sign in to your KG Platform account"
                            : "Register for a new account"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "register" && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                Name
                            </label>
                            <input
                                className="input-field"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                            Email
                        </label>
                        <input
                            className="input-field"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                            Password
                        </label>
                        <input
                            className="input-field"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full"
                    >
                        {loading
                            ? "Please wait..."
                            : mode === "login"
                              ? "Sign In"
                              : "Create Account"}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        className="text-sm text-gray-400 hover:text-brand-400 transition-colors"
                        onClick={() =>
                            setMode(mode === "login" ? "register" : "login")
                        }
                    >
                        {mode === "login"
                            ? "Don't have an account? Register"
                            : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
}
