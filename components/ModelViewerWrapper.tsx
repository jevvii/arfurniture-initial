import React from 'react';

interface ModelViewerProps {
  src: string;
  poster?: string;
  alt: string;
}

export const ModelViewerWrapper: React.FC<ModelViewerProps> = ({ src, poster, alt }) => {
  // Cast to 'any' to bypass TypeScript IntrinsicElements check for custom web components
  const ModelViewer = 'model-viewer' as any;

  return (
    <div className="w-full h-full bg-slate-100 rounded-xl overflow-hidden relative group">
      <ModelViewer
        src={src}
        alt={alt}
        shadow-intensity="1"
        camera-controls
        auto-rotate
        ar
        ar-modes="webxr scene-viewer quick-look"
        loading="eager"
        reveal="auto"
        className="w-full h-full"
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      >
        <div slot="ar-button" className="absolute top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-full font-medium shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors flex items-center gap-2 z-30">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
          View in your space
        </div>
        
        {/* Loading spinner shown while 3D model loads */}
        <div slot="poster" className="w-full h-full flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-500">Loading 3D model...</p>
          </div>
        </div>
      </ModelViewer>
      
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-medium text-slate-600 pointer-events-none">
        Interactive 3D
      </div>
    </div>
  );
};