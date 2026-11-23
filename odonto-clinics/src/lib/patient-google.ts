import {
  Google,
  decodeIdToken,
  generateCodeVerifier,
  generateState,
} from "arctic";

export function getPatientGoogleClient(): Google {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error("AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET e NEXT_PUBLIC_URL precisam estar definidos.");
  }

  const redirectUri = `${baseUrl}/api/paciente/google/callback`;
  return new Google(clientId, clientSecret, redirectUri);
}

export { decodeIdToken, generateCodeVerifier, generateState };