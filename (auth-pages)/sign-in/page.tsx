import { HeartPulse } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default function SignInPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium hover:text-primary transition-colors">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HeartPulse className="size-4" />
          </div>
          Lifeaware
        </Link>
        <LoginForm />
      </div>
    </div>
  );
} 