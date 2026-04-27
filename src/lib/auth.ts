import type { AuthSession } from "../api/interfaceHolidazeApi";

const AUTH_STORAGE_KEY = "holidaze.auth.session";

export function getStoredSession(): AuthSession | null {
    if (typeof window === "undefined") {
        return null;
    }

    const value = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value) as AuthSession;
    } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
}

export function setStoredSession(session: AuthSession) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAccessToken() {
    return getStoredSession()?.accessToken ?? null;
}

export function isAuthenticated() {
    return Boolean(getAccessToken());
}

