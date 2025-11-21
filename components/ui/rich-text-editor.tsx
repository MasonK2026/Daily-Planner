"use client"

import * as React from "react"
import { Bold, Italic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RichTextEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    value: string
    onChange: (value: string) => void
}

export function RichTextEditor({ value, onChange, className, ...props }: RichTextEditorProps) {
    const editorRef = React.useRef<HTMLDivElement>(null)
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    // Initial content set
    React.useEffect(() => {
        if (isMounted && editorRef.current && !editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value
        }
    }, [isMounted])

    // Sync external value to editor content only when not focused or empty (to avoid cursor jumping)
    React.useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value && document.activeElement !== editorRef.current) {
            editorRef.current.innerHTML = value
        }
    }, [value])

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML)
    }

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value)
        editorRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            execCommand('bold')
        } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            execCommand('italic')
        }
    }

    if (!isMounted) return null

    return (
        <div className={cn("flex flex-col rounded-md border border-input bg-background", className)} {...props}>
            <div className="flex items-center gap-1 border-b p-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand('bold')}
                    title="Bold (Ctrl+B)"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand('italic')}
                    title="Italic (Ctrl+I)"
                >
                    <Italic className="h-4 w-4" />
                </Button>
            </div>
            <div
                ref={editorRef}
                className="min-h-[150px] p-3 focus:outline-none prose prose-sm dark:prose-invert max-w-none"
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
            />
        </div>
    )
}

