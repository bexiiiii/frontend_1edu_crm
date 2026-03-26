import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children, footer }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-[1px]">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#e2e8ee] bg-[#fbfcfd] shadow-[0_24px_50px_rgba(15,23,42,0.16)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e6ebf0] p-6">
          <h2 className="text-xl font-bold text-[#1f2530]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#96a0af] transition-colors hover:bg-[#eef2f5] hover:text-[#4f5b6b]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[#e6ebf0] p-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
