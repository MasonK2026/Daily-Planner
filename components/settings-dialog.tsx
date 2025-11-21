"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings } from 'lucide-react'

interface SettingsDialogProps {
  apiToken: string
  onSave: (token: string) => void
  sections: { id: string; name: string }[]
  sectionColors: Record<string, string>
  onSaveColors: (colors: Record<string, string>) => void
}

export function SettingsDialog({ apiToken, onSave, sections, sectionColors, onSaveColors }: SettingsDialogProps) {
  const [token, setToken] = useState(apiToken)
  const [open, setOpen] = useState(false)
  const [colors, setColors] = useState(sectionColors)

  const handleSave = () => {
    onSave(token)
    onSaveColors(colors)
    setOpen(false)
  }

  const PRESET_COLORS = [
    "#ffadad", "#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff", "#a0c4ff", "#bdb2ff", "#ffc6ff", "#fffffc"
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your Todoist integration and display preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="token">Todoist API Token</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your API token here..."
              type="password"
            />
          </div>

          {sections.length > 0 && (
            <div className="grid gap-3">
              <Label>Section Colors</Label>
              <div className="grid gap-2">
                {sections.map(section => (
                  <div key={section.id} className="flex items-center justify-between">
                    <span className="text-sm">{section.name}</span>
                    <div className="flex gap-1 items-center">
                      <div className="flex gap-1">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            className={`h-5 w-5 rounded-full border ${colors[section.id] === color ? 'ring-2 ring-primary' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setColors(prev => ({ ...prev, [section.id]: color }))}
                          />
                        ))}
                      </div>
                      <div className="relative h-6 w-6 ml-2">
                        <input
                          type="color"
                          value={colors[section.id] || "#000000"}
                          onChange={(e) => setColors(prev => ({ ...prev, [section.id]: e.target.value }))}
                          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                        />
                        <div
                          className="h-6 w-6 rounded-full border ring-offset-1 ring-1 ring-input"
                          style={{ backgroundColor: colors[section.id] || "#000000" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
