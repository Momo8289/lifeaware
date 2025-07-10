/**
 * Get the site URL with proper fallbacks for different environments
 * @returns The properly formatted site URL
 */
export const getURL = () => {
    let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
        process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel in production
        process.env?.NEXT_PUBLIC_VERCEL_BRANCH_URL ??
        process.env?.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
        'http://localhost:3000'

    // Make sure to include `https://` when not localhost.
    url = url.includes('localhost') ? url : url.startsWith('http') ? url : `https://${url}`

    // Make sure to include a trailing `/`.
    url = url.endsWith('/') ? url : `${url}/`

    return url
} 