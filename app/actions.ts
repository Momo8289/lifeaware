"use server";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {encodedRedirect, getURL} from "@/utils/helpers";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getURL()}auth/callback`,
      },
    });

    if (error) {
      console.error('Sign up error:', error);
      return encodedRedirect("error", "/sign-up", error.message);
    } else {
      return encodedRedirect(
        "success",
        "/sign-up",
        "Thanks for signing up! Please check your email for a verification link.",
      );
    }
  } catch (error) {
    console.error('Unexpected error during sign up:', error);
    return encodedRedirect("error", "/sign-up", "An unexpected error occurred");
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return encodedRedirect("error", "/sign-in", error.message);
    }

    return redirect("/protected");
  } catch (error) {
    console.error('Unexpected error during sign in:', error);
    return encodedRedirect("error", "/sign-in", "An unexpected error occurred");
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  try {
    // Use Supabase's built-in password reset flow
    // The user will get an email with a link to reset their password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // This will direct users back to your app after they set their password in Supabase's UI
      redirectTo: `${getURL()}auth/callback`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return encodedRedirect(
        "error",
        "/forgot-password",
        "Could not reset password",
      );
    }

    // Provide feedback that the email has been sent
    return encodedRedirect(
      "success",
      "/forgot-password",
      "Check your email for a password reset link.",
    );
  } catch (error) {
    console.error('Unexpected error during password reset:', error);
    return encodedRedirect(
      "error", 
      "/forgot-password",
      "An unexpected error occurred"
    );
  }
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('Password update error:', error);
      encodedRedirect(
        "error",
        "/protected/reset-password",
        "Password update failed",
      );
    }

    encodedRedirect("success", "/protected/reset-password", "Password updated");
  } catch (error) {
    console.error('Unexpected error during password update:', error);
    encodedRedirect(
      "error",
      "/protected/reset-password", 
      "An unexpected error occurred"
    );
  }
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect(`${getURL()}`);
};