import React from 'react';
import { BookOpen } from 'lucide-react';
import { parseWacana } from '../utils/wacanaHelper';

interface WacanaViewerProps {
  content: string;
  caption?: string;
  fontSize?: 'sm' | 'md' | 'lg';
  className?: string;
  isPreview?: boolean;
}

export const WacanaViewer: React.FC<WacanaViewerProps> = ({
  content,
  caption,
  fontSize = 'md',
  className = '',
  isPreview = false
}) => {
  const { title, paragraphs } = parseWacana(content);

  // Responsive font sizes matching the exam zoom controls
  const titleSize = fontSize === 'sm' 
    ? 'text-base md:text-lg' 
    : fontSize === 'lg' 
    ? 'text-2xl md:text-3xl' 
    : 'text-lg md:text-xl';

  const bodySize = fontSize === 'sm' 
    ? 'text-sm md:text-base' 
    : fontSize === 'lg' 
    ? 'text-xl md:text-2xl' 
    : 'text-base md:text-lg';

  if (!content || !content.trim()) return null;

  return (
    <div
      className={`bg-slate-50/90 border border-slate-200 rounded-2xl p-5 md:p-7 shadow-sm text-slate-800 flex flex-col w-full ${className}`}
    >
      {/* Header Badge */}
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 text-indigo-700 font-bold text-xs uppercase tracking-wider select-none">
        <BookOpen size={16} className="text-indigo-600 flex-shrink-0" />
        <span>{isPreview ? 'Preview Teks / Wacana Bacaan' : 'Teks / Wacana Bacaan'}</span>
      </div>

      {/* Judul Teks (Rata Tengah dengan Bold) */}
      {title ? (
        <h3 className={`text-center font-bold text-slate-900 ${titleSize} mb-5 leading-snug tracking-tight select-text`}>
          {title}
        </h3>
      ) : null}

      {/* Diikuti Paragraf di Bawahnya */}
      <div className={`space-y-4 text-slate-700 leading-relaxed text-justify break-words select-text ${bodySize}`}>
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => (
            <p key={idx} className="indent-6 md:indent-8 leading-relaxed">
              {para}
            </p>
          ))
        ) : (
          <p className="leading-relaxed">{content}</p>
        )}
      </div>

      {/* Keterangan di Bawah Wacana */}
      {caption && (
        <div className="mt-5 pt-3 border-t border-slate-200/80 text-xs md:text-sm text-slate-500 italic text-right">
          {caption}
        </div>
      )}
    </div>
  );
};

export default WacanaViewer;
