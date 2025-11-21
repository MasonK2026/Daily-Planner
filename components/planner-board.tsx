"use client"

import { useState, useEffect, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Column } from "./column"
import { TaskCard } from "./task-card"
import { SettingsDialog } from "./settings-dialog"
import { Task } from "@/lib/types"
import { fetchTodoistTasks, closeTodoistTask, deleteTodoistTask, updateTodoistTask, addTodoistTask } from "@/app/actions"
import { Loader2, RefreshCw, Coffee, CheckCircle2, Circle, Printer, Filter } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddTaskDialog } from "./add-task-dialog"
import { toast } from "sonner"
import { v4 as uuidv4 } from 'uuid'
import { cn } from "@/lib/utils"
import { db, auth } from "@/lib/firebase"
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore"
import { onAuthStateChanged, User } from "firebase/auth"
import { AuthButton } from "./auth-button"

// Mock data for initial state or fallback
const MOCK_TASKS: Task[] = [
  {
    id: "1",
    content: "Review project proposal",
    description: "Check the budget and timeline sections",
    duration: { amount: 30, unit: "minute" },
    due: { date: "2024-03-20", string: "Mar 20", lang: "en", is_recurring: false },
    priority: 4,
    labels: [],
    isCompleted: false,
  },
  {
    id: "2",
    content: "Team sync",
    description: "Weekly standup meeting",
    duration: { amount: 15, unit: "minute" },
    priority: 3,
    labels: [],
    isCompleted: false,
  },
  {
    id: "3",
    content: "Write documentation",
    description: "Update the API docs",
    duration: { amount: 60, unit: "minute" },
    priority: 2,
    labels: [],
    isCompleted: false,
  },
]

export function PlannerBoard() {
  const [poolTasks, setPoolTasks] = useState<Task[]>(MOCK_TASKS)
  const [scheduleTasks, setScheduleTasks] = useState<Task[]>([])
  const [unsortedScheduleTasks, setUnsortedScheduleTasks] = useState<Task[]>([])
  const [isScheduleSorted, setIsScheduleSorted] = useState(false)
  const [unsortedPoolTasks, setUnsortedPoolTasks] = useState<Task[]>([])
  const [isPoolSorted, setIsPoolSorted] = useState(false)
  const [laterTasks, setLaterTasks] = useState<Task[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeContainer, setActiveContainer] = useState<string | null>(null)
  const [apiToken, setApiToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [notes, setNotes] = useState("")
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [sectionColors, setSectionColors] = useState<Record<string, string>>({})
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("all")
  const [poolSortMode, setPoolSortMode] = useState<"default" | "class">("default")

  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Firestore Sync Listener
  useEffect(() => {
    if (!user) {
      // If not logged in, load from localStorage as fallback
      const storedToken = localStorage.getItem("todoist_api_token")
      const storedNotes = localStorage.getItem("daily_notes")
      const storedPool = localStorage.getItem("pool_tasks")
      const storedSchedule = localStorage.getItem("schedule_tasks")
      const storedLater = localStorage.getItem("later_tasks")
      const storedColors = localStorage.getItem("section_colors")

      if (storedColors) setSectionColors(JSON.parse(storedColors))
      if (storedPool) setPoolTasks(JSON.parse(storedPool))
      if (storedSchedule) setScheduleTasks(JSON.parse(storedSchedule))
      if (storedLater) setLaterTasks(JSON.parse(storedLater))
      if (storedNotes) setNotes(storedNotes)
      if (storedToken) {
        setApiToken(storedToken)
        // We don't auto-fetch here to avoid double fetching if logic is complex, 
        // but we can if we want. For now let's just load state.
      }
      return
    }

    const userDocRef = doc(db, "users", user.uid)

    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data()
        setPoolTasks(data.poolTasks || [])
        setScheduleTasks(data.scheduleTasks || [])
        setLaterTasks(data.laterTasks || [])
        setNotes(data.notes || "")
        setSectionColors(data.sectionColors || {})
        if (data.todoistApiToken) setApiToken(data.todoistApiToken)
      } else {
        // New user, maybe initialize with defaults?
        // For now, just don't overwrite local state if it's already set (e.g. from MOCK)
      }
    }, (error) => {
      console.error("Firestore sync error:", error)
      toast.error("Failed to sync data")
    })

    return () => unsubscribe()
  }, [user])

  // Save to Firestore (Debounced) OR LocalStorage
  useEffect(() => {
    if (isAuthLoading) return

    if (!user) {
      // Save to localStorage if not logged in
      localStorage.setItem("daily_notes", notes)
      localStorage.setItem("pool_tasks", JSON.stringify(poolTasks))
      localStorage.setItem("schedule_tasks", JSON.stringify(scheduleTasks))
      localStorage.setItem("later_tasks", JSON.stringify(laterTasks))
      localStorage.setItem("section_colors", JSON.stringify(sectionColors))
      return
    }

    const saveData = async () => {
      try {
        await setDoc(doc(db, "users", user.uid), {
          poolTasks,
          scheduleTasks,
          laterTasks,
          notes,
          sectionColors,
          todoistApiToken: apiToken
        }, { merge: true })
      } catch (error) {
        console.error("Error saving to Firestore:", error)
      }
    }

    const timeoutId = setTimeout(saveData, 1000) // Debounce 1s
    return () => clearTimeout(timeoutId)
  }, [poolTasks, scheduleTasks, laterTasks, notes, sectionColors, apiToken, user, isAuthLoading])

  // Timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      setScheduleTasks(prev => prev.map(t => {
        if (t.timer?.isPlaying) {
          return {
            ...t,
            timer: {
              ...t.timer,
              elapsed: (t.timer.elapsed || 0) + 1,
              isPlaying: true
            }
          }
        }
        return t
      }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleFetchTasks = async (token: string, currentPool: Task[] = [], currentSchedule: Task[] = [], currentLater: Task[] = []) => {
    if (!token) return
    setIsLoading(true)
    try {
      const { tasks, sections: fetchedSections, error } = await fetchTodoistTasks(token)
      if (fetchedSections) {
        setSections(fetchedSections)
      }
      if (error) {
        toast.error(error)
      } else {
        const scheduleIds = new Set(currentSchedule.map((t) => t.id))
        const laterIds = new Set(currentLater.map((t) => t.id))

        const allExistingTasks = new Map([
          ...currentPool,
          ...currentSchedule,
          ...currentLater
        ].map(t => [t.id, t]))

        const availableTasks = tasks.filter((t) => !scheduleIds.has(t.id) && !laterIds.has(t.id))

        setPoolTasks(prevPool => {
          return availableTasks.map(t => {
            const existing = allExistingTasks.get(t.id)
            let finalDuration = t.duration

            if (!finalDuration && existing?.duration) {
              finalDuration = existing.duration
            }

            return {
              ...t,
              duration: finalDuration,
              timer: existing?.timer
            }
          })
        })

        toast.success("Tasks synced with Todoist")
      }
    } catch (err) {
      toast.error("Failed to sync tasks")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveToken = (token: string) => {
    setApiToken(token)
    if (!user) {
      localStorage.setItem("todoist_api_token", token)
    }
    handleFetchTasks(token, poolTasks, scheduleTasks, laterTasks)
  }

  const handleCompleteTask = async (taskId: string) => {
    const removeTask = (list: Task[]) => list.filter(t => t.id !== taskId)
    setPoolTasks(prev => removeTask(prev))
    setScheduleTasks(prev => removeTask(prev))
    setLaterTasks(prev => removeTask(prev))
    toast.success("Task completed")

    if (apiToken) {
      const success = await closeTodoistTask(apiToken, taskId)
      if (!success) {
        toast.error("Failed to sync completion with Todoist")
      }
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const removeTask = (list: Task[]) => list.filter(t => t.id !== taskId)
    setPoolTasks(prev => removeTask(prev))
    setScheduleTasks(prev => removeTask(prev))
    setLaterTasks(prev => removeTask(prev))
    toast.success("Task deleted")

    if (apiToken) {
      const success = await deleteTodoistTask(apiToken, taskId)
      if (!success) {
        toast.error("Failed to sync deletion with Todoist")
      }
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const updateList = (list: Task[]) =>
      list.map(t => t.id === taskId ? { ...t, ...updates } : t)

    setPoolTasks(prev => updateList(prev))
    setScheduleTasks(prev => updateList(prev))
    setLaterTasks(prev => updateList(prev))

    if (apiToken && (updates.content || updates.due || updates.priority)) {
      const todoistUpdates: any = {}
      if (updates.content) todoistUpdates.content = updates.content
      if (updates.due) todoistUpdates.due_string = updates.due.string
      if (updates.priority) todoistUpdates.priority = updates.priority

      const success = await updateTodoistTask(apiToken, taskId, todoistUpdates)
      if (!success) {
        toast.error("Failed to sync update with Todoist")
      }
    }
  }

  const handleAddTask = async (task: { content: string; dueString: string; priority: number; sectionId?: string; duration?: number }) => {
    if (!apiToken) return

    let finalContent = task.content
    if (task.duration) {
      const hours = Math.floor(task.duration / 60)
      const mins = task.duration % 60
      const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
      finalContent = `${task.content} - ${timeString}`
    }

    const success = await addTodoistTask(apiToken, {
      content: finalContent,
      due_string: task.dueString,
      priority: task.priority,
      section_id: task.sectionId
    })

    if (success) {
      toast.success("Task added to Todoist")
      handleFetchTasks(apiToken, poolTasks, scheduleTasks, laterTasks)
    } else {
      toast.error("Failed to add task")
    }
  }

  const handleToggleTimer = (taskId: string) => {
    setScheduleTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const isPlaying = !t.timer?.isPlaying
        return {
          ...t,
          timer: {
            elapsed: t.timer?.elapsed || 0,
            isPlaying,
            lastStartedAt: isPlaying ? Date.now() : undefined
          }
        }
      }
      if (t.timer?.isPlaying) {
        return {
          ...t,
          timer: {
            ...t.timer,
            isPlaying: false
          }
        }
      }
      return t
    }))
  }

  function findContainer(id: string) {
    if (poolTasks.find((t) => t.id === id)) return "pool"
    if (scheduleTasks.find((t) => t.id === id)) return "schedule"
    if (laterTasks.find((t) => t.id === id)) return "later"
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const id = active.id as string
    const task = poolTasks.find((t) => t.id === id) ||
      scheduleTasks.find((t) => t.id === id) ||
      laterTasks.find((t) => t.id === id)
    setActiveTask(task || null)
    setActiveContainer(findContainer(id))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    const overId = over?.id

    if (!overId || active.id === overId) return

    const activeContainer = findContainer(active.id as string)
    const overContainer =
      overId === "pool" || overId === "schedule" || overId === "later"
        ? overId
        : findContainer(overId as string)

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return
    }

    const containers = {
      pool: { items: poolTasks, setter: setPoolTasks },
      schedule: { items: scheduleTasks, setter: setScheduleTasks },
      later: { items: laterTasks, setter: setLaterTasks }
    }

    const activeList = containers[activeContainer as keyof typeof containers]
    const overList = containers[overContainer as keyof typeof containers]

    if (activeList && overList) {
      const isAlreadyInOverList = overList.items.some(t => t.id === active.id)

      if (!isAlreadyInOverList) {
        activeList.setter((items) => {
          const activeIndex = items.findIndex((t) => t.id === active.id)
          return items.filter((_, index) => index !== activeIndex)
        })

        overList.setter((items) => {
          const task = activeTask!
          const overIndex = items.findIndex((t) => t.id === overId)
          const newIndex = overIndex >= 0 ? overIndex : items.length
          return [...items.slice(0, newIndex), task, ...items.slice(newIndex)]
        })
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const activeId = active.id as string
    const overId = over?.id as string

    if (!overId || !activeTask) {
      setActiveTask(null)
      setActiveContainer(null)
      return
    }

    const sourceContainer = findContainer(activeId)
    const targetContainer =
      overId === "pool" || overId === "schedule" || overId === "later"
        ? overId
        : findContainer(overId)

    if (!sourceContainer || !targetContainer) {
      setActiveTask(null)
      setActiveContainer(null)
      return
    }

    if (sourceContainer !== targetContainer) {
      const containers = {
        pool: { items: poolTasks, setter: setPoolTasks },
        schedule: { items: scheduleTasks, setter: setScheduleTasks },
        later: { items: laterTasks, setter: setLaterTasks }
      }

      const source = containers[sourceContainer as keyof typeof containers]
      const target = containers[targetContainer as keyof typeof containers]

      source.setter((items) => items.filter((t) => t.id !== activeId))

      target.setter((items) => {
        const overIndex = items.findIndex((t) => t.id === overId)
        const insertIndex = overIndex >= 0 ? overIndex : items.length
        return [...items.slice(0, insertIndex), activeTask, ...items.slice(insertIndex)]
      })
    } else {
      const containers = {
        pool: { items: poolTasks, setter: setPoolTasks },
        schedule: { items: scheduleTasks, setter: setScheduleTasks },
        later: { items: laterTasks, setter: setLaterTasks }
      }

      const container = containers[sourceContainer as keyof typeof containers]
      const activeIndex = container.items.findIndex((t) => t.id === activeId)
      const overIndex = container.items.findIndex((t) => t.id === overId)

      if (activeIndex !== overIndex && activeIndex !== -1 && overIndex !== -1) {
        container.setter((items) => arrayMove(items, activeIndex, overIndex))
      }
    }

    setActiveTask(null)
    setActiveContainer(null)
  }

  const handleAddBreak = () => {
    const breakTask: Task = {
      id: `break-${uuidv4()}`,
      content: "Break",
      duration: { amount: 15, unit: "minute" },
      priority: 1,
      labels: [],
      isCompleted: false,
      isBreak: true,
    }
    setScheduleTasks(prev => [...prev, breakTask])
  }

  const handleToggleScheduleSort = () => {
    if (isScheduleSorted) {
      setScheduleTasks(unsortedScheduleTasks)
      setIsScheduleSorted(false)
    } else {
      setUnsortedScheduleTasks([...scheduleTasks])

      const sorted = [...scheduleTasks].sort((a, b) => {
        if (a.due?.date && !b.due?.date) return -1
        if (!a.due?.date && b.due?.date) return 1
        if (a.due?.date && b.due?.date) {
          const dateCompare = a.due.date.localeCompare(b.due.date)
          if (dateCompare !== 0) return dateCompare
        }

        return b.priority - a.priority
      })

      setScheduleTasks(sorted)
      setIsScheduleSorted(true)
    }
  }

  const handleTogglePoolSort = () => {
    if (isPoolSorted) {
      setPoolTasks(unsortedPoolTasks)
      setIsPoolSorted(false)
    } else {
      setUnsortedPoolTasks([...poolTasks])

      const sorted = [...poolTasks].sort((a, b) => {
        if (poolSortMode === "class") {
          const sectionA = a.sectionName || ""
          const sectionB = b.sectionName || ""
          const sectionCompare = sectionA.localeCompare(sectionB)
          if (sectionCompare !== 0) return sectionCompare

          if (a.due?.date && !b.due?.date) return -1
          if (!a.due?.date && b.due?.date) return 1
          if (a.due?.date && b.due?.date) {
            const dateCompare = a.due.date.localeCompare(b.due.date)
            if (dateCompare !== 0) return dateCompare
          }

          const durationA = a.duration ? (a.duration.unit === 'hour' ? a.duration.amount * 60 : a.duration.amount) : 0
          const durationB = b.duration ? (b.duration.unit === 'hour' ? b.duration.amount * 60 : b.duration.amount) : 0
          if (durationA !== durationB) return durationB - durationA

          return b.priority - a.priority
        }

        if (a.due?.date && !b.due?.date) return -1
        if (!a.due?.date && b.due?.date) return 1
        if (a.due?.date && b.due?.date) {
          const dateCompare = a.due.date.localeCompare(b.due.date)
          if (dateCompare !== 0) return dateCompare
        }

        const durationA = a.duration ? (a.duration.unit === 'hour' ? a.duration.amount * 60 : a.duration.amount) : 0
        const durationB = b.duration ? (b.duration.unit === 'hour' ? b.duration.amount * 60 : b.duration.amount) : 0
        if (durationA !== durationB) return durationB - durationA

        return b.priority - a.priority
      })

      setPoolTasks(sorted)
      setIsPoolSorted(true)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const totalDurationMinutes = scheduleTasks.reduce((acc, task) => {
    if (task.duration?.unit === 'minute') return acc + task.duration.amount
    if (task.duration?.unit === 'hour') return acc + (task.duration.amount * 60)
    return acc
  }, 0)

  const hours = Math.floor(totalDurationMinutes / 60)
  const minutes = totalDurationMinutes % 60
  const durationString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="hidden print:block print:mb-4">
        <h1 className="text-2xl font-bold">Daily Plan</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <header className="flex items-center justify-between border-b px-6 py-3 print:hidden">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary" />
          <h1 className="text-lg font-semibold">Focus Planner</h1>
        </div>
        <div className="flex items-center gap-2">
          <AuthButton />
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFetchTasks(apiToken, poolTasks, scheduleTasks, laterTasks)}
            disabled={isLoading || !apiToken}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync
          </Button>
          <SettingsDialog
            apiToken={apiToken}
            onSave={handleSaveToken}
            sections={sections}
            sectionColors={sectionColors}
            onSaveColors={setSectionColors}
          />
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden p-6 print:overflow-visible print:p-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-[2fr_1fr] print:h-auto print:gap-4">
            <div className="h-full min-h-0 lg:col-span-1 print:col-span-1 print:h-auto">
              <Column
                id="schedule"
                title="Daily Plan"
                description="Drag tasks here to plan your day"
                tasks={scheduleTasks}
                summary={durationString}
                headerAction={
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-8 w-8", isScheduleSorted && "bg-primary/10 text-primary")}
                      onClick={handleToggleScheduleSort}
                      title="Sort by Due Date & Priority"
                    >
                      {isScheduleSorted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                      onClick={handleAddBreak}
                    >
                      <Coffee className="h-3.5 w-3.5" />
                      <span className="text-xs">Break</span>
                    </Button>
                  </div>
                }
                onUpdateTask={handleUpdateTask}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
                onToggleTimer={handleToggleTimer}
                sectionColors={sectionColors}
              >
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Daily Notes</h3>
                  <RichTextEditor
                    className="min-h-[150px] bg-background/50 print:min-h-[100px] print:border-none print:p-2"
                    value={notes}
                    onChange={setNotes}
                  />
                </div>
              </Column>
            </div>

            <div className="flex h-full min-h-0 flex-col gap-6 lg:col-span-2 print:col-span-1 print:h-auto">
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-2 print:hidden">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={selectedSectionFilter} onValueChange={setSelectedSectionFilter}>
                      <SelectTrigger className="h-8 w-[150px]">
                        <SelectValue placeholder="Filter by class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {sections.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => {
                      const newMode = poolSortMode === "default" ? "class" : "default";
                      setPoolSortMode(newMode);
                      setIsPoolSorted(false);
                      handleTogglePoolSort();
                    }}>
                      Sort: {poolSortMode === "default" ? "Date & Time" : "Class"}
                    </Button>
                  </div>
                  <AddTaskDialog sections={sections} onAddTask={handleAddTask} />
                </div>
                <div className="flex-1 min-h-0 print:text-xs print:overflow-hidden print:max-h-[90vh]">
                  <Column
                    id="pool"
                    title="Task Pool"
                    description="Tasks from Todoist"
                    tasks={poolTasks.filter(t => selectedSectionFilter === "all" || t.sectionId === selectedSectionFilter)}
                    showClassDividers={poolSortMode === "class"}
                    headerAction={
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", isPoolSorted && "bg-primary/10 text-primary")}
                        onClick={handleTogglePoolSort}
                        title="Sort by Due Date & Priority"
                      >
                        {isPoolSorted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </Button>
                    }
                    onUpdateTask={handleUpdateTask}
                    onComplete={handleCompleteTask}
                    onDelete={handleDeleteTask}
                    sectionColors={sectionColors}
                  />
                </div>
              </div>
              <div className="h-1/3 min-h-[200px] print:hidden">
                <Column
                  id="later"
                  title="For Later"
                  description="Tasks to save for another time"
                  tasks={laterTasks}
                  onUpdateTask={handleUpdateTask}
                  onComplete={handleCompleteTask}
                  onDelete={handleDeleteTask}
                />
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                isOverlay
                sectionColors={sectionColors}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  )
}
