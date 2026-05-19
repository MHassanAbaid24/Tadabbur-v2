import { Mic, MicOff } from 'lucide-react';

interface DictationButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function DictationButton({ isListening, isSupported, onClick, disabled }: DictationButtonProps) {
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-full transition-all ${isListening
          ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
          : 'bg-cream text-muted hover:bg-parchment hover:text-ink'
        } disabled:opacity-50`}
      title={isListening ? "Stop listening" : "Start dictation"}
    >
      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}
