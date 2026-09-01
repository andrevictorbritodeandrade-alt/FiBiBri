import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { Download, Share2, X, Check, Ticket, User, Calendar, ShieldCheck } from 'lucide-react';

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTransactions: Transaction[];
    currentMonth: number;
    currentYear: number;
    categoryOrGroupTitle?: string;
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const TicketModal: React.FC<TicketModalProps> = ({
    isOpen,
    onClose,
    selectedTransactions,
    currentMonth,
    currentYear,
    categoryOrGroupTitle
}) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [recipientName, setRecipientName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const totalSum = selectedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const monthName = MONTH_NAMES[currentMonth - 1] || 'Mês Atual';
    const issueDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const ticketId = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const getFileName = () => {
        const cleanName = (text: string) => text.replace(/[/\\?%*:|"<>]/g, '').trim();
        const categoryName = categoryOrGroupTitle || selectedTransactions[0]?.category || 'Geral';
        const formattedRecipient = recipientName ? ` - ${cleanName(recipientName)}` : '';
        return `resumo de contas - ${cleanName(categoryName)}${formattedRecipient} - ${monthName} ${currentYear}.png`;
    };

    const handleDownloadImage = async () => {
        if (!ticketRef.current) return;
        try {
            setIsGenerating(true);
            // Slight delay to ensure rendering is complete
            await new Promise(resolve => setTimeout(resolve, 150));
            const dataUrl = await toPng(ticketRef.current, {
                quality: 0.98,
                pixelRatio: 2,
                backgroundColor: '#0f172a'
            });
            
            const link = document.createElement('a');
            link.download = getFileName();
            link.href = dataUrl;
            link.click();
            showToast('✓ Imagem salva no seu dispositivo!');
        } catch (err) {
            console.error('Erro ao gerar imagem:', err);
            showToast('Erro ao gerar imagem. Tente novamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (!ticketRef.current) return;
        try {
            setIsGenerating(true);
            await new Promise(resolve => setTimeout(resolve, 150));
            const dataUrl = await toPng(ticketRef.current, {
                quality: 0.98,
                pixelRatio: 2,
                backgroundColor: '#0f172a'
            });

            // Convert dataUrl to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const fileName = getFileName();
            const file = new File([blob], fileName, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Resumo de Contas - ${categoryOrGroupTitle || 'Geral'}`,
                    text: `Segue o resumo de contas${recipientName ? ` para ${recipientName}` : ''} - Total: ${formatCurrency(totalSum)}`,
                    files: [file]
                });
                showToast('✓ Compartilhado com sucesso!');
            } else if (navigator.share) {
                await navigator.share({
                    title: `Resumo de Contas - ${categoryOrGroupTitle || 'Geral'}`,
                    text: `*RESUMO DE CONTAS (${monthName}/${currentYear})* ${recipientName ? `\nPara: ${recipientName}` : ''}\n\n` +
                        selectedTransactions.map(t => `• ${t.description}: ${formatCurrency(t.amount)}`).join('\n') +
                        `\n\n*TOTAL: ${formatCurrency(totalSum)}*`
                });
                handleDownloadImage();
            } else {
                // Fallback: Copy summary text to clipboard & download image
                const text = `*RESUMO DE CONTAS (${monthName}/${currentYear})* ${recipientName ? `\nPara: ${recipientName}` : ''}\n\n` +
                    selectedTransactions.map(t => `• ${t.description}: ${formatCurrency(t.amount)}`).join('\n') +
                    `\n\n*TOTAL: ${formatCurrency(totalSum)}*`;
                await navigator.clipboard.writeText(text);
                handleDownloadImage();
                showToast('✓ Texto copiado e imagem baixada para envio!');
            }
        } catch (err) {
            console.error('Erro ao compartilhar:', err);
            handleDownloadImage();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
                
                {/* Header Bar */}
                <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-lg shadow-orange-500/30">
                            <Ticket size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                                Bilhete de Contas
                                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">
                                    Estilo Betano
                                </span>
                            </h3>
                            <p className="text-xs font-semibold text-slate-400">
                                {selectedTransactions.length} item{selectedTransactions.length > 1 ? 's' : ''} selecionado{selectedTransactions.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:bg-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Optional Recipient Name Input */}
                <div className="px-5 pt-3 pb-2 bg-slate-900/90 border-b border-slate-800/80 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700/60 focus-within:border-orange-500/60 transition-all">
                        <User size={16} className="text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Nome do Destinatário (Ex: Iago, André, Marcelly...)"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="bg-transparent text-xs sm:text-sm font-bold text-white placeholder-slate-500 w-full outline-none"
                        />
                    </div>
                </div>

                {/* Printable Betano-Style Ticket View */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-950">
                    <div 
                        ref={ticketRef} 
                        className="bg-slate-900 border-2 border-orange-500/40 rounded-2xl overflow-hidden shadow-2xl text-slate-100 font-sans relative"
                    >
                        {/* Top Accent Orange Bar */}
                        <div className="h-2.5 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500" />

                        {/* Ticket Banner Header */}
                        <div className="p-5 bg-gradient-to-b from-slate-900 to-slate-900/95 border-b border-slate-800 relative">
                            <div className="flex justify-between items-start gap-3">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 bg-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md mb-2">
                                        <Ticket size={12} strokeWidth={3} />
                                        <span>Comprovante de Contas</span>
                                    </div>
                                    <h4 className="text-xl font-black text-white uppercase tracking-tight">
                                        {recipientName ? `Contas - ${recipientName}` : (categoryOrGroupTitle || 'Resumo Financeiro')}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 text-slate-400 text-xs font-semibold">
                                        <Calendar size={13} className="text-orange-400" />
                                        <span>{monthName.toUpperCase()} / {currentYear}</span>
                                    </div>
                                </div>
                                
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-slate-500 block">ID: {ticketId}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 block">{issueDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="p-4 sm:p-5 bg-slate-900 space-y-2.5">
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-800">
                                <span>Descrição da Conta</span>
                                <span className="text-right">Valor</span>
                            </div>

                            {selectedTransactions.map((item, idx) => (
                                <div 
                                    key={item.id || idx}
                                    className="flex justify-between items-center py-2 px-3 bg-slate-800/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-all gap-3"
                                >
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                                            <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                                                {item.description}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 pl-3.5">
                                            {item.category && (
                                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                                    {item.category}
                                                </span>
                                            )}
                                            {item.installments && (
                                                <span className="text-[9px] font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                    Parc. {item.installments.current}/{item.installments.total}
                                                </span>
                                            )}
                                            {(item.dueDate || item.day) && (
                                                <span className="text-[9px] font-bold text-orange-400/90 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                                    Venc.: Dia {item.dueDate ? item.dueDate.split('-')[2] : String(item.day).padStart(2, '0')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="text-xs sm:text-sm font-black text-white font-mono">
                                            {formatCurrency(item.amount)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total Summary Footer Box (Betano Style) */}
                        <div className="p-4 sm:p-5 bg-slate-950 border-t-2 border-dashed border-slate-800 relative">
                            <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-4 text-white shadow-xl flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] font-black text-orange-100 uppercase tracking-widest block">
                                        TOTAL A PAGAR / TRANSMITIR
                                    </span>
                                    <span className="text-xs font-semibold text-orange-100/90">
                                        {selectedTransactions.length} item{selectedTransactions.length > 1 ? 's' : ''} somados
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight drop-shadow-md">
                                        {formatCurrency(totalSum)}
                                    </span>
                                </div>
                            </div>

                            {/* Watermark Stamp */}
                            <div className="mt-4 pt-3 flex justify-between items-center text-[10px] font-bold text-slate-500 border-t border-slate-900">
                                <div className="flex items-center gap-1.5 text-emerald-400">
                                    <ShieldCheck size={14} />
                                    <span className="font-extrabold uppercase tracking-wider text-[9px]">Verificado Finanças AI</span>
                                </div>
                                <span className="font-mono text-slate-600">ST-BETANO-CONFIRMED</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5 shrink-0">
                    <button
                        onClick={handleDownloadImage}
                        disabled={isGenerating}
                        className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 active:scale-98 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Download size={18} strokeWidth={2.5} />
                        <span>{isGenerating ? 'Gerando Imagem...' : 'Salvar Imagem (PNG)'}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-black text-xs sm:text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Share2 size={18} strokeWidth={2.5} />
                        <span>Enviar / Compartilhar</span>
                    </button>
                </div>

            </div>

            {/* Notification Toast */}
            {toastMessage && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
                    <Check size={18} strokeWidth={3} />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
};
