import { useMemo } from "react";

interface PianoKeyboardProps {
  currentNote?: string | null;
  currentOctave?: number | null;
  cents?: number;
  lowestNote?: string;
  highestNote?: string;
  targetNote?: string;
  showLabels?: boolean;
  compact?: boolean;
}

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_NOTES = ['C#', 'D#', 'F#', 'G#', 'A#'];

interface KeyData {
  note: string;
  octave: number;
  isBlack: boolean;
  fullNote: string;
}

export function PianoKeyboard({
  currentNote,
  currentOctave,
  cents = 0,
  lowestNote,
  highestNote,
  targetNote,
  showLabels = true,
  compact = false,
}: PianoKeyboardProps) {
  const keys = useMemo(() => {
    const keyList: KeyData[] = [];
    const startOctave = 2;
    const endOctave = 5;
    
    for (let octave = startOctave; octave <= endOctave; octave++) {
      for (const note of ALL_NOTES) {
        if (octave === endOctave && note !== 'C') continue;
        keyList.push({
          note,
          octave,
          isBlack: BLACK_NOTES.includes(note),
          fullNote: `${note}${octave}`,
        });
      }
    }
    return keyList;
  }, []);

  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);

  const currentFullNote = currentNote && currentOctave !== null && currentOctave !== undefined
    ? `${currentNote}${currentOctave}`
    : null;

  const isInRange = (fullNote: string): boolean => {
    if (!lowestNote || !highestNote) return true;
    const noteOrder = keys.map(k => k.fullNote);
    const noteIndex = noteOrder.indexOf(fullNote);
    const lowIndex = noteOrder.indexOf(lowestNote);
    const highIndex = noteOrder.indexOf(highestNote);
    if (noteIndex === -1 || lowIndex === -1 || highIndex === -1) return true;
    return noteIndex >= lowIndex && noteIndex <= highIndex;
  };

  const getKeyClasses = (key: KeyData): string => {
    const baseClasses = key.isBlack
      ? "absolute h-12 w-5 -ml-2.5 z-10 rounded-b transition-all duration-75"
      : "relative h-20 flex-1 min-w-[24px] border-r border-border last:border-r-0 rounded-b transition-all duration-75";

    const isActive = currentFullNote === key.fullNote;
    const isTarget = targetNote === key.fullNote;
    const inRange = isInRange(key.fullNote);

    let colorClasses = "";
    
    if (key.isBlack) {
      if (isActive) {
        if (cents > 20) {
          colorClasses = "bg-orange-500 shadow-lg shadow-orange-500/50";
        } else if (cents < -20) {
          colorClasses = "bg-blue-500 shadow-lg shadow-blue-500/50";
        } else {
          colorClasses = "bg-green-500 shadow-lg shadow-green-500/50";
        }
      } else if (isTarget) {
        colorClasses = "bg-primary/80 ring-2 ring-primary";
      } else if (!inRange) {
        colorClasses = "bg-muted";
      } else {
        colorClasses = "bg-foreground dark:bg-foreground";
      }
    } else {
      if (isActive) {
        if (cents > 20) {
          colorClasses = "bg-orange-400 shadow-lg shadow-orange-400/50";
        } else if (cents < -20) {
          colorClasses = "bg-blue-400 shadow-lg shadow-blue-400/50";
        } else {
          colorClasses = "bg-green-400 shadow-lg shadow-green-400/50";
        }
      } else if (isTarget) {
        colorClasses = "bg-primary/30 ring-2 ring-primary";
      } else if (!inRange) {
        colorClasses = "bg-muted/50";
      } else {
        colorClasses = "bg-card";
      }
    }

    return `${baseClasses} ${colorClasses}`;
  };

  const getBlackKeyPosition = (key: KeyData): number => {
    const whiteIndex = whiteKeys.findIndex(wk => {
      const wkNoteIndex = ALL_NOTES.indexOf(wk.note);
      const blackNoteIndex = ALL_NOTES.indexOf(key.note);
      return wk.octave === key.octave && blackNoteIndex === wkNoteIndex + 1;
    });
    
    if (whiteIndex === -1) {
      const prevWhiteIndex = whiteKeys.findIndex(wk => {
        return wk.octave === key.octave && wk.note === key.note.replace('#', '');
      });
      return prevWhiteIndex >= 0 ? prevWhiteIndex : 0;
    }
    
    return whiteIndex;
  };

  const pitchIndicator = useMemo(() => {
    if (!currentNote) return null;
    
    if (cents > 20) {
      return { text: "Sharp", color: "text-orange-500", symbol: "+" };
    } else if (cents < -20) {
      return { text: "Flat", color: "text-blue-500", symbol: "-" };
    }
    return { text: "On pitch!", color: "text-green-500", symbol: "" };
  }, [currentNote, cents]);

  const keyWidth = compact ? 20 : 24;

  return (
    <div className="space-y-2">
      <div 
        className="relative flex bg-border rounded-lg p-1 overflow-x-auto"
        style={{ minWidth: whiteKeys.length * keyWidth }}
        data-testid="piano-keyboard"
      >
        {whiteKeys.map((key, index) => (
          <div
            key={key.fullNote}
            className={getKeyClasses(key)}
            data-testid={`piano-key-${key.fullNote}`}
          >
            {showLabels && (key.note === 'C' || currentFullNote === key.fullNote) && (
              <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium ${
                currentFullNote === key.fullNote ? 'text-white' : 'text-muted-foreground'
              }`}>
                {key.fullNote}
              </span>
            )}
          </div>
        ))}
        
        {blackKeys.map((key) => {
          const position = getBlackKeyPosition(key);
          const leftOffset = (position * keyWidth) + (keyWidth / 2) + 4;
          
          return (
            <div
              key={key.fullNote}
              className={getKeyClasses(key)}
              style={{ left: `${leftOffset}px` }}
              data-testid={`piano-key-${key.fullNote}`}
            />
          );
        })}
      </div>

      {currentNote && (
        <div className="flex items-center justify-center gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {currentNote}{currentOctave}
            </div>
            {pitchIndicator && (
              <div className={`text-sm font-medium ${pitchIndicator.color}`}>
                {pitchIndicator.text} {pitchIndicator.symbol && `(${pitchIndicator.symbol}${Math.abs(cents)} cents)`}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-400"></div>
          <span>On pitch</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-400"></div>
          <span>Sharp</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-400"></div>
          <span>Flat</span>
        </div>
      </div>
    </div>
  );
}
