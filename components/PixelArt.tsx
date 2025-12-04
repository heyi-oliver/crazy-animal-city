import React, { useMemo } from 'react';
import { CharacterType } from '../types';

interface PixelArtProps {
  type: CharacterType;
  isRecording: boolean;
  scale?: number;
  level: number;
}

// Helper to generate box-shadow string for pixel art
const generatePixelShadow = (design: string[], size: number, colorMap: Record<string, string>) => {
  let shadows = [];
  for (let y = 0; y < design.length; y++) {
    for (let x = 0; x < design[y].length; x++) {
      const pixel = design[y][x];
      if (pixel !== ' ') {
        shadows.push(`${x * size}px ${y * size}px 0 ${colorMap[pixel]}`);
      }
    }
  }
  return shadows.join(',');
};

const PixelArt: React.FC<PixelArtProps> = ({ type, isRecording, scale = 4, level }) => {
  
  const art = useMemo(() => {
    // 8x8 Grid designs
    let design: string[] = [];
    let colors: Record<string, string> = {};

    switch (type) {
      case CharacterType.JUDY: // Rabbit
        design = [
          "  GG GG ",
          "  GG GG ",
          "  GG GG ",
          " BBBBBB ",
          " BWBWBW ",
          " BBBBBB ",
          "  DDDD  ",
          "  DDDD  "
        ];
        colors = { 
          G: '#9ca3af', // Gray ears
          B: '#3b82f6', // Blue uniform
          W: '#ffffff', // White
          D: '#1e3a8a'  // Dark blue pants
        };
        break;
      case CharacterType.NICK: // Fox
        design = [
          " O    O ",
          " OO  OO ",
          " OOOOOO ",
          " OOWOWO ",
          " GGGGGG ",
          " GGGGGG ",
          "  TTTT  ",
          "  TTTT  "
        ];
        colors = {
          O: '#f97316', // Orange
          W: '#ffffff',
          G: '#22c55e', // Green shirt
          T: '#a16207'  // Tan pants
        };
        break;
      case CharacterType.FLASH: // Sloth
        design = [
          "        ",
          "  TTTT  ",
          " T T T T",
          " TTTTTT ",
          "  GGGG  ",
          "  GGGG  ",
          "  BBBB  ",
          "  BBBB  "
        ];
        colors = {
          T: '#d1d5db', // Tan/Grey fur
          G: '#84cc16', // Green shirt
          B: '#78350f'  // Brown pants
        };
        break;
      case CharacterType.CLAWHAUSER: // Cheetah
        design = [
          " Y    Y ",
          " YYYYYY ",
          " YBWYBY ",
          " YYYYYY ",
          "  BBBB  ",
          "  BBBB  ",
          "  DDDD  ",
          "  DDDD  "
        ];
        colors = {
          Y: '#facc15', // Yellow
          B: '#3b82f6', // Blue Uniform
          W: '#ffffff',
          D: '#1e3a8a'
        };
        break;
      default:
        return null;
    }

    return { design, colors };
  }, [type]);

  const phoneArt = useMemo(() => {
    // A 4x5 phone held up
    const design = [
      " XXX ",
      " XWX ",
      " XWX ",
      " XXX ",
    ];
    const colors = {
      X: '#1f2937', // Black case
      W: '#22d3ee'  // Bright Cyan Screen
    };
    return { design, colors };
  }, []);

  if (!art) return <div className="w-full h-full" />;

  const pixelSize = scale;
  const width = 8 * pixelSize;
  const height = 8 * pixelSize;
  const characterShadow = generatePixelShadow(art.design, pixelSize, art.colors);
  const phoneShadow = generatePixelShadow(phoneArt.design, pixelSize, phoneArt.colors);

  // Level 3 Logic: Phones are "sneaky" (hide and seek animation)
  const isSneaky = level >= 3;

  return (
    <div 
      style={{ 
        width: width, 
        height: height,
        position: 'relative'
      }}
    >
      {/* Character Layer */}
      <div
        style={{
          width: pixelSize,
          height: pixelSize,
          boxShadow: characterShadow,
          backgroundColor: 'transparent'
        }}
      />
      
      {/* Phone Layer - Only visible when recording */}
      {isRecording && (
        <div className="absolute inset-0 z-20">
            {/* The Phone Device */}
            <div 
            className={`absolute ${isSneaky ? 'animate-peek' : 'animate-bounce'}`}
            style={{
                bottom: '20%',
                left: '20%',
                width: pixelSize,
                height: pixelSize,
                boxShadow: phoneShadow,
                backgroundColor: 'transparent'
            }}
            >
             {/* Red Recording Dot */}
             <div className="absolute top-1 left-2 w-1 h-1 bg-red-600 animate-ping rounded-full" />
            </div>

            {/* Camera Flash Effect - Independent of phone movement */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none animate-flash z-30 opacity-0 bg-white rounded-full blur-md mix-blend-overlay" />
        </div>
      )}
    </div>
  );
};

export default PixelArt;