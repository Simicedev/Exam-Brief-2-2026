import type { AuthSession } from "../api/interfaceHolidazeApi";

const AUTH_STORAGE_KEY = "holidaze.auth.session";
const AUTH_CHANGED_EVENT = "holidaze-auth-changed";

function notifyAuthChanged() {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

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
    notifyAuthChanged();
}

export function clearStoredSession() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    notifyAuthChanged();
}

export function addAuthChangedListener(listener: () => void) {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    window.addEventListener(AUTH_CHANGED_EVENT, listener);

    return () => {
        window.removeEventListener(AUTH_CHANGED_EVENT, listener);
    };
}

export function getAccessToken() {
    return getStoredSession()?.accessToken ?? null;
}

export function isAuthenticated() {
    return Boolean(getAccessToken());
}

