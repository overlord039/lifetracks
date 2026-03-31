
"use client"

import * as React from "react"
import { Moon, Sun, Palette, Droplets, TreePine, Sunrise } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-xl">
        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer font-bold text-xs uppercase tracking-tighter">
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer font-bold text-xs uppercase tracking-tighter">
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("midnight")} className="cursor-pointer font-bold text-xs uppercase tracking-tighter">
          <Droplets className="mr-2 h-4 w-4 text-blue-500" /> Midnight
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("forest")} className="cursor-pointer font-bold text-xs uppercase tracking-tighter">
          <TreePine className="mr-2 h-4 w-4 text-green-600" /> Forest
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("sunset")} className="cursor-pointer font-bold text-xs uppercase tracking-tighter">
          <Sunrise className="mr-2 h-4 w-4 text-orange-500" /> Sunset
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer font-bold text-xs uppercase tracking-tighter">
          <Palette className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
