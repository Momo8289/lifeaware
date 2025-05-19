# Supabase Edge Functions

This directory contains Supabase Edge Functions for the LifeAware application.

## Available Functions

- `user-self-deletion`: Handles complete user account deletion including auth data

## Deployment Instructions

Before deploying, make sure you have:

1. Installed the Supabase CLI: `npm install -g supabase`
2. Logged in to your Supabase account: `supabase login`
3. Linked your project: `supabase link --project-ref YOUR_PROJECT_REF`

To deploy a function:

```bash
# Make sure you're in the project root directory
cd /path/to/lifeaware

# Deploy the user-self-deletion function
supabase functions deploy user-self-deletion

# Verify deployment
supabase functions list
```

## Local Development

To run and test functions locally:

```bash
# Start functions emulator
supabase functions serve

# In another terminal, invoke the function locally
curl -i --location --request POST 'http://localhost:54321/functions/v1/user-self-deletion' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json'
```

## Important Notes

- The `user-self-deletion` function requires `service_role` privileges to delete users from the auth.users table
- Make sure your RLS policies allow the authenticated user to delete their profile data
- Ensure the "Storage cascade delete" setting is enabled if you store user files 