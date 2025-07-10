import {ReactNode} from "react";
import {createClient} from "@/utils/supabase/server";
import {redirect, RedirectType} from "next/navigation";

export default async function Layout({children}: {children: ReactNode}) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!user || error) {
        redirect("/sign-in", RedirectType.replace)
    }
    return (
        <>{children}</>
    )
}