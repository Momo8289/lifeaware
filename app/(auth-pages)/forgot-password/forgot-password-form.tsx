'use client';

import { useSearchParams } from "next/navigation";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions";

export default function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  
  // Create the message object based on URL params
  const message: Message = (() => {
    const type = searchParams.get("type");
    const messageText = searchParams.get("message");
    
    if (type === "success" && messageText) {
      return { success: messageText };
    } else if (type === "error" && messageText) {
      return { error: messageText };
    } else if (messageText) {
      return { message: messageText };
    }
    
    return { message: "" };
  })();
  
  return (
    <form className="space-y-4" action={forgotPasswordAction}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" placeholder="you@example.com" required />
      </div>
      
      <SubmitButton className="w-full">
        Send Reset Link
      </SubmitButton>
      
      {Object.keys(message).length > 0 && Object.values(message)[0] !== "" && (
        <FormMessage message={message} />
      )}
      
      <div className="text-center text-sm">
        Remember your password?{" "}
        <Link href="/sign-in" className="underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </form>
  );
} 