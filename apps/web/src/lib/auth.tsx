"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("kg_token");
        if (stored) {
            setToken(stored);
            fetchUser(stored);
        } else {
            setLoading(false);
        }
    }, []);

    async function fetchUser(t: string) {
        try {
            const res = await fetch(`${API}/auth/me`, {
                headers: { Authorization: `Bearer ${t}` },
            });
            const data = await res.json();
            if (data.ok) {
                setUser(data.user);
            } else {
                localStorage.removeItem("kg_token");
                setToken(null);
            }
        } catch {
            localStorage.removeItem("kg_token");
            setToken(null);
        } finally {
            setLoading(false);
        }
    }

    async function login(email: string, password: string) {
        const res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        localStorage.setItem("kg_token", data.token);
        setToken(data.token);
        setUser(data.user);
    }

    async function register(email: string, password: string, name: string) {
        const res = await fetch(`${API}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed");
        localStorage.setItem("kg_token", data.token);
        setToken(data.token);
        setUser(data.user);
    }

    function logout() {
        localStorage.removeItem("kg_token");
        setToken(null);
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
