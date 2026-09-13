// Type definitions for Supabase Edge Functions in Deno environment
declare const Deno: {
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
};

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string }
  ): void;
}
