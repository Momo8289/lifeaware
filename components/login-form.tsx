import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useIsMobile } from "hooks/use-mobile"
import MicrosoftLogo from "./icons/microsoft-logo"
import GoogleLogo from "./icons/google-logo"
import {concatClasses, getURL} from "utils/helpers"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"
import {twMerge} from "tailwind-merge";

interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  message?: string | null;
}

export function LoginForm({
  className,
  message,
  ...props
}: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOAuthLoading] = useState<string | null>(null)
  const router = useRouter()
  
  useEffect(() => {
    // Handle password reset success message
    if (message === 'password_updated') {
      setSuccessMessage('Your password has been successfully updated. You can now sign in with your new password.')
    }
  }, [message])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        setError(error.message)
      } else {
        // Ensure session is established before redirecting
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (sessionData?.session) {
          // Force complete page reload and direct navigation
          window.location.href = "/dashboard"
        } else {
          setError("Session could not be established. Please try again.")
        }
      }
    } catch (err) {
      setError("An unexpected error occurred.")
      // Silent in production
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuthSignIn(provider: 'azure' | 'google') {
    setError("")
    setOAuthLoading(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          scopes: provider === 'azure' ? 'email user.read profile openid' : 'email',
          redirectTo: `${getURL()}auth/callback?redirect_to=/dashboard`,
        }
      })
      if (error) {
        setError(error.message)
      }
    } catch (e) {
      setError("An error occurred during authentication")
    } finally {
      setOAuthLoading(null)
    }
  }

  return (
    <div className={twMerge("flex flex-col gap-6 w-full", className)} {...props}>
      <div className="space-y-6 w-full">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to your Lifeaware account
          </p>
        </div>
        
        {successMessage && (
          <Alert className="border-green-500 text-green-700 bg-green-50">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <AlertDescription>
              {successMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            type="button" 
            className="w-full" 
            onClick={() => handleOAuthSignIn('google')}
            disabled={oauthLoading !== null}
          >
            <GoogleLogo className="mr-2" />
            {oauthLoading === 'google' ? "Connecting..." : "Login with Google"}
          </Button>
          
          <Button 
            variant="outline" 
            type="button" 
            className="w-full" 
            onClick={() => handleOAuthSignIn('azure')}
            disabled={oauthLoading !== null}
          >
            <MicrosoftLogo className="mr-2" />
            {oauthLoading === 'azure' ? "Connecting..." : "Login with Microsoft"}
          </Button>
        </div>
        
        <div className="text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="underline underline-offset-4">
            Sign up
          </Link>
        </div>
      </div>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By clicking continue, you agree to our{" "}
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </div>
    </div>
  )
} 