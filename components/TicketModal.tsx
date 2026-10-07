import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { Download, Share2, X, Check, User, Calendar, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';

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
    const now = new Date();
    const issueDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const issueTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const authCode = `E${currentYear}${String(currentMonth).padStart(2, '0')}${Math.random().toString(36).substring(2, 8).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const displayRecipient = recipientName.trim() || categoryOrGroupTitle || selectedTransactions[0]?.group || selectedTransactions[0]?.category || 'Destinatário';

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const getFileName = () => {
        const cleanName = (text: string) => text.replace(/[/\\?%*:|"<>]/g, '').trim();
        const formattedRecipient = cleanName(displayRecipient);
        return `comprovante-pix-${formattedRecipient}-${monthName}-${currentYear}.png`;
    };

    const generateImage = async (): Promise<string> => {
        if (!ticketRef.current) throw new Error('Element not found');
        const node = ticketRef.current;
        
        // Explicitly calculate natural full dimensions
        const width = node.offsetWidth || 380;
        const height = node.scrollHeight;

        return await toPng(node, {
            quality: 1,
            pixelRatio: 2.5,
            backgroundColor: '#ffffff',
            cacheBust: true,
            skipFonts: true,
            width: width,
            height: height,
            canvasWidth: width * 2.5,
            canvasHeight: height * 2.5,
            style: {
                transform: 'none',
                maxHeight: 'none',
                height: `${height}px`,
                width: `${width}px`,
                overflow: 'visible'
            }
        });
    };

    const handleDownloadImage = async () => {
        if (!ticketRef.current) return;
        try {
            setIsGenerating(true);
            await new Promise(resolve => setTimeout(resolve, 200));
            const dataUrl = await generateImage();
            
            const link = document.createElement('a');
            link.download = getFileName();
            link.href = dataUrl;
            link.click();
            showToast('✓ Comprovante salvo com sucesso!');
        } catch (err) {
            console.error('Erro ao gerar comprovante:', err);
            showToast('Erro ao gerar imagem. Tente novamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (!ticketRef.current) return;
        try {
            setIsGenerating(true);
            await new Promise(resolve => setTimeout(resolve, 200));
            const dataUrl = await generateImage();

            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const fileName = getFileName();
            const file = new File([blob], fileName, { type: 'image/png' });

            const summaryText = `*COMPROVANTE DE PAGAMENTO / CONTAS*\n` +
                `*Destinatário:* ${displayRecipient}\n` +
                `*Referência:* ${monthName}/${currentYear}\n\n` +
                selectedTransactions.map(t => {
                    const inst = t.installments ? ` (Parc. ${t.installments.current}/${t.installments.total})` : '';
                    const purchase = t.purchaseDate ? ` [Compra: ${t.purchaseDate.includes('-') ? `${t.purchaseDate.split('-')[2]}/${t.purchaseDate.split('-')[1]}` : t.purchaseDate}]` : '';
                    return `• ${t.description}${inst}${purchase}: ${formatCurrency(t.amount)}`;
                }).join('\n') +
                `\n\n*VALOR TOTAL:* ${formatCurrency(totalSum)}`;

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Comprovante - ${displayRecipient}`,
                    text: summaryText,
                    files: [file]
                });
                showToast('✓ Comprovante compartilhado!');
            } else if (navigator.share) {
                await navigator.share({
                    title: `Comprovante - ${displayRecipient}`,
                    text: summaryText
                });
                handleDownloadImage();
            } else {
                await navigator.clipboard.writeText(summaryText);
                handleDownloadImage();
                showToast('✓ Texto copiado e imagem salva!');
            }
        } catch (err) {
            console.error('Erro ao compartilhar:', err);
            handleDownloadImage();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
                
                {/* Header Modal Bar */}
                <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
                            <CheckCircle2 size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                                Comprovante PIX
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">
                                    Padrão Bancário
                                </span>
                            </h3>
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
                <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3 py-1.5 border border-slate-700/60 focus-within:border-emerald-500/60 transition-all">
                        <User size={15} className="text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Nome do Destinatário (Ex: Rebecca Brito, Marcia, Iago...)"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="bg-transparent text-xs sm:text-sm font-semibold text-white placeholder-slate-500 w-full outline-none"
                        />
                    </div>
                </div>

                {/* Printable Bank Receipt View (BRANCO / OFICIAL BANCÁRIO) */}
                <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-slate-950/60 flex justify-center">
                    <div 
                        ref={ticketRef} 
                        className="w-full max-w-[380px] bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 font-sans select-none"
                    >
                        {/* Top Bank Green Bar */}
                        <div className="h-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 w-full" />

                        {/* Bank PIX Header */}
                        <div className="px-6 pt-5 pb-4 text-center border-b border-slate-100 bg-emerald-50/40">
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/10">
                                <CheckCircle2 size={26} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-700">
                                Comprovante de Pagamento
                            </h2>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {issueDate} às {issueTime}
                            </p>

                            {/* Total Amount Big Display */}
                            <div className="mt-4 pt-3 pb-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                    Valor Total da Conta
                                </span>
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                    {formatCurrency(totalSum)}
                                </span>
                            </div>
                        </div>

                        {/* Account & Details Section */}
                        <div className="px-6 py-4 space-y-3 text-xs">
                            {/* Destinatário */}
                            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">Destinatário</span>
                                <span className="text-right font-black text-slate-900 uppercase tracking-tight max-w-[200px] truncate">
                                    {displayRecipient}
                                </span>
                            </div>

                            {/* Mês de Referência */}
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">Mês de Referência</span>
                                <span className="font-bold text-slate-800">
                                    {monthName} de {currentYear}
                                </span>
                            </div>

                            {/* Detalhamento das Contas / Parcelas */}
                            <div className="pt-1">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                        Contas e Parcelas ({selectedTransactions.length})
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                        Valor
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {selectedTransactions.map((item, idx) => (
                                        <div 
                                            key={item.id || idx}
                                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex justify-between items-center gap-2 shadow-2xs"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-slate-900 text-xs truncate">
                                                    {item.description}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    {item.installments ? (
                                                        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black">
                                                             Parc. {item.installments.current}/{item.installments.total}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                                                            Parcela Única
                                                        </span>
                                                    )}
                                                    {item.purchaseDate && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-black">
                                                            Compra: {item.purchaseDate.includes('-') ? `${item.purchaseDate.split('-')[2]}/${item.purchaseDate.split('-')[1]}` : item.purchaseDate}
                                                        </span>
                                                    )}
                                                    {(item.dueDate || item.day) && (
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            • Venc.: {item.dueDate ? item.dueDate.split('-')[2] : String(item.day).padStart(2, '0')}/{String(currentMonth).padStart(2, '0')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="font-black text-slate-900 text-xs sm:text-sm">
                                                    {formatCurrency(item.amount)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Resumo Final */}
                            <div className="pt-2 border-t-2 border-dashed border-slate-200">
                                <div className="flex justify-between items-center py-1">
                                    <span className="font-black text-slate-700 text-xs uppercase tracking-tight">
                                        Total a Pagar
                                    </span>
                                    <span className="font-black text-emerald-700 text-base">
                                        {formatCurrency(totalSum)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* PIX Security & Authentication Footer */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
                            <div className="flex justify-between items-center text-[9px] text-slate-400">
                                <span>Autenticação:</span>
                                <span className="font-bold text-slate-600 truncate max-w-[200px]">{authCode}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                                <div className="flex items-center gap-1 text-emerald-700 font-bold">
                                    <ShieldCheck size={13} />
                                    <span>Comprovante Oficial Finanças</span>
                                </div>
                                <span className="font-semibold text-slate-400">Padrão PIX</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5 shrink-0">
                    <button
                        onClick={handleDownloadImage}
                        disabled={isGenerating}
                        className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Download size={18} strokeWidth={2.5} />
                        <span>{isGenerating ? 'Gerando Imagem...' : 'Salvar Comprovante (PNG)'}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-black text-xs sm:text-sm rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Share2 size={18} strokeWidth={2.5} />
                        <span>Compartilhar / Enviar</span>
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

