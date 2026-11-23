import { headers } from "next/headers";
import prisma from './prisma';


export async function getClientIp(): Promise<String> {
   const h = await headers();
   const forwarded = h.get('x-forwarded-for');
   return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || 'unknown';
}



type RateLimitRule = {
  key: string;
  limit: number;
  windowSeconds: number;
};

//Incrementa o contador da chave de forma atômica.
async function consumeRateLimit(rule: RateLimitRule) {
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (
      ${rule.key},
      1,
      NOW() + (${rule.windowSeconds}::int * INTERVAL '1 second')
    )
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."resetAt" < NOW() THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" < NOW()
          THEN NOW() + (${rule.windowSeconds}::int * INTERVAL '1 second')
        ELSE "RateLimit"."resetAt"
      END
    RETURNING "count", "resetAt"
  `;

  const { count, resetAt } = rows[0];
  return {
    allowed: count <= rule.limit,
    retryAfterSeconds: Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
  };
}

export async function enforceRateLimit(rules: RateLimitRule[]) {
  for (const rule of rules) {
    const result = await consumeRateLimit(rule);
    if (!result.allowed) return result;
  }
  return null;
}

export async function resetRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

export function tooManyAttemptsMessage(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Muitas tentativas. Tente novamente em ${minutes} minuto(s).`;
}