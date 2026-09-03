import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/financeUtils';
import { TicketModal } from './TicketModal';
import { 
    Banknote, CreditCard, Home, ShoppingCart, Car, Heart, GraduationCap, 
    Palmtree, TrendingUp, Fuel, Gift, Coins, MoreHorizontal, FileWarning,
    Calendar, CheckCircle2, ChevronDown, ChevronUp, Ticket, CheckSquare, Square, Trash2, Share2,
    Check, X, PowerOff
} from 'lucide-react';

interface TransactionListProps {
    transactions: Transaction[];
    onTogglePaid: (id: string, paid: boolean) => void;
    onEdit: (transaction: Transaction) => void;
    onUpdate: (transaction: Transaction) => void;
    compact?: boolean;
    currentMonth?: number;
    currentYear?: number;
}

// Helper para ícones
const getCategoryIcon = (category: string) => {
    const props = { size: 18, strokeWidth: 3 }; // Aumentado strokeWidth
    switch (category) {
        case 'Salário': return <Banknote {...props} />;
        case 'Mumbuca': return <CreditCard {...props} />;
        case 'Moradia': return <Home {...props} />;
        case 'Alimentação': return <ShoppingCart {...props} />;
        case 'Transporte': return <Car {...props} />;
        case 'Saúde': return <Heart {...props} />;
        case 'Educação': return <GraduationCap {...props} />;
        case 'Lazer': return <Palmtree {...props} />;
        case 'Dívidas': return <FileWarning {...props} />;
        case 'Investimento': return <TrendingUp {...props} />;
        case 'Abastecimento': return <Fuel {...props} />;
        case 'Doação': return <Gift {...props} />;
        case 'Renda Extra': return <Coins {...props} />;
        default: return <MoreHorizontal {...props} />;
    }
};

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'Salário': return 'bg-emerald-100/40 text-emerald-700 border-emerald-100';
        case 'Mumbuca': return 'bg-rose-100/40 text-rose-700 border-rose-100';
        case 'Moradia': return 'bg-emerald-50 text-emerald-700 border-emerald-100'; // Cor levemente verde
        case 'Alimentação': return 'bg-orange-100/40 text-orange-700 border-orange-100';
        case 'Lazer': return 'bg-teal-100/40 text-teal-700 border-teal-100';
        case 'Investimento': return 'bg-amber-100/40 text-amber-700 border-amber-100';
        case 'Educação': return 'bg-emerald-100/40 text-emerald-700 border-emerald-100';
        case 'Saúde': return 'bg-red-100/40 text-red-700 border-red-100';
        case 'Transporte': return 'bg-cyan-100/40 text-cyan-700 border-cyan-100';
        case 'Dívidas': return 'bg-slate-100/60 text-slate-700 border-slate-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
};

