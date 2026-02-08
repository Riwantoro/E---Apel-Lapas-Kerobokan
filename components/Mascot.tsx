import React from 'react';
import { EmoteType } from '../types';

interface MascotProps {
  emote: EmoteType;
}

const SITHEM_IMG_URL = "https://res.cloudinary.com/dim98gun7/image/upload/v1769353649/sithem_kpqggx.svg";

const Mascot: React.FC<MascotProps> = ({ emote }) => {
  
  // Determine animation based on emote
  let animationClass = "transform transition-all duration-500 ease-in-out";
  
  switch (emote) {
    case EmoteType.SMILE:
      // Happy bounce
      animationClass += " animate-bounce";
      break;
    case EmoteType.SERIOUS:
      // Subtle pulse for attention
      animationClass += " scale-110 drop-shadow-xl";
      break;
    case EmoteType.BOW:
      // Slight bow/tilt effect
      animationClass += " rotate-6 translate-y-2";
      break;
    default:
      // Breathing effect for neutral
      animationClass += " animate-pulse";
      break;
  }

  return (
    <div className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center">
      {/* Glow Effect behind Mascot */}
      <div className="absolute inset-0 bg-yellow-400 opacity-20 blur-3xl rounded-full animate-blob"></div>
      
      <img 
        src={SITHEM_IMG_URL} 
        alt="Sithem Mascot" 
        className={`w-full h-full object-contain ${animationClass} z-10 drop-shadow-2xl`}
      />
    </div>
  );
};

export default React.memo(Mascot);
