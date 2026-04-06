import React from 'react';
import { X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { UploadItem } from '../hooks/useImageUpload';

interface ImageUploadPreviewProps {
  item: UploadItem;
  index: number;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

export const ImageUploadPreview: React.FC<ImageUploadPreviewProps> = ({ item, index, onRemove, onRetry }) => {
  return (
    <div className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 shadow-card border-2 border-white group">
      <img 
        src={item.preview} 
        className={`w-full h-full object-cover transition-opacity ${item.status === 'error' ? 'opacity-50' : ''}`} 
        alt={`Photo ${index + 1}`} 
      />
      
      {/* Cover Label */}
      {index === 0 && item.status !== 'error' && (
        <div className="absolute top-1.5 left-1.5 bg-teal-600 text-white rounded-full px-2 py-0.5 text-[9px] font-black uppercase shadow-sm">
          Cover
        </div>
      )}

      {/* Status Overlays */}
      {item.status === 'compressing' && (
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-[1px]">
          <Loader2 size={20} className="text-white animate-spin mb-1" />
          <span className="text-[9px] font-bold text-white uppercase tracking-wider">Optimizing</span>
        </div>
      )}

      {item.status === 'error' && (
        <div className="absolute inset-0 bg-red-500/10 flex flex-col items-center justify-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onRetry(item.id); }}
            className="bg-white text-red-600 rounded-full p-2 shadow-lg hover:scale-110 transition-transform mb-1"
            title="Retry"
          >
            <RefreshCw size={16} />
          </button>
          <span className="text-[9px] font-bold text-red-600 bg-white/90 px-2 py-0.5 rounded-full">Failed</span>
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        aria-label="Remove photo"
        className="absolute top-1.5 right-1.5 bg-coral-500/90 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-coral-glow hover:bg-coral-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <X size={12} />
      </button>
    </div>
  );
};
