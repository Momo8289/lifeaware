import {ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";
import {redirect} from "next/navigation";

/**
 * Get the site URL with proper fallbacks for different environments
 * @returns The properly formatted site URL
 */
export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel in production
    'http://localhost:3000'
  
  // Make sure to include `https://` when not localhost.
  url = url.includes('localhost') ? url : url.startsWith('http') ? url : `https://${url}`
  
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`
  
  return url
} // TODO: Replace with just twMerge where found
export function concatClasses(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
    type: "error" | "success",
    path: string,
    message: string,
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}