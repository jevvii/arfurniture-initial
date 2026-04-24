import React from 'react';
import { X, Smartphone, ScanLine } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, productId, productName }) => {
  if (!isOpen) return null;

  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  const productUrl = productId 
    ? `${baseUrl}/#/product/${productId}?ar=true`
    : window.location.href;
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(productUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            View in AR
          </h2>
          <p className="text-slate-500 mb-8 text-sm">
            Scan this QR code with your phone to instantly launch AR and see {productName ? <strong className="text-slate-700">{productName}</strong> : 'this furniture'} in your space.
          </p>

          <div className="bg-white p-4 rounded-xl border-2 border-dashed border-slate-200 inline-block mb-6 relative group">
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-[1px]">
                <ScanLine className="w-8 h-8 text-indigo-600 animate-pulse" />
             </div>
            <img 
              src={qrCodeUrl} 
              alt="QR Code for AR View" 
              className="w-48 h-48 object-contain"
            />
          </div>

          <button
            onClick={onClose}
            className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};