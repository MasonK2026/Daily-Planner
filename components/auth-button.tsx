"use client"

import { useState, useEffect } from "react"
import { signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"

export function AuthButton() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user)
            setLoading(false)
        })
        return () => unsubscribe()
    }, [])

    const handleSignIn = async () => {
        try {
            const provider = new GoogleAuthProvider()
            await signInWithPopup(auth, provider)
            toast.success("Signed in successfully")
        } catch (error) {
            console.error("Error signing in:", error)
            toast.error("Failed to sign in")
        }
    }

    const handleSignOut = async () => {
        try {
            await signOut(auth)
            toast.success("Signed out")
        } catch (error) {
            console.error("Error signing out:", error)
            toast.error("Failed to sign out")
        }
    }

    if (loading) {
        return (
            <Button variant="ghost" size="sm" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
        )
    }

    if (user) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden md:inline-block">
                    {user.displayName}
                </span>
                <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    return (
        <Button variant="outline" size="sm" onClick={handleSignIn}>
            Sign In
        </Button>
    )
}
