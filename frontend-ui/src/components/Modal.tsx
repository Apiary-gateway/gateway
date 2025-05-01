import { ReactNode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
};

const Modal = ({ children, onClose }: ModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const modalRoot = document.getElementById('modal-root');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        initiateClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const initiateClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // match the animation duration in CSS
  };

  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <div
      className={`modal-overlay ${isClosing ? 'closing' : ''}`}
      onClick={initiateClose}
    >
      <div
        className={`modal-content ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-button" onClick={initiateClose}>
          ✕
        </button>
        <div className="modal-scrollable-content">
          {children}
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default Modal;
