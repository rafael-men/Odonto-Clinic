import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { COOKIE_NAME, readPatientCookieValue } from "@/lib/patient-session";

//primeira barreira de acesso, as páginas e actions continuam verificando a sessão
const clinicGuard = auth((req) => {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/dashboard") && !req.auth) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (pathname.startsWith("/paciente/consultas")) {
        const raw = req.cookies.get(COOKIE_NAME)?.value;
        if (!raw || !readPatientCookieValue(raw)) {
            return NextResponse.redirect(new URL("/paciente/login", req.url));
        }
    }

    return NextResponse.next();
});

export default clinicGuard;

export const config = {
    matcher: ["/dashboard/:path*", "/paciente/consultas/:path*"],
};