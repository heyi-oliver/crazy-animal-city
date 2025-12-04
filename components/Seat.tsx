import React from 'react';
import { Seat as SeatType, CharacterType } from '../types';
import PixelArt from './PixelArt';

interface SeatProps {
  seat: SeatType;
  onInteract: (id: number) => void;
  level: number;
}

const Seat: React.FC<SeatProps> = ({ seat, onInteract, level }) => {
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    onInteract(seat.id);
  };

  return (
    <div 
      className={`relative w-16 h-16 sm:w-20 sm:h-20 flex items-end justify-center cursor-pointer select-none transition-transform active:scale-90`}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Chair Back */}
      <div className="absolute bottom-0 w-14 h-10 bg-red-800 rounded-t-md border-t-4 border-red-600 shadow-lg z-0"></div>
      
      {/* Character */}
      <div className="z-10 mb-2 relative">
        {seat.isOccupied && seat.character !== CharacterType.EMPTY && (
           <PixelArt type={seat.character} isRecording={seat.isRecording} scale={4} level={level} />
        )}
      </div>

      {/* Recording Indicator - Only show if recording has been going on for a bit */}
      {seat.isRecording && seat.recordingDuration > 50 && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white font-black text-sm animate-pulse whitespace-nowrap z-30 bg-red-600 px-2 py-1 border-2 border-yellow-400 rounded shadow-[0_0_15px_rgba(255,0,0,1)] scale-110 pointer-events-none transform origin-bottom">
          盗摄!!!
        </div>
      )}
    </div>
  );
};

export default Seat;