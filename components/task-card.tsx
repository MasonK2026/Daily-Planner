"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Task } from "@/lib/types"
import { GripVertical, Clock, Calendar, Tag, Check, Trash2, Flag, Play, Pause } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TaskCardProps {
  task: Task
  isOverlay?: boolean
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void
  onComplete?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onToggleTimer?: (taskId: string) => void
  sectionColors?: Record<string, string>
}

export function TaskCard({ task, isOverlay, onUpdateTask, onComplete, onDelete, onToggleTimer, sectionColors }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  })

  const [durationAmount, setDurationAmount] = useState(task.duration?.amount || 15)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(task.content)
  const [editDate, setEditDate] = useState(task.due?.string || "")
  const [isDurationOpen, setIsDurationOpen] = useState(false)

  const getPriorityColor = (p: number) => {
    switch (p) {
      case 4: return "text-red-500" // Urgent
      case 3: return "text-orange-500" // High
      case 2: return "text-blue-500" // Medium
      case 1: return "text-muted-foreground/40" // Normal
      default: return "text-muted-foreground/40"
    }
  }

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const handleDurationSave = () => {
    if (onUpdateTask) {
      onUpdateTask(task.id, {
        duration: {
          amount: durationAmount,
          unit: "minute"
        }
      })
    }
    setIsDurationOpen(false)
  }

  const handleSaveEdit = () => {
    if (onUpdateTask) {
      onUpdateTask(task.id, {
        content: editContent,
        due: editDate ? { ...task.due, string: editDate, date: task.due?.date || "" } as any : null
      })
    }
    setIsEditing(false)
  }

  const progress = task.duration && task.timer
    ? Math.min(100, (task.timer.elapsed / (task.duration.amount * 60)) * 100)
    : 0

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const sectionColor = task.sectionId && sectionColors ? sectionColors[task.sectionId] : undefined

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: sectionColor || undefined,
      }}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md select-none",
        "print:shadow-none print:border-b print:border-x-0 print:border-t-0 print:rounded-none print:bg-transparent print:p-2 print:break-inside-avoid",
        task.isBreak && "bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30 print:bg-transparent",
        isDragging && "opacity-50",
        isOverlay && "cursor-grabbing shadow-2xl scale-105 rotate-2 opacity-100 z-50 ring-2 ring-primary/20",
        !isOverlay && "cursor-grab",
        task.timer?.isPlaying && "border-primary/50 ring-1 ring-primary/20"
      )}
    >
      {/* Progress Bar */}
      {task.timer && task.duration && (
        <div className="absolute left-0 top-0 h-1 w-full overflow-hidden rounded-t-lg bg-secondary/20">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 text-muted-foreground/50 group-hover:text-foreground transition-colors cursor-grab active:cursor-grabbing print:hidden"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {!task.isBreak && (
          <Popover>
            <PopoverTrigger asChild>
              <div className={cn("mt-1 cursor-pointer hover:opacity-80", getPriorityColor(task.priority))}>
                <Flag className="h-3.5 w-3.5 fill-current" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1" onPointerDown={(e) => e.stopPropagation()}>
              <div className="grid gap-1">
                {[4, 3, 2, 1].map((p) => (
                  <Button
                    key={p}
                    variant="ghost"
                    size="sm"
                    className={cn("justify-start h-7 px-2", getPriorityColor(p))}
                    onClick={() => {
                      onUpdateTask?.(task.id, { priority: p })
                    }}
                  >
                    <Flag className="mr-2 h-3.5 w-3.5 fill-current" />
                    <span className="text-xs">
                      {p === 4 ? "Urgent" : p === 3 ? "High" : p === 2 ? "Medium" : "Normal"}
                    </span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2" onPointerDown={(e) => e.stopPropagation()}>
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="h-7 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  placeholder="Due date (e.g. today)"
                  className="h-7 text-xs"
                />
                <Button size="sm" className="h-7 px-2" onClick={handleSaveEdit}>Save</Button>
              </div>
            </div>
          ) : (
            <div onClick={() => setIsEditing(true)} className="cursor-text">
              <p className={cn("truncate text-sm font-medium leading-none print:text-black", task.isBreak && "text-green-700 dark:text-green-400")}>
                {task.content}
              </p>
              {task.description && <p className="mt-1 truncate text-xs text-muted-foreground print:text-gray-600">{task.description}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 print:hidden">
          {onToggleTimer && !task.isBreak && (
            <button
              onClick={() => onToggleTimer(task.id)}
              className={cn(
                "rounded-md p-1 hover:bg-primary/10",
                task.timer?.isPlaying ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
              title={task.timer?.isPlaying ? "Pause" : "Start"}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {task.timer?.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => onComplete?.(task.id)}
            className="rounded-md p-1 text-muted-foreground hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30 dark:hover:text-green-400"
            title="Complete task"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete?.(task.id)}
            className="rounded-md p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="Delete task"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-7 flex-wrap print:pl-0">
        {(task.sectionName || task.projectName) && (
          <div
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white print:text-black print:border print:border-gray-300 print:bg-transparent"
            style={{ backgroundColor: task.projectColor || '#808080' }}
          >
            <Tag className="h-3 w-3" />
            <span>{task.sectionName || task.projectName}</span>
          </div>
        )}

        <Popover open={isDurationOpen} onOpenChange={setIsDurationOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:bg-secondary/80",
                task.duration ? "bg-secondary text-secondary-foreground print:bg-transparent print:text-black print:border print:border-gray-300" : "bg-muted text-muted-foreground hover:text-foreground print:hidden"
              )}
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
            >
              <Clock className="h-3 w-3" />
              <span>
                {task.timer?.elapsed ? formatTime(task.timer.elapsed) : (task.duration ? `${task.duration.amount} ${task.duration.unit === 'minute' ? 'm' : 'h'}` : 'Set time')}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" onPointerDown={(e) => e.stopPropagation()}>
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationAmount}
                  onChange={(e) => setDurationAmount(parseInt(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
              <Button size="sm" onClick={handleDurationSave}>Save</Button>
            </div>
          </PopoverContent>
        </Popover>

        {task.due && (
          <div className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 print:bg-transparent print:text-black print:border print:border-gray-300">
            <Calendar className="h-3 w-3" />
            <span>{task.due.string}</span>
          </div>
        )}
      </div>
    </div>
  )
}
