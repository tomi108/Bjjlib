import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Tag } from "@shared/schema";

interface TagAutosuggestProps {
  allTags: Tag[];
  selectedTags: string[];
  onAddTag: (tagName: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export function TagAutosuggest({
  allTags,
  selectedTags,
  onAddTag,
  placeholder = "Search tags...",
  className = "",
  testId = "input-tag-search"
}: TagAutosuggestProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = allTags
    .filter(tag => 
      tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedTags.includes(tag.name.toLowerCase())
    )
    .slice(0, 8);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSelectTag = (tagName: string) => {
    onAddTag(tagName);
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        handleSelectTag(filteredSuggestions[0].name);
      } else if (inputValue.trim()) {
        onAddTag(inputValue.trim());
        setInputValue("");
        setShowSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setInputValue("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyPress}
        onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
        className={className}
        data-testid={testId}
        autoComplete="off"
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          data-testid="tag-suggestions"
        >
          {filteredSuggestions.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleSelectTag(tag.name)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors flex items-center justify-between"
              data-testid={`suggestion-${tag.name}`}
            >
              <span>{tag.name}</span>
              <span className="text-xs text-gray-500">existing tag</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
