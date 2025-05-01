import { ReactNode } from 'react';
type ModalProps = {
    children: ReactNode;
    onClose: () => void;
};
declare const Modal: ({ children, onClose }: ModalProps) => import("react").ReactPortal | null;
export default Modal;
