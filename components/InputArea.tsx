import React, { useState, useRef, useEffect } from 'react';

interface InputAreaProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="bg-white/80 md:bg-white backdrop-blur-md md:backdrop-blur-0 p-4 border-t border-white/60 md:border-gray-200 shadow-[0_-6px_18px_-8px_rgba(15,23,42,0.25)] md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 max-w-4xl mx-auto">
        <div className="relative flex-grow">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanya Sithem (Misal: Syarat kunjungan...)"
            className="w-full bg-white/80 md:bg-gray-100 border border-white/70 md:border-0 rounded-2xl px-4 py-3 pr-12 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none overflow-hidden min-h-[50px] max-h-[120px] shadow-sm"
            rows={1}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            input.trim() && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md transform hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </form>
      <div className="text-center mt-3 px-2">
         <p className="text-[10px] text-gray-500 leading-tight">
            Layanan ini gratis & bebas pungli.
         </p>
      </div>
    </div>
  );
};

export default React.memo(InputArea);
