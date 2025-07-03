"use client"
import { useEffect } from "react"

export default function ThemeInitializer() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const html = document.documentElement
      if (prefersDark) {
        html.classList.add("dark")
      } else {
        html.classList.remove("dark")
      }
    }
  }, [])
  return null
} 