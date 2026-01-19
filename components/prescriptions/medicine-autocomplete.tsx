"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface MedicineAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  onSelect?: (value: string) => void
}

export function MedicineAutocomplete({
  value,
  onChange,
  placeholder = "Enter medicine name",
  required = false,
  onSelect,
}: MedicineAutocompleteProps) {
  // Separate search value (for autocomplete) from selected medicine (what was chosen)
  const [searchValue, setSearchValue] = useState<string>(value)
  const [selectedMedicine, setSelectedMedicine] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  const isSelectingRef = useRef(false) // Prevent search after selection

  // Sync with external value prop when it changes externally (but not during selection)
  useEffect(() => {
    if (!isSelectingRef.current) {
      // If value changed externally and doesn't match our current state, sync it
      if (value !== searchValue && (!selectedMedicine || value !== selectedMedicine)) {
        setSearchValue(value)
        setSelectedMedicine(null)
      }
    }
  }, [value, searchValue, selectedMedicine])

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (query: string) => {
    // Don't search if we just selected a medicine
    if (isSelectingRef.current) {
      return
    }

    if (query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/medicines/autocomplete?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions")
      }

      const data = await response.json()
      setSuggestions(data.results || [])
      setShowSuggestions((data.results || []).length > 0)
      setSelectedIndex(-1)
    } catch (err) {
      console.error("Error fetching medicine suggestions:", err)
      setError("Failed to load suggestions")
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search - only search when user is typing (not when selecting)
  useEffect(() => {
    if (isSelectingRef.current) {
      return
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(searchValue)
    }, 300)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [searchValue, fetchSuggestions])

  // Handle input change - user is typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchValue(newValue)
    setSelectedMedicine(null) // Clear selection when user types
    isSelectingRef.current = false
    onChange(newValue) // Update parent immediately
    setShowSuggestions(true)
  }

  // Handle suggestion selection
  const selectSuggestion = (suggestion: string) => {
    isSelectingRef.current = true
    
    // Update both selected medicine and search value to the selected medicine name
    setSelectedMedicine(suggestion)
    setSearchValue(suggestion) // This ensures the input displays the selected medicine
    setShowSuggestions(false)
    setSelectedIndex(-1)
    setSuggestions([]) // Clear suggestions
    
    // Update parent component immediately
    onChange(suggestion)
    
    // Call onSelect callback for recommendations (this triggers dosage/frequency/duration)
    if (onSelect) {
      onSelect(suggestion)
    }
    
    // Reset selection flag after state updates complete
    setTimeout(() => {
      isSelectingRef.current = false
    }, 150)
    
    inputRef.current?.blur()
  }

  // Display value: Always show searchValue (which equals selectedMedicine after selection)
  // This ensures the input reflects the selected medicine name
  const displayValue = searchValue

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault()
        return
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex])
        } else if (suggestions.length > 0) {
          selectSuggestion(suggestions[0])
        }
        break
      case "Escape":
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          required={required}
          className="pl-10"
          autoComplete="off"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {isLoading && (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              Loading...
            </div>
          )}
          {!isLoading && suggestions.length === 0 && (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              No suggestions found
            </div>
          )}
          {!isLoading &&
            suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  index === selectedIndex
                    ? "bg-gray-100 dark:bg-gray-700"
                    : ""
                }`}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="text-sm font-medium">{suggestion}</div>
              </div>
            ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  )
}
