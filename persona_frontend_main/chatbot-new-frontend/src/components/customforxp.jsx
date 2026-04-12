// ✅ FIXED: Remove white background completely
const CustomModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - Semi-transparent dark overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Modal Content - NO WHITE BACKGROUND */}
      <div className="relative z-10">
        {/* Close Button - Floating outside container */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-20 w-10 h-10 bg-black/40 backdrop-blur-xl border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all duration-200 shadow-xl"
        >
          <span className="text-xl font-semibold">×</span>
        </button>
        
        {/* Pure glass container - no additional wrapper */}
        {children}
      </div>
    </div>
  );
};

export default CustomModal;