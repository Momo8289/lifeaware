"use client"
import {resetPasswordAction} from "@/app/actions";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import AuthLayout from "@/components/AuthLayout";
import {SubmitButton} from "@/components/submit-button";
import {FormMessage, Message} from "@/components/form-message";
import {redirect, useSearchParams} from "next/navigation";
import {useState} from "react";

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    if(!searchParams.get("code")) {
        redirect("/sign-in")
    }
    const [password, setPassword] = useState("")
    const [confirmedPassword, setConfirmedPassword] = useState("")

    const message: Message = (() => {
        const type = searchParams.get("type");
        const messageText = searchParams.get("message")
        const successText = searchParams.get("success")
        const errorText = searchParams.get("error")

        if (successText) {
            return {success: successText};
        } else if (errorText) {
            return {error: errorText};
        } else if (messageText) {
            return {message: messageText};
        }

        return {message: ""};
    })();

    return (
        <AuthLayout>
            <div className="w-full">
                <div className="space-y-2 text-center mb-6">
                    <h1 className="text-3xl font-bold">Reset Password</h1>
                    <p className="text-muted-foreground">
                        Enter a new password to use for your account.
                    </p>
                    <p className="text-muted-foreground">
                        This will sign you out of all other devices.
                    </p>
                </div>
            </div>
            <form action={resetPasswordAction}>
                <Label htmlFor="password">New password</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" id="password"
                       name="password" className="mb-4"/>
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="mb-4">
                    <Input value={confirmedPassword} onChange={(e) => setConfirmedPassword(e.target.value)} type="password"
                           id="confirmPassword" name="confirmPassword" className="mb-1"/>
                    <span className="text-warning">{(!!confirmedPassword && (password !== confirmedPassword)) && "Passwords do not match"}</span>
                </div>
                <input type="hidden" value={searchParams.get("code") as string} name="code"/>
                <SubmitButton disabled={!password || password !== confirmedPassword} className="w-full">
                    Reset password
                </SubmitButton>
                {Object.keys(message).length > 0 && Object.values(message)[0] !== "" && (
                    <FormMessage message={message}/>
                )}
            </form>
        </AuthLayout>
    )
}