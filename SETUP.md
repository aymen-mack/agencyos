# Agency Dashboard — Setup Guide

## 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

### Required env vars

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → Webhooks (after step 4) |
| `KIT_CLIENT_ID` | Kit developer settings → OAuth apps |
| `KIT_CLIENT_SECRET` | Kit developer settings → OAuth apps |
| `KIT_REDIRECT_URI` | `https://your-domain/api/integrations/kit/callback` |
| `INTEGRATION_ENCRYPTION_KEY` | Run: `openssl rand -hex 32` |

## 2. Supabase Database Setup

Run the migrations in order against your Supabase project:

```bash
# Using Supabase CLI:
supabase db push

# Or copy/paste each file into the Supabase SQL editor:
# supabase/migrations/001_schema_core.sql
# supabase/migrations/002_rls_policies.sql
# supabase/migrations/003_realtime.sql
```

## 3. Clerk JWT Template for Supabase

In your Clerk Dashboard:
1. Go to **JWT Templates** → **New template**
2. Name it `supabase`
3. Use this payload:
```json
{
  "sub": "{{user.id}}"
}
```
4. Set the signing key to your Supabase JWT secret (Supabase → Settings → API → JWT Secret)

## 4. Clerk Webhooks

In Clerk Dashboard → Webhooks:
1. Add endpoint: `https://your-domain/api/webhooks/clerk`
2. Subscribe to these events:
   - `user.created`, `user.updated`
   - `organization.created`, `organization.updated`
   - `organizationMembership.created`, `organizationMembership.deleted`
3. Copy the **Signing Secret** → set as `CLERK_WEBHOOK_SECRET`

## 5. Kit OAuth App

In Kit Developer settings:
1. Create a new OAuth application
2. Set redirect URI to: `https://your-domain/api/integrations/kit/callback`
3. Copy Client ID and Secret to env vars

## 6. Webhook Configuration for Data Sources

Each webhook URL includes the project ID. Register these URLs in your tools:

| Tool | Webhook URL |
|---|---|
| Typeform | `https://your-domain/api/webhooks/typeform?projectId=YOUR_PROJECT_ID` |
| Make.com | `https://your-domain/api/webhooks/make?projectId=YOUR_PROJECT_ID` |
| Stripe | `https://your-domain/api/webhooks/stripe?projectId=YOUR_PROJECT_ID` |
| Whop | `https://your-domain/api/webhooks/whop?projectId=YOUR_PROJECT_ID` |

For Typeform: Go to **Connect → Webhooks** in your form settings.
For Make.com: Use an HTTP module with POST request to the URL above.

## 7. Deploy to Vercel

```bash
vercel --prod
```

Add all env vars in Vercel dashboard → Project → Settings → Environment Variables.

## 8. First Run

1. Sign up at `/sign-up` → Creates your Clerk account
2. Create an organization in Clerk (or via the Clerk UI component)
3. The Clerk webhook will sync your user + org to Supabase automatically
4. Go to `/admin/projects/new` to create your first client project
5. Go to the project settings → Connect Kit via OAuth
6. Configure webhooks in your data sources

## Realtime Setup Notes

The Supabase Realtime subscription uses your Clerk JWT token (via `getToken({ template: 'supabase' })`). This requires:
- The JWT template named `supabase` to exist in Clerk
- Supabase JWT secret set correctly in the Clerk template signing config

If the realtime indicator shows "Connecting" indefinitely, check browser console for auth errors.
