import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decodeIdToken, getPatientGoogleClient } from "@/lib/patient-google";
import {
  COOKIE_NAME,
  createPatientCookieValue,
  patientCookieOptions,
  patientFingerprint,
} from "@/lib/patient-session";

type GoogleClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function failure(request: NextRequest, reason: "google" | "email" | "conflito") {
  const url = new URL("/paciente/login", request.url);
  url.searchParams.set("erro", reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete("patient_oauth_state");
  response.cookies.delete("patient_oauth_verifier");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("patient_oauth_state")?.value;
  const codeVerifier = request.cookies.get("patient_oauth_verifier")?.value;

  // Confere o state para impedir que um link forjado complete o login de outra pessoa.
  if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
    return failure(request, "google");
  }

  let claims: GoogleClaims;
  try {
    const tokens = await getPatientGoogleClient().validateAuthorizationCode(code, codeVerifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch (err) {
    console.error("Login Google do paciente falhou:", err instanceof Error ? err.message : err);
    return failure(request, "google");
  }

  if (!claims.email || claims.email_verified !== true) {
    return failure(request, "email");
  }

  const email = claims.email.toLowerCase();
  const name = claims.name || email.split("@")[0];

  let patient = await prisma.patient.findUnique({ where: { googleId: claims.sub } });

  if (!patient) {
    const byEmail = await prisma.patient.findUnique({ where: { email } });

    if (byEmail) {
      if (byEmail.googleId) return failure(request, "conflito");

      // A senha é removida ao vincular. Quem criou a conta com esse e-mail sem
      // verificação perde o acesso, e só o dono do e-mail no Google continua entrando.
      patient = await prisma.patient.update({
        where: { id: byEmail.id },
        data: { googleId: claims.sub, password: null },
      });
    } else {
      patient = await prisma.patient.create({
        data: { name, email, googleId: claims.sub, password: null },
      });
    }
  }

  const response = NextResponse.redirect(new URL("/paciente/consultas", request.url));
  response.cookies.set(
    COOKIE_NAME,
    createPatientCookieValue(patient.id, patientFingerprint(patient)),
    patientCookieOptions,
  );
  response.cookies.delete("patient_oauth_state");
  response.cookies.delete("patient_oauth_verifier");
  return response;
}