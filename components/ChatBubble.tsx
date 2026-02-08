import React, { useEffect, useState } from 'react';
import { Message, Sender } from '../types';

interface ChatBubbleProps {
  message: Message;
}

const SITHEM_FULL = "https://res.cloudinary.com/dim98gun7/image/upload/v1769353649/sithem_kpqggx.svg";

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === Sender.USER;
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setAnimateIn(true);
  }, []);

  // Simple formatter to handle bold text from markdown (**text**)
  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Text color logic: If user (dark text), if bot (white text)
        const boldClass = isUser ? "font-bold text-slate-900" : "font-bold text-yellow-400";
        return <strong key={index} className={boldClass}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  if (isUser) {
    return (
      <div className={`flex w-full justify-end pl-10 mb-4 transition-all duration-500 transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        {/* USER BUBBLE: Gray Background, Dark Text (Like Reference) */}
        <div className="relative max-w-[90%] bg-gray-200 text-slate-800 px-5 py-3 rounded-2xl rounded-tr-none shadow-sm">
          <p className="text-sm leading-relaxed font-normal tracking-wide">{formatText(message.text)}</p>
          <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
            <span className="text-[10px] text-slate-600 font-medium">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             {/* Checkmark icon */}
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-600">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
             </svg>
          </div>
        </div>
      </div>
    );
  }

  // BOT LAYOUT
  return (
    <div className={`relative flex w-full mt-6 mb-4 transition-all duration-500 transform ${animateIn ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
      
      {/* 3D Mascot Pop-out Container */}
      <div className="absolute -left-3 -bottom-5 z-20 w-16 h-16 md:w-20 md:h-20 filter drop-shadow-xl pointer-events-none">
         {/* The Mascot Image */}
         <img 
            src={SITHEM_FULL} 
            alt="Sithem" 
            className="w-full h-full object-contain animate-blob"
            style={{ animationDuration: '6s' }} 
         />
      </div>

      {/* The Bubble */}
      <div className="ml-10 md:ml-14 max-w-[85%] relative z-10">
        
        {/* BOT BUBBLE: Dark Navy Blue, White Text (Like Reference) */}
        <div className="bg-[#0f172a] text-white px-5 py-4 rounded-2xl rounded-tl-none shadow-lg">
          
          {/* Header in Bubble */}
          <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
             <span className="text-[10px] font-bold text-yellow-400">Sithem</span>
             <span className="text-[10px] text-slate-400">Asisten Humas</span>
          </div>

          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap text-slate-100">
            {formatText(message.text)}
          </p>
          
          <div className="mt-2 text-[10px] text-slate-400 font-medium text-right">
             {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatBubble);
