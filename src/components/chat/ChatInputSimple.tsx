"use client";
import { useRef, useState } from "react";
import { Send, Plus, Mic, Image as ImageIcon, FileText, X, BookOpen } from "lucide-react";

export type AttachedFile = {
  file: File;
  type: "image" | "pdf";
  previewUrl?: string; // solo para imágenes
};

interface ChatInputSimpleProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onVoiceToggle: () => void;
  isListening: boolean;
  isTyping: boolean;
  maxLength: number;
  errorMessage?: string;
  // archivo adjunto
  attachedFile?: AttachedFile | null;
  onFileAttach?: (file: AttachedFile | null) => void;
  // Sugerencias para autocompletado (títulos y autores)
  suggestions?: { titulo: string; autor?: string }[];
}

export function ChatInputSimple({
  value,
  onChange,
  onSubmit,
  onVoiceToggle,
  isListening,
  isTyping,
  maxLength,
  errorMessage,
  attachedFile,
  onFileAttach,
  suggestions = [],
}: ChatInputSimpleProps) {
  const [showTools, setShowTools] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [dropdownOpen, setDropdownOpen] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Detect context for autocomplete: slash '/' preceded by space or start of string
  const lastSlashIndex = value.lastIndexOf("/");
  const isSlashTriggered = lastSlashIndex !== -1 && (lastSlashIndex === 0 || /\s/.test(value[lastSlashIndex - 1]));
  const searchQuery = isSlashTriggered ? value.substring(lastSlashIndex + 1).toLowerCase() : "";

  const filteredSuggestions = isSlashTriggered
    ? suggestions.filter((item) => {
        const search = searchQuery.toLowerCase();
        return (
          item.titulo.toLowerCase().includes(search) ||
          (item.autor && item.autor.toLowerCase().includes(search))
        );
      })
    : [];

  const showDropdown = isSlashTriggered && dropdownOpen && filteredSuggestions.length > 0;

  const selectSuggestion = (suggestion: string) => {
    if (lastSlashIndex !== -1) {
      const beforeSlash = value.substring(0, lastSlashIndex);
      // Rellena con el título exacto
      const newValue = `${beforeSlash}${suggestion} `;
      onChange(newValue);
    }
    setDropdownOpen(false);
    setHighlightedIndex(0);
    // Vuelve a enfocar el textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const lastSlash = val.lastIndexOf("/");
    const isNowTriggered = lastSlash !== -1 && (lastSlash === 0 || /\s/.test(val[lastSlash - 1]));
    if (isNowTriggered) {
      setDropdownOpen(true);
    }
    onChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[highlightedIndex].titulo);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDropdownOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onFileAttach) return;
    const previewUrl = URL.createObjectURL(file);
    onFileAttach({ file, type: "image", previewUrl });
    setShowTools(false);
    e.target.value = "";
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onFileAttach) return;
    onFileAttach({ file, type: "pdf" });
    setShowTools(false);
    e.target.value = "";
  };

  const canSend = (value.trim() || attachedFile) && !isTyping;

  return (
    <div className="border-t border-slate-800 bg-slate-950 px-4 py-3">
      <div className="mx-auto max-w-3xl">

        {/* Tools menu */}
        {showTools && (
          <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-cyan-500/30 hover:bg-slate-800 hover:text-cyan-400"
            >
              <ImageIcon className="h-4 w-4" />
              Imagen
            </button>
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-cyan-500/30 hover:bg-slate-800 hover:text-cyan-400"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        )}

        {/* File preview */}
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2">
            {attachedFile.type === "image" && attachedFile.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachedFile.previewUrl} alt="preview" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <FileText className="h-6 w-6 flex-shrink-0 text-cyan-400" />
            )}
            <span className="flex-1 truncate text-xs text-slate-300">{attachedFile.file.name}</span>
            <button
              onClick={() => onFileAttach?.(null)}
              className="rounded-full p-1 text-slate-500 hover:text-red-400"
              title="Quitar archivo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-end gap-2">
          {/* Plus button */}
          <button
            onClick={() => setShowTools(!showTools)}
            className={`flex-shrink-0 rounded-full p-2.5 transition-colors ${
              showTools
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            }`}
            title="Adjuntar archivo"
          >
            <Plus className={`h-5 w-5 transition-transform ${showTools ? "rotate-45" : ""}`} />
          </button>

          {/* Text input */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={attachedFile ? "Agregá una pregunta (opcional)..." : "Escribe un mensaje..."}
              disabled={isTyping}
              rows={1}
              maxLength={maxLength}
              className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50"
              style={{ maxHeight: "200px", minHeight: "44px" }}
            />

            {showDropdown && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-1">
                {filteredSuggestions.slice(0, 8).map((suggestion, idx) => (
                  <button
                    key={suggestion.titulo}
                    type="button"
                    onClick={() => selectSuggestion(suggestion.titulo)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      idx === highlightedIndex
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 flex-shrink-0 text-cyan-500" />
                    <div className="flex flex-col text-left truncate flex-1">
                      <span className="truncate font-medium text-slate-100">{suggestion.titulo}</span>
                      {suggestion.autor && (
                        <span className="truncate text-[11px] text-slate-400 mt-0.5">{suggestion.autor}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="mt-2 text-xs text-red-400">{errorMessage}</p>
          )}

          {/* Voice button */}
          <button
            onClick={onVoiceToggle}
            disabled={isTyping}
            className={`flex-shrink-0 rounded-full p-2.5 transition-colors ${
              isListening
                ? "animate-pulse bg-red-500/20 text-red-400"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-300 disabled:opacity-50"
            }`}
            title={isListening ? "Detener grabación" : "Grabar voz"}
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Send button */}
          <button
            onClick={onSubmit}
            disabled={!canSend}
            className="flex-shrink-0 rounded-full bg-cyan-500 p-2.5 text-white transition-colors hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500"
            title="Enviar mensaje"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handlePdfSelect}
        />
      </div>
    </div>
  );
}
