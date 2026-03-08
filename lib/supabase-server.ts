// FILE: lib/supabase-server.ts
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { mustGetEnv } from "./env";

/**
 * For Next.js Route Handlers:
 * - We read cookies from the request headers (string)
 * - We write cookies via the Response headers
 *
 * This avoids Next's cookies() API differences.
 */
export function supabaseRoute(req: Request) {
  let responseHeaders = new Headers();

  const supabase = createServerClient(
    mustGetEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustGetEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get("cookie") || "";
          // Parse "a=b; c=d" -> [{name, value}, ...]
          return cookieHeader
            .split(";")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((pair) => {
              const eq = pair.indexOf("=");
              const name = eq >= 0 ? pair.slice(0, eq) : pair;
              const value = eq >= 0 ? pair.slice(eq + 1) : "";
              return { name, value };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Minimal Set-Cookie serialization
            let cookie = `${name}=${value}`;

            if (options?.path) cookie += `; Path=${options.path}`;
            if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`;
            if (options?.domain) cookie += `; Domain=${options.domain}`;
            if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
            if (options?.secure) cookie += `; Secure`;
            if (options?.httpOnly) cookie += `; HttpOnly`;

            responseHeaders.append("Set-Cookie", cookie);
          });
        },
      },
    }
  );

  return { supabase, responseHeaders };
}

// Server-only, powerful key (DO NOT use in client)
export function supabaseAdmin() {
  return createClient(
    mustGetEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustGetEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}