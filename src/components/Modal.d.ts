declare module "@/components/Modal" {
  import React from "react";

  interface ModalProps {
    onClose: () => void;
    children: React.ReactNode;
  }

  const Modal: React.FC<ModalProps>;
  export default Modal;
}
