## Supabase Edge Functions

This folder contains the Edge Function for account management in the LifeAware application.

### User Self-Deletion Function

The `user-self-deletion` function allows users to permanently delete their accounts and all associated data, including:
- Auth user record
- Profile data
- Avatar files in storage

### Local Development

To develop and test Edge Functions locally, you need Docker Desktop installed:
- [Docker Desktop Installation](https://docs.docker.com/desktop)

After installing Docker, run the Supabase local development environment:

```bash
npx supabase start
```

### Deployment

To deploy the Edge Function to your Supabase project:

```bash
# Deploy the function
npx supabase functions deploy user-self-deletion

# Or deploy all functions at once
npx supabase functions deploy
```

### Implementation Details

The `user-self-deletion` function:
- Requires authentication (Bearer token)
- Deletes user's avatar from storage if it exists
- Deletes user's profile data
- Deletes the user from auth.users using admin.deleteUser
- Returns a success/error response

### Usage in Frontend

Example of calling the Edge Function from the frontend:

```typescript
const { data: sessionData } = await supabase.auth.getSession()
const session = sessionData?.session

if (!session) {
  throw new Error('You must be logged in')
}

const { data, error } = await supabase.functions.invoke(
  'user-self-deletion',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }
)
``` 