const getGroupColors = (key: string = '') => {
    if (key.includes('Distribuição')) return { 
        header: 'bg-purple-700 text-slate-950', 
        card: 'bg-purple-50/70 border-purple-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    if (key === 'MORADIA') return { 
        header: 'bg-red-600 text-slate-950', 
        card: 'bg-red-50/70 border-red-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    if (key === 'MARCIA BRITO') return { 
        header: 'bg-orange-500 text-slate-950', 
        card: 'bg-orange-50/70 border-orange-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    if (key === 'MARCIA BISPO') return { 
        header: 'bg-amber-600 text-slate-950', 
        card: 'bg-amber-50/70 border-amber-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    if (key === 'LILI TORRES') return { 
        header: 'bg-yellow-400 text-slate-950', 
        card: 'bg-yellow-50/70 border-yellow-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    if (key === 'REBECCA BRITO') return { 
        header: 'bg-emerald-500 text-slate-950', 
        card: 'bg-emerald-50/70 border-emerald-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    if (key.includes('IAGO')) return { 
        header: 'bg-sky-400 text-slate-950', 
        card: 'bg-sky-50/70 border-sky-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    if (key === 'JADY') return { 
        header: 'bg-blue-900 text-slate-950', 
        card: 'bg-blue-50/70 border-blue-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    if (key === 'DÍVIDAS NA RUA') return { 
        header: 'bg-sky-500 text-slate-950', 
        card: 'bg-sky-50/70 border-sky-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    if (key === 'AVULSO' || key.includes('AVULSO')) return { 
        header: 'bg-violet-600 text-slate-950', 
        card: 'bg-violet-50/70 border-violet-200/60',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
    
    // Default for dates (like "Hoje", "25 de agosto")
    return { 
        header: 'bg-slate-300 text-slate-950', 
        card: 'bg-slate-50/70 border-slate-100/50',
        badge: 'bg-black/15 text-slate-950 border-black/20',
        btn: 'bg-black/10 hover:bg-black/20 text-slate-950 border-black/20'
    };
};

const TransactionList: React.FC<TransactionListProps> = ({ 
    transactions, 
    onTogglePaid, 
    onEdit, 
    onUpdate, 
    compact = false,
    currentMonth = new Date().getMonth() + 1,
    currentYear = new Date().getFullYear()
}) => {
    const format = (v: number) => formatCurrency(v);
    
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);
    const [currentGroupTitle, setCurrentGroupTitle] = useState<string>('');

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => ({...prev, [key]: !prev[key]}));
    };

    const toggleSelectItem = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectGroup = (items: Transaction[], groupTitle: string) => {
        const itemIds = items.map(i => i.id);
        const allSelected = itemIds.every(id => selectedIds.includes(id));
        
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !itemIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...itemIds])));
            setCurrentGroupTitle(groupTitle);
        }
    };

    const clearSelection = () => {
        setSelectedIds([]);
    };

    const selectedTransactions = transactions.filter(t => selectedIds.includes(t.id));
    const selectedTotalSum = selectedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

    // Grouping Logic
    const grouped = transactions.reduce((groups, transaction) => {
        const key = transaction.group || transaction.dueDate || transaction.date || 'Sem Data';
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(transaction);
        return groups;
    }, {} as Record<string, Transaction[]>);

    // Sorting Keys
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const priority = [
            'Distribuição de Sobras (Planejamento)',
            'MORADIA',
            'MARCIA BRITO',
            'MARCIA BISPO',
            'LILI TORRES',
            'REBECCA BRITO',
            'JADY',
            'IAGO',
            'DÍVIDAS NA RUA',
            'AVULSO'
        ];
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return b.localeCompare(a);
    });

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-20 h-20 bg-gradient-to-tr from-gray-50 to-white rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <Calendar size={32} className="opacity-50" strokeWidth={2.5} />
                </div>
                <p className="text-base font-black text-gray-400 uppercase tracking-widest">Nenhuma movimentação</p>
            </div>
        );
    }

    const formatDateHeader = (key: string) => {
        if (key.includes('Distribuição') || key === 'MORADIA' || key === 'MARCIA BRITO' || key === 'MARCIA BISPO' || key === 'LILI TORRES' || key === 'REBECCA BRITO' || key === 'JADY' || key === 'IAGO' || key === 'DÍVIDAS NA RUA' || key === 'AVULSO' || key === 'Sem Data') return key;
        const [year, month, day] = key.split('-');
        if (!year || !month || !day) return key;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const today = new Date();
        today.setHours(0,0,0,0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        if (transactionDate.getTime() === today.getTime()) return 'Hoje';
        if (transactionDate.getTime() === yesterday.getTime()) return 'Ontem';

        return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', weekday: 'short' }).format(date);
    };

    if (compact) {
        const sortedList = transactions.filter(t => !t.isSuspended).sort((a, b) => (b.dueDate || b.date || '').localeCompare(a.dueDate || a.date || '')).slice(0, 5);
        return (
            <div className="flex flex-col gap-2">
                {sortedList.map(item => (
                    <div key={item.id} className={`flex items-center justify-between py-2.5 px-3 rounded-xl shadow-sm border transition-all cursor-pointer ${getGroupColors(item.group || item.dueDate || item.date).card} hover:shadow-md`} onClick={() => onEdit(item)}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getCategoryColor(item.category)} shrink-0`}>
                                {React.cloneElement(getCategoryIcon(item.category) as React.ReactElement, { size: 16 })}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className={`text-xs font-black truncate ${item.paid ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {item.description}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    {item.category}
                                </span>
                            </div>
                        </div>
                        <span className={`text-sm font-black whitespace-nowrap ${item.paid ? 'text-gray-400' : 'text-gray-900'}`}>
                            {format(item.amount)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col pb-24 relative">
            {sortedKeys.map(key => {
                const groupColors = getGroupColors(key);
                const isExpanded = !!expandedGroups[key];
                const groupItems = grouped[key] || [];
                const groupTotalSum = groupItems.reduce((acc, i) => acc + (i.amount || 0), 0);
                const selectedGroupItems = groupItems.filter(i => selectedIds.includes(i.id));
                const countSelectedInGroup = selectedGroupItems.length;
                const selectedGroupTotalSum = selectedGroupItems.reduce((acc, i) => acc + (i.amount || 0), 0);
                const allSelectedInGroup = groupItems.length > 0 && countSelectedInGroup === groupItems.length;

                return (
                <div key={key} className="mb-6 animate-fadeIn">
                    <div 
                        className={`relative z-10 py-2.5 mb-0 px-4 lg:px-6 cursor-pointer flex justify-between items-center transition-colors hover:opacity-90 ${groupColors.header}`}
                        onClick={() => toggleGroup(key)}
                    >
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                                {formatDateHeader(key)}
                            </h3>
                            
                            {/* TOTAL SOMA DA CATEGORIA - MESMA FONTE DO TÍTULO DA CATEGORIA */}
                            <span className={`text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-lg border shadow-sm tracking-tight ${groupColors.badge}`}>
                                {formatCurrency(groupTotalSum)}
                            </span>

                            {countSelectedInGroup > 0 && (
                                <span className="text-[10px] sm:text-xs font-black bg-orange-500 text-slate-950 px-2.5 py-0.5 rounded-full uppercase tracking-tight shadow-sm flex items-center gap-1">
                                    <span>{countSelectedInGroup} sel.</span>
                                    <span>({formatCurrency(selectedGroupTotalSum)})</span>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {/* Select All in Group Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectGroup(groupItems, formatDateHeader(key));
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                                    allSelectedInGroup
                                        ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-sm'
                                        : groupColors.btn
                                }`}
                                title="Selecionar contas do grupo para gerar bilhete"
                            >
                                <Ticket size={12} strokeWidth={3} />
                                <span className="hidden sm:inline">{allSelectedInGroup ? 'Desmarcar Grupo' : 'Selecionar Grupo'}</span>
                                <span className="sm:hidden">{allSelectedInGroup ? 'Desmarcar' : 'Selecionar'}</span>
                            </button>

                            {/* Direct Generate Image Button if group has selected items */}
                            {countSelectedInGroup > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentGroupTitle(formatDateHeader(key));
                                        setIsTicketModalOpen(true);
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 hover:bg-emerald-400 border border-emerald-400 shadow-sm transition-all"
                                    title="Gerar Imagem do Bilhete"
                                >
                                    <Share2 size={12} strokeWidth={3} />
                                    <span className="hidden sm:inline">Gerar Imagem</span>
                                </button>
                            )}

                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </div>

                    {isExpanded && (
                    <div className="flex flex-col gap-0">
                        {(() => {
                            let items = groupItems;
                            if (key.includes('IAGO')) {
                                const getIagoOrder = (desc: string) => {
                                    const d = desc.toUpperCase();
                                    if (d.includes('AIRBNB')) return 10;
                                    if (d.includes('ACRÉSCIMO PASSAGEM') || d.includes('ACRESCIMO PASSAGEM')) return 20;
                                    if (d.includes('PASSAGEM') || d.includes('PASSAGENS')) return 21;
                                    if (d.includes('PRIMEIRO CARRO')) return 30;
                                    if (d.includes('SEGUNDO CARRO')) return 31;
                                    if (d.includes('CARRO')) return 32;
                                    if (d.includes('INGRESSO')) return 40;
                                    if (d.includes('EMPRÉSTIMO') || d.includes('EMPRESTIMO')) return 50;
                                    if (d.includes('MULTISELO')) return 60;
                                    if (d.includes('CLARO')) return 70;
                                    if (d.includes('ABASTECIMENTO') || d.includes('POSTO')) return 80;
                                    if (d.includes('UBER')) return 85;
                                    if (d.includes('GUANABARA')) return 90;
                                    return 100;
                                };
                                items = [...items].sort((a, b) => getIagoOrder(a.description) - getIagoOrder(b.description));
                            }
                            return items.map(item => {
                            const isAllocation = key.includes('Distribuição');
                            const isSelected = selectedIds.includes(item.id);

                            return (
                                <div 
                                    key={item.id} 
                                    className={`relative group rounded-none px-4 py-4 lg:px-6 lg:py-5 flex items-center gap-3 lg:gap-4 border-b transition-all duration-300 active:scale-[0.98] cursor-pointer overflow-hidden
                                        ${isSelected ? 'bg-orange-500/10 border-l-4 border-l-orange-500 border-orange-500/30' : 'border-t-0'}
                                        ${!isSelected && (isAllocation 
                                            ? groupColors.card + ' shadow-sm' 
                                            : `${groupColors.card} shadow-[0_4px_20px_-12px_rgba(0,0,0,0.08)] hover:shadow-lg`
                                        )}
                                        ${item.paid ? 'opacity-60 grayscale-[0.5]' : (item.skipped || item.isSuspended) ? 'opacity-40 grayscale' : ''}`}
                                    onClick={(e) => {
                                        if (!(e.target as HTMLElement).closest('.toggle-area')) {
                                            onEdit(item);
                                        }
                                    }}
                                >
                                    {/* TICKET SELECTION CHECKBOX (BETANO STYLE) */}
                                    <div className="toggle-area shrink-0 z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelectItem(item.id);
                                            }}
                                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all ${
                                                isSelected 
                                                    ? 'bg-orange-500 text-slate-950 font-black shadow-lg shadow-orange-500/30 scale-105' 
                                                    : 'bg-white border-2 border-slate-300 text-slate-300 hover:border-orange-400 hover:text-orange-400'
                                            }`}
                                            title="Selecionar esta conta para o bilhete"
                                        >
                                            <Ticket size={16} strokeWidth={isSelected ? 3 : 2} />
                                        </button>
                                    </div>

                                    {/* SWITCH TOGGLE BUTTON - Modernized */}
                                    <div className="toggle-area shrink-0 self-center z-10">
                                         <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTogglePaid(item.id, !item.paid);
                                            }}
                                            className={`relative w-10 lg:w-14 h-6 lg:h-8 rounded-full transition-all duration-500 ease-out focus:outline-none ${
                                                item.paid 
                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                                    : 'bg-gray-200 shadow-inner'
                                            }`}
                                         >
                                            <div className={`absolute top-0.5 lg:top-1 left-0.5 lg:left-1 bg-white w-5 lg:w-6 h-5 lg:h-6 rounded-full shadow-sm transform transition-transform duration-500 flex items-center justify-center ${
                                                item.paid ? 'translate-x-4 lg:translate-x-6' : 'translate-x-0'
                                            }`}>
                                                {item.paid && <CheckCircle2 size={10} className="text-emerald-600" strokeWidth={4} />}
                                            </div>
                                         </button>
                                    </div>

                                    {/* CONTENT */}
                                    <div className="flex-1 flex flex-col gap-0.5 lg:gap-1 overflow-hidden z-10">
                                        <div className="flex justify-between items-start gap-2 lg:gap-3">
                                            <div className="flex-1 flex flex-col min-w-0">
                                                <textarea 
                                                    value={item.description}
                                                    onChange={(e) => onUpdate({ ...item, description: e.target.value })}
                                                    onClick={(e) => e.stopPropagation()}
                                                    rows={item.description.length > 28 ? 2 : 1}
                                                    className={`w-full bg-transparent border-none p-0 focus:ring-0 font-black text-[11px] sm:text-base leading-tight resize-none overflow-hidden outline-none ${item.paid || item.skipped || item.isSuspended ? 'text-gray-400 line-through' : isAllocation ? 'text-amber-900' : 'text-slate-800'}`}
                                                />
                                                {item.isSuspended && (
                                                    <span className="text-[8px] lg:text-xs font-black text-rose-500 uppercase tracking-tighter flex items-center gap-1">
                                                        <FileWarning size={8} /> Suspensa {item.suspendedUntil ? `até ${item.suspendedUntil}` : 'indeterminado'}
                                                    </span>
                                                )}
                                            </div>
                                            {/* ON/OFF TOGGLE (LIGAR / DESLIGAR DO MÊS) + VALOR */}
                                            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                                                {/* Botão de Ligar / Desligar para o Mês */}
                                                <div 
                                                    className="toggle-area flex items-center gap-1.5"
                                                    title={item.skipped ? "Conta DESLIGADA neste mês (não entra na soma e não será paga)" : "Conta LIGADA neste mês (ativa para pagamento)"}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdate({ ...item, skipped: !item.skipped });
                                                        }}
                                                        className={`relative inline-flex items-center h-5 lg:h-6 w-9 lg:w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-all duration-300 ease-in-out focus:outline-none ${
                                                            !item.skipped 
                                                                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' 
                                                                : 'bg-slate-300 hover:bg-slate-400'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-4 lg:h-5 w-4 lg:w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out flex items-center justify-center ${
                                                                !item.skipped 
                                                                    ? 'translate-x-4 lg:translate-x-5 text-emerald-600' 
                                                                    : 'translate-x-0 text-slate-400'
                                                            }`}
                                                        >
                                                            {!item.skipped ? (
                                                                <Check size={10} strokeWidth={3.5} className="text-emerald-600" />
                                                            ) : (
                                                                <X size={10} strokeWidth={3.5} className="text-slate-400" />
                                                            )}
                                                        </span>
                                                    </button>
                                                    <span className={`text-[9px] lg:text-[10px] font-black uppercase tracking-wider hidden sm:inline ${
                                                        !item.skipped ? 'text-emerald-700' : 'text-slate-400 line-through'
                                                    }`}>
                                                        {!item.skipped ? 'ON' : 'OFF'}
                                                    </span>
                                                </div>

                                                {/* Valor R$ */}
                                                <div className={`flex items-center gap-1 shrink-0 ${item.skipped ? 'opacity-40 line-through' : ''}`}>
                                                    <span className={`text-[10px] lg:text-sm font-black opacity-50 ${item.paid || item.skipped ? 'text-gray-400' : 'text-slate-400'}`}>R$</span>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        disabled={item.skipped}
                                                        value={typeof item.amount === 'number' && !isNaN(item.amount) ? Math.round(item.amount * 100) / 100 : item.amount}
                                                        onChange={(e) => onUpdate({ ...item, amount: Math.round((parseFloat(e.target.value) || 0) * 100) / 100 })}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`w-16 lg:w-28 bg-transparent border-none p-0 focus:ring-0 font-black text-xs lg:text-lg text-right outline-none tracking-tight ${item.paid || item.skipped ? 'text-gray-400' : isAllocation ? 'text-amber-900' : 'text-slate-900'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                                            <div className={`flex items-center gap-1 px-2 py-0.5 lg:px-3 lg:py-1.5 rounded-lg text-[8px] lg:text-xs font-black uppercase tracking-wide ${getCategoryColor(item.category)} bg-opacity-50`}>
                                                {React.cloneElement(getCategoryIcon(item.category) as React.ReactElement, { size: 12 })}
                                                <span>{item.category}</span>
                                            </div>
                                            
                                            {item.skipped && (
                                                <div className="px-2 py-0.5 lg:px-3 lg:py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shadow-sm font-black text-[8px] lg:text-xs uppercase">
                                                    <PowerOff size={11} strokeWidth={3} />
                                                    <span>Desligado no mês</span>
                                                </div>
                                            )}
                                            
                                            {item.dueDate && (
                                                <div className="px-2 py-0.5 lg:px-3 lg:py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 shadow-sm">
                                                    <span className="text-[8px] lg:text-xs font-black tracking-widest uppercase opacity-70">Dia</span>
                                                    <span className="text-[10px] lg:text-sm font-black">{item.dueDate.split('-')[2]}</span>
                                                </div>
                                            )}
                                            {item.installments && (
                                                <div className="px-2 py-0.5 lg:px-3 lg:py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1 shadow-sm">
                                                    <span className="text-[8px] lg:text-xs font-black tracking-widest uppercase opacity-70">Parc.</span>
                                                    <span className="text-[10px] lg:text-sm font-black">{item.installments.current === 0 ? 'Ñ' : item.installments.current}/{item.installments.total}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                    </div>
                    )}
                </div>
            );
            })}

            {/* FLOATING BETANO BET SLIP BAR */}
            {selectedTransactions.length > 0 && (
                <div className="fixed bottom-20 sm:bottom-24 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-[70] bg-slate-950/95 border-2 border-orange-500 text-white p-3 sm:p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center justify-between gap-3 animate-slide-up">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-orange-500/30">
                            <Ticket size={22} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-white truncate">
                                {selectedTransactions.length} conta{selectedTransactions.length > 1 ? 's' : ''} no bilhete
                            </span>
                            <span className="text-sm sm:text-base font-black text-orange-400 font-mono tracking-tight">
                                {formatCurrency(selectedTotalSum)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={clearSelection}
                            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all"
                            title="Limpar Seleção"
                        >
                            <Trash2 size={16} />
                        </button>
                        <button
                            onClick={() => setIsTicketModalOpen(true)}
                            className="py-2.5 px-3.5 sm:px-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-slate-950 text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-orange-500/30 flex items-center gap-1.5 transition-all"
                        >
                            <Share2 size={16} strokeWidth={3} />
                            <span>Gerar Imagem</span>
                        </button>
                    </div>
                </div>
            )}

            {/* TICKET IMAGE GENERATOR MODAL */}
            <TicketModal 
                isOpen={isTicketModalOpen}
                onClose={() => setIsTicketModalOpen(false)}
                selectedTransactions={selectedTransactions}
                currentMonth={currentMonth}
                currentYear={currentYear}
                categoryOrGroupTitle={currentGroupTitle}
            />
        </div>
    );
};

export default TransactionList;