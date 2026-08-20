"use client";

interface AudioControlsProps {
  audioEnabled: boolean;
  onToggleAudio: () => void;
  isSpeaking: boolean;
  onToggleSpeaking: () => void;
}

export function AudioControls({ 
  audioEnabled, 
  onToggleAudio, 
  isSpeaking, 
  onToggleSpeaking 
}: AudioControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Micrófono */}
      <button
        onClick={onToggleAudio}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
          audioEnabled
            ? "bg-slate-600 text-white hover:bg-slate-500"
            : "bg-slate-800 text-slate-500 hover:bg-slate-700"
        }`}
        title={audioEnabled ? "Desactivar micrófono" : "Activar micrófono"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M8.25 4.5a3.75 3.75 0 117.5 0v5.25a3.75 3.75 0 11-7.5 0V4.5z" />
          <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.75 6.75 0 01-6.75 6.75h-4.5A6.75 6.75 0 016 16.5v-1.5a.75.75 0 01.75-.75z" />
        </svg>
      </button>

      {/* Speaker */}
      <button
        onClick={onToggleSpeaking}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
          isSpeaking
            ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
        }`}
        title={isSpeaking ? "Detener voz" : "Activar voz"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          {isSpeaking ? (
            <path d="M13.5 4.06c0-1.336-1.098-2.414-2.414-2.414a2.414 2.414 0 00-2.414 2.414h2.414v2.414h2.414V4.06h1.207a.9.9 0 01.9.9v1.207h1.207a.9.9 0 01.9.9v2.414a.9.9 0 01-.9.9H15a.9.9 0 01-.9-.9V4.06z" />
          ) : (
            <path d="M13.5 4.06c0-1.336-1.098-2.414-2.414-2.414a2.414 2.414 0 00-2.414 2.414v1.383l-1.85 1.85a.75.75 0 001.06 1.06l1.85-1.85v1.383a2.414 2.414 0 002.414 2.414 2.414 2.414 0 002.414-2.414A2.414 2.414 0 0013.5 4.06z" />
          )}
        </svg>
      </button>
    </div>
  );
}
