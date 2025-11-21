"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

interface AddTaskDialogProps {
    sections: { id: string; name: string }[]
    onAddTask: (task: { content: string; dueString: string; priority: number; sectionId?: string; duration?: number }) => Promise<void>
}

export function AddTaskDialog({ sections, onAddTask }: AddTaskDialogProps) {
    const [open, setOpen] = useState(false)
    const [content, setContent] = useState("")
    const [dueString, setDueString] = useState("Today")
    const [priority, setPriority] = useState("1")
    const [sectionId, setSectionId] = useState<string>("all")
    const [duration, setDuration] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content) return

        setIsLoading(true)
        try {
            await onAddTask({
                content,
                dueString,
                priority: parseInt(priority),
                sectionId: sectionId === "all" ? undefined : sectionId,
                duration: duration ? parseInt(duration) : undefined
            })
            setOpen(false)
            setContent("")
            setDueString("Today")
            setPriority("1")
            setSectionId("all")
            setDuration("")
        } catch (error) {
            console.error("Failed to add task", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                    <Plus className="h-4 w-4" />
                    Add Task
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="content">Task Name</Label>
                        <Input
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="e.g., Math Homework"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="due">Due Date</Label>
                            <Input
                                id="due"
                                value={dueString}
                                onChange={(e) => setDueString(e.target.value)}
                                placeholder="e.g., Today, Tomorrow"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="duration">Duration (minutes)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                placeholder="e.g., 30"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="4">Urgent (P1)</SelectItem>
                                    <SelectItem value="3">High (P2)</SelectItem>
                                    <SelectItem value="2">Medium (P3)</SelectItem>
                                    <SelectItem value="1">Normal (P4)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="section">Section</Label>
                            <Select value={sectionId} onValueChange={setSectionId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select section" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">None</SelectItem>
                                    {sections.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Adding..." : "Add Task"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
