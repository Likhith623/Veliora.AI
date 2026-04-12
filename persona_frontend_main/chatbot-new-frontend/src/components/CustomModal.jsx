import { X } from "lucide-react";

export default function CustomModal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      {/* <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-pink-400 rounded-full blur-[120px] opacity-50"></div>
          <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-orange-300 rounded-full blur-[100px] opacity-60"></div>
          <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-red-200 rounded-full blur-[140px] opacity-50"></div>
        </div> */}
      <div className="bg-white dark:bg-black md:rounded-2xl shadow-lg w-[100%] h-[100%] md:w-[80%] md:h-[90%] lg:w-[70%] relative overflow-hidden">
        <div className="absolute top-5 right-5 md:right-11 md:top-4 z-10">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-800 dark:text-white"
          >
            <X size={20} className="text-gray-800 dark:text-white" />
          </button>
        </div>

        <div className="h-full w-full bg-white dark:bg-black !bg-opacity-100">
          {children}
        </div>
      </div>
    </div>
  );
}
