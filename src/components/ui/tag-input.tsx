"use client";

import React, { useState, KeyboardEvent, ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxTags?: number;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "Enter keywords...",
  className,
  disabled = false,
  maxTags = 20,
  suggestions = [],
  onSuggestionClick
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    suggestion => 
      !value.includes(suggestion) && 
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
      onChange([...value, trimmedTag]);
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(e.target.value.length > 0 && filteredSuggestions.length > 0);
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
    onSuggestionClick?.(suggestion);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {value.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 text-sm bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-red-600 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        
        {!disabled && value.length < maxTags && (
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(inputValue.length > 0 && filteredSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={value.length === 0 ? placeholder : "Add more..."}
              className="border-none shadow-none focus-visible:ring-0 p-0 h-6"
              disabled={disabled}
            />
            {inputValue.trim() && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addTag(inputValue)}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.slice(0, 8).map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0 text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>
          {value.length > 0 && `${value.length} keyword${value.length === 1 ? '' : 's'}`}
          {maxTags && ` (max ${maxTags})`}
        </span>
        <span>Press Enter or comma to add</span>
      </div>
    </div>
  );
}