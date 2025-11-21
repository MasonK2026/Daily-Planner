"use server"

import { Task } from "@/lib/types"

function parseDurationFromContent(content: string): { amount: number, unit: string } | null {
  // Regex for "1hr 30m", "1h 30m", "1.5h", "90m", etc.
  const hourRegex = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/i
  const minRegex = /(\d+)\s*(?:m|min|mins|minute|minutes)/i

  const hourMatch = content.match(hourRegex)
  const minMatch = content.match(minRegex)

  let totalMinutes = 0

  if (hourMatch) {
    totalMinutes += parseFloat(hourMatch[1]) * 60
  }

  if (minMatch) {
    totalMinutes += parseInt(minMatch[1])
  }

  if (totalMinutes > 0) {
    return { amount: totalMinutes, unit: "minute" }
  }

  return null
}

const getProjectColor = (colorName: string): string => {
  const colors: Record<string, string> = {
    berry: "#b8256f",
    red: "#db4035",
    orange: "#ff9933",
    yellow: "#fad000",
    olive: "#afb83b",
    green: "#7ecc49",
    mint: "#6accbc",
    teal: "#158fad",
    sky: "#14aaf5",
    light_blue: "#96c3eb",
    blue: "#4073ff",
    grape: "#884dff",
    violet: "#af38eb",
    lavender: "#eb96eb",
    magenta: "#e05194",
    salmon: "#ff8d85",
    charcoal: "#808080",
    grey: "#b8b8b8",
    taupe: "#ccac93",
  }
  return colors[colorName] || "#808080"
}

export async function fetchTodoistTasks(apiToken: string): Promise<{ tasks: Task[]; sections?: { id: string; name: string }[]; error?: string }> {
  if (!apiToken) {
    return { tasks: [], error: "API Token is missing" }
  }

  try {
    const [projectsResponse, sectionsResponse, tasksResponse] = await Promise.all([
      fetch("https://api.todoist.com/rest/v2/projects", {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: "no-store",
      }),
      fetch("https://api.todoist.com/rest/v2/sections", {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: "no-store",
      }),
      fetch("https://api.todoist.com/rest/v2/tasks", {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: "no-store",
      })
    ])

    const projects = await projectsResponse.json()
    const projectMap = new Map<string, any>(projects.map((p: any) => [p.id, p]))

    let sections: any[] = []
    let sectionMap = new Map<string, any>()

    if (sectionsResponse.ok) {
      sections = await sectionsResponse.json()
      sectionMap = new Map<string, any>(sections.map((s: any) => [s.id, s]))
    } else {
      console.error('Failed to fetch sections:', await sectionsResponse.text())
    }

    if (!tasksResponse.ok) {
      return { tasks: [], error: "Failed to fetch tasks from Todoist" }
    }

    const data = await tasksResponse.json()

    const tasks: Task[] = data.map((item: any) => {
      const duration = item.duration || parseDurationFromContent(item.content)
      const project = projectMap.get(item.project_id)
      const section = item.section_id ? sectionMap.get(item.section_id) : null

      return {
        id: item.id,
        content: item.content,
        description: item.description,
        duration: duration,
        projectName: project?.name,
        projectColor: project ? getProjectColor(project.color) : undefined,
        sectionId: item.section_id,
        sectionName: section?.name,
        due: item.due,
        priority: item.priority, // Keep as number 1-4
        labels: item.labels,
        isCompleted: item.is_completed,
      }
    })

    return { tasks, sections: sections.map((s: any) => ({ id: s.id, name: s.name })) }
  } catch (error) {
    console.error("Error fetching Todoist tasks:", error)
    return { tasks: [], error: "An unexpected error occurred" }
  }
}

export async function updateTodoistTask(apiToken: string, taskId: string, updates: { content?: string; due_string?: string }): Promise<boolean> {
  if (!apiToken) return false
  try {
    const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${taskId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    })
    return response.ok
  } catch (error) {
    console.error("Error updating task:", error)
    return false
  }
}

export async function closeTodoistTask(apiToken: string, taskId: string): Promise<boolean> {
  if (!apiToken) return false
  try {
    const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${taskId}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
    })
    return response.ok
  } catch (error) {
    console.error("Error closing task:", error)
    return false
  }
}

export async function deleteTodoistTask(apiToken: string, taskId: string): Promise<boolean> {
  if (!apiToken) return false
  try {
    const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiToken}` },
    })
    return response.ok
  } catch (error) {
    console.error("Error deleting task:", error)
    return false
  }
}

export async function addTodoistTask(apiToken: string, task: { content: string; due_string?: string; priority?: number; section_id?: string }): Promise<boolean> {
  if (!apiToken) return false
  try {
    console.log('Adding task to Todoist:', task)
    const response = await fetch("https://api.todoist.com/rest/v2/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(task)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to add task:', response.status, errorText)
      return false
    }

    console.log('Task added successfully')
    return true
  } catch (error) {
    console.error("Error adding task:", error)
    return false
  }
}

