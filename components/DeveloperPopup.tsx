import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Code2 } from 'lucide-react';

interface DeveloperPopupProps {
    configs: Record<string, string>;
}

const DeveloperPopup: React.FC<DeveloperPopupProps> = ({ configs }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Only show if DEV_SHOW is TRUE (default to true if not explicitly set to FALSE)
    if (configs.DEV_SHOW === 'FALSE') return null;

    const devName = configs.DEV_NAME || 'Pengembang Aplikasi';
    const devPhoto = configs.DEV_PHOTO_URL || 'https://picsum.photos/seed/dev/200/200';
    const devQuote = configs.DEV_QUOTE || 'Teruslah belajar dan berkarya.';

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors border-2 border-white/20"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{ 
                    y: [0, -10, 0],
                }}
                transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                title="Pengembang Aplikasi"
            >
                <Code2 size={24} />
            </motion.button>

            {/* Popup Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm relative"
                        >
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/40 rounded-full text-slate-700 transition-colors z-10"
                            >
                                <X size={20} />
                            </button>
                            
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-32 relative">
                                {/* Decorative elements */}
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                            </div>
                            
                            <div className="px-6 pb-8 pt-0 relative flex flex-col items-center text-center">
                                <div className="w-32 aspect-[4/6] rounded-xl border-4 border-white shadow-lg overflow-hidden -mt-24 bg-white mb-4">
                                    <img 
                                        src={devPhoto} 
                                        alt={devName} 
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                                
                                <h3 className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Pengembang Aplikasi</h3>
                                <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 mb-4 break-words px-2">{devName}</h2>
                                
                                <div className="relative w-full">
                                    <span className="absolute -top-4 -left-2 text-4xl text-slate-200 font-serif">"</span>
                                    <p className="text-slate-600 italic relative z-10 px-4">
                                        {devQuote}
                                    </p>
                                    <span className="absolute -bottom-6 -right-2 text-4xl text-slate-200 font-serif">"</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default DeveloperPopup;
