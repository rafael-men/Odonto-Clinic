import { createHash, createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "patient_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signinKey(): Buffer {
   const secret = process.env.AUTH_SECRET;
   if (!secret) {
      throw new Error("AUTH_SECRET não está definido.");
   }
   return createHmac("sha256", secret).update("patient-session-key").digest();

}

const sign = function (data: string): string {
   return createHmac('sha256', signinKey()).update(data).digest('base64url');
}


// Hash of the credential fields. Changing the password or linking Google
// invalidates existing sessions. The raw values never go into the cookie.
export function patientFingerprint(patient: {
   password: string | null;
   googleId: string | null;
}): string {
   const material = `${patient.password ?? ""}|${patient.googleId ?? ""}`;
   return createHash("sha256").update(material).digest("base64url").slice(0, 22);
}

type SessionPayload = {
   id: string;
   fp: string;
   exp: number;
};

export function createPatientCookieValue(patientId: string, fingerprint: string): string {
   const payload: SessionPayload = {
      id: patientId,
      fp: fingerprint,
      exp: Date.now() + SESSION_TTL_MS,
   };
   const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
   return `${encoded}.${sign(encoded)}`;
}

export function readPatientCookieValue(value: string): SessionPayload | null {
   const parts = value.split(".");
   if (parts.length !== 2) return null;
   const [encoded, signature] = parts;

   const expected = Buffer.from(sign(encoded));
   const received = Buffer.from(signature);
   if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return null;
   }

   let payload: SessionPayload;
   try {
      payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
   } catch {
      return null;
   }

   if (
      typeof payload.id !== "string" ||
      typeof payload.fp !== "string" ||
      typeof payload.exp !== "number"
   ) {
      return null;
   }
   if (payload.exp < Date.now()) return null;

   return payload;
}

export const patientCookieOptions = {
   httpOnly: true,
   secure: process.env.NODE_ENV === "production",
   sameSite: "lax" as const,
   path: "/",
   maxAge: SESSION_TTL_MS / 1000,
};

export { COOKIE_NAME };