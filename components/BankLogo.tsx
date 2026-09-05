import React from 'react';

interface BankLogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    layout?: 'stacked' | 'horizontal' | 'symbol-only';
    theme?: 'dark' | 'light' | 'emerald';
    imageSrc?: string;
}

export const BankLogoSymbol: React.FC<{ size?: number; className?: string }> = ({ size = 48, className = '' }) => {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`drop-shadow-sm transition-transform duration-300 hover:scale-105 ${className}`}
        >
            <defs>
                {/* Modern banking gradients inspired by Banco do Brasil and Bradesco */}
                <linearGradient id="bankTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0f766e" />
                    <stop offset="50%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
                <linearGradient id="bankGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="bankNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#064e3b" />
                    <stop offset="100%" stopColor="#022c22" />
                </linearGradient>
                <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" floodColor="#022c22" />
                </filter>
            </defs>

            {/* Background Shield/Disc Aura */}
            <circle cx="50" cy="50" r="46" fill="url(#bankNavyGrad)" opacity="0.06" />

            {/* Geometric Interlocking Banking Ribbons - Inspired by Banco do Brasil & Bradesco */}
            <g filter="url(#subtleShadow)">
                {/* Left Arched Loop (Inspired by BB 45° dynamic woven ribbons) */}
                <path 
                    d="M32 20 C22 28, 20 44, 28 56 L46 74 C50 78, 56 78, 60 74 L68 66 C72 62, 72 56, 68 52 L50 34 C44 28, 38 20, 32 20 Z" 
                    fill="url(#bankTealGrad)"
                />
                
                {/* Right Interlocking Curve (Forming the balanced 'B' / 'A' infinity-growth architecture) */}
                <path 
                    d="M68 80 C78 72, 80 56, 72 44 L54 26 C50 22, 44 22, 40 26 L32 34 C28 38, 28 44, 32 48 L50 66 C56 72, 62 80, 68 80 Z" 
                    fill="url(#bankNavyGrad)"
                    opacity="0.9"
                />

                {/* Central Interlocking Bridge / Golden Core Accent */}
                <path 
                    d="M44 38 L56 50 L50 56 L38 44 C36 42, 38 38, 44 38 Z" 
                    fill="url(#bankGoldGrad)"
                />

                {/* Inner Dynamic Crown Arcs */}
                <path 
                    d="M50 28 C56 28, 62 33, 62 40 C62 44, 58 48, 54 48" 
                    stroke="#ffffff" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    opacity="0.85"
                />
                <path 
                    d="M50 72 C44 72, 38 67, 38 60 C38 56, 42 52, 46 52" 
                    stroke="#fbbf24" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    opacity="0.9"
                />
            </g>
        </svg>
    );
};

export const BankLogo: React.FC<BankLogoProps> = ({
    className = '',
    size = 'md',
    layout = 'stacked',
    theme = 'emerald',
    imageSrc = '/logo.jpg'
}) => {
    // Dimensions map
    const iconSizeMap = {
        sm: 36,
        md: 52,
        lg: 68,
        xl: 84
    };

    const iconDimension = iconSizeMap[size];

    // Typography styling based on theme
    const titleColorClass = theme === 'emerald'
        ? 'text-emerald-950'
        : theme === 'dark'
        ? 'text-white'
        : 'text-slate-900';

    const subtitleColorClass = theme === 'emerald'
        ? 'text-emerald-900/90'
        : theme === 'dark'
        ? 'text-emerald-400'
        : 'text-emerald-700';

    if (layout === 'symbol-only') {
        return (
            <div className={`inline-flex items-center justify-center ${className}`}>
                {imageSrc ? (
                    <img 
                        src={imageSrc} 
                        alt="Logo Símbolo Finanças Bispo de Andrade" 
                        className="rounded-2xl object-contain"
                        style={{ width: iconDimension, height: iconDimension }}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <BankLogoSymbol size={iconDimension} />
                )}
            </div>
        );
    }

    if (layout === 'horizontal') {
        return (
            <div className={`inline-flex items-center justify-center select-none ${className}`}>
                {imageSrc ? (
                    <img 
                        src={imageSrc} 
                        alt="Logo Finanças Bispo de Andrade" 
                        className="object-contain h-10 w-auto rounded-lg transition-transform duration-300 hover:scale-105"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="flex items-center gap-3.5">
                        <BankLogoSymbol size={iconDimension * 0.8} />
                        <div className="flex flex-col text-left">
                            <span className={`text-xl lg:text-2xl font-black tracking-tight leading-none uppercase ${titleColorClass}`}>
                                FINANÇAS
                            </span>
                            <span className={`text-[10px] lg:text-xs font-black tracking-[0.25em] uppercase mt-1 ${subtitleColorClass}`}>
                                BISPO DE ANDRADE
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default 'stacked': Symbol on top, Name underneath (user's explicit preference)
    return (
        <div className={`flex flex-col items-center justify-center text-center select-none group cursor-pointer ${className}`}>
            {imageSrc ? (
                <img 
                    src={imageSrc} 
                    alt="Logo Oficial Finanças Bispo de Andrade" 
                    className="h-28 sm:h-32 w-auto object-contain transition-transform duration-300 group-hover:scale-105 rounded-xl"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <>
                    <div className="relative mb-2.5 transition-transform duration-300 group-hover:scale-105">
                        <div className="relative flex items-center justify-center p-1.5 rounded-2xl bg-white/40 backdrop-blur-sm border border-emerald-900/10 shadow-sm">
                            <BankLogoSymbol size={iconDimension} />
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                        <span className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase drop-shadow-sm leading-none ${titleColorClass}`}>
                            FINANÇAS
                        </span>
                        <span className={`text-xs sm:text-sm lg:text-base font-black tracking-[0.28em] sm:tracking-[0.32em] uppercase mt-1.5 drop-shadow-sm ${subtitleColorClass}`}>
                            BISPO DE ANDRADE
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};

export default BankLogo;
