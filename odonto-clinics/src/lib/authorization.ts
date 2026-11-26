import { auth } from "@/lib/auth";

export type AuthorizationErrorCode = "UNAUTHENTICATED" | "FORBIDDEN";

export class AuthorizationError extends Error {
    readonly code: AuthorizationErrorCode;

    constructor(code: AuthorizationErrorCode) {
        super(code);
        this.name = "AuthorizationError";
        this.code = code;
    }
}

export async function requireSessionUserId(): Promise<string> {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) throw new AuthorizationError("UNAUTHENTICATED");
    return id;
}


export async function requireOwnUserId(requestedUserId?: string | null): Promise<string> {
    const sessionUserId = await requireSessionUserId();

    if (requestedUserId === undefined || requestedUserId === null) {
        return sessionUserId;
    }
    if (requestedUserId !== sessionUserId) {
        throw new AuthorizationError("FORBIDDEN");
    }
    return sessionUserId;
}
