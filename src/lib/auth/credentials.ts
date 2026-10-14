import { createHash, timingSafeEqual } from "node:crypto";

export function getConfiguredCredentials() {
    const username = process.env.AUTH_USERNAME;
    const password = process.env.AUTH_PASSWORD;
    if (!username || !password) return null;
    return { username, password };
}

function digest(value: string) {
    return createHash("sha256").update(value).digest();
}

/** Constant-time comparison of submitted credentials against the configured account. */
export function credentialsMatch(username: string, password: string): boolean {
    const configured = getConfiguredCredentials();
    if (!configured) return false;
    const userOk = timingSafeEqual(digest(username), digest(configured.username));
    const passOk = timingSafeEqual(digest(password), digest(configured.password));
    return userOk && passOk;
}

/** Whether the login page should display the demo account (public portfolio deployment only). */
export function isDemoMode() {
    return process.env.DEMO_MODE === "true";
}
