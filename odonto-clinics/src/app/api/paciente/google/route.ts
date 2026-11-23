import { NextResponse } from "next/server";
import {
  generateCodeVerifier,
  generateState,
  getPatientGoogleClient,
} from "@/lib/patient-google";

const SHORT_LIVED = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
};

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = getPatientGoogleClient().createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  const response = NextResponse.redirect(url);
  response.cookies.set("patient_oauth_state", state, SHORT_LIVED);
  response.cookies.set("patient_oauth_verifier", codeVerifier, SHORT_LIVED);
  return response;
}