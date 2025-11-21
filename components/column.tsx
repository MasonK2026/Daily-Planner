"use client"

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { TaskCard } from "./task-card"
import { Task, ColumnId } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ColumnProps {
  id: ColumnId
  title: string
  tasks: Task[]
  description?: string
  headerAction?: React.ReactNode
  summary?: string
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void
  onComplete?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  onToggleTimer?: (taskId: string) => void
  sectionColors?: Record<string, string>
  showClassDividers?: boolean
  children?: React.ReactNode
}

export function Column({ id, title, tasks, description, headerAction, summary, onUpdateTask, onComplete, onDelete, onToggleTimer, sectionColors, showClassDividers = false, children }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
  })

  return (
    <div className="flex h-full flex-col rounded-xl bg-muted/50 p-4 border border-border/50 print:border-none print:bg-transparent print:p-0 print:h-auto">
      <div className="mb-4 flex-none flex items-start justify-between print:mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight print:text-xl">{title}</h2>
            {summary && <span className="text-sm font-medium text-muted-foreground print:text-base">({summary})</span>}
          </div>
          {description && <p className="text-sm text-muted-foreground print:hidden">{description}</p>}
        </div>
        <div className="print:hidden">
          {headerAction}
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 print:overflow-visible print:pr-0 print:mr-0">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3 pb-4 print:gap-2 print:pb-0">
            {tasks.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 text-sm text-muted-foreground print:hidden">
                No tasks here
              </div>
            ) : (
              tasks.map((task, index) => {
                const showDivider = showClassDividers && index > 0 && task.sectionName !== tasks[index - 1].sectionName
                return (
                  <div key={task.id}>
                    {showDivider && (
                      <div className="my-4 flex items-center gap-2 print:my-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs font-medium text-muted-foreground px-2">
                          {task.sectionName || "No Section"}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdateTask={onUpdateTask}
                      onComplete={onComplete}
                      onDelete={onDelete}
                      onToggleTimer={onToggleTimer}
                      sectionColors={sectionColors}
                    />
                  </div>
                )
              })
            )}
          </div>
        </SortableContext>
      </div>

      {children && (
        <div className="mt-4 pt-4 border-t border-border/50 flex-none print:mt-3 print:pt-3 print:border-t print:border-border">
          {children}
        </div>
      )}
    </div>
  )
}
