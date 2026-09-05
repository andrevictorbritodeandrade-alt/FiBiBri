import React, { useState, useEffect } from 'react';
import { 
    PiggyBank, 
    Coins, 
    Target, 
    Sparkles, 
    Plus, 
    Trash2, 
    ShieldCheck, 
    ArrowUpRight, 
    ArrowDownLeft, 
    TrendingUp, 
    Info, 
    Percent, 
    HelpCircle,
    Building2,
    Calendar,
    ChevronRight
} from 'lucide-react';
import { MonthData } from '../types';

interface SavingsPlannerProps {
    monthData: MonthData;
    currencyFormatter: (val: number) => string;
    onUpdateReserves: (reserves: { santander: number; inter: number; sofisa: number }) => void;
}

interface SofisaMovement {
    id: string;
    date: string;
    type: 'deposit' | 'withdraw';
    amount: number;
    description: string;
}

interface SavingsGoal {
    id: string;
    title: string;
    targetAmount: number;
    savedAmount: number;
    category: string;
}

export const SavingsPlanner: React.FC<SavingsPlannerProps> = ({ monthData, currencyFormatter, onUpdateReserves }) => {
    const totalIncome = monthData.incomes.reduce((acc, i) => acc + i.amount, 0);
    const totalExpenses = monthData.expenses.reduce((acc, e) => acc + e.amount, 0) + monthData.avulsosItems.reduce((acc, a) => acc + a.amount, 0);
    const monthlySurplus = totalIncome - totalExpenses;

    const currentSofisaBalance = monthData.bankReserves?.sofisa || 0;
    const currentSantanderBalance = monthData.bankReserves?.santander || 0;
    const currentInterBalance = monthData.bankReserves?.inter || 0;

    // Persist and load Sofisa Movements
    const [movements, setMovements] = useState<SofisaMovement[]>(() => {
        try {
            const saved = localStorage.getItem('financas_sofisa_movements');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error(e);
        }
        // Pre-populate with realistic entries matching the R$ 100,00 initial balance
        return [
            { id: 'm1', date: '2026-03-15', type: 'deposit', amount: 50.00, description: 'Depósito Inicial (Poupança protegida)' },
            { id: 'm2', date: '2026-05-20', type: 'deposit', amount: 30.00, description: 'Economia Alocada (Maio)' },
            { id: 'm3', date: '2026-08-10', type: 'deposit', amount: 20.00, description: 'Reserva Adicional (Agosto)' }
        ];
    });

    const [goals, setGoals] = useState<SavingsGoal[]>(() => {
        try {
            const saved = localStorage.getItem('financas_savings_goals');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error(e);
        }
        return [
            { id: '1', title: 'Reserva de Emergência Mínima', targetAmount: 200, savedAmount: 50, category: 'Segurança' },
            { id: '2', title: 'Fundo para Imprevistos', targetAmount: 100, savedAmount: 20, category: 'Saúde' }
        ];
    });

    // Inputs for Sofisa operations
    const [sofisaAmount, setSofisaAmount] = useState('');
    const [sofisaDesc, setSofisaDesc] = useState('');
    const [opType, setOpType] = useState<'deposit' | 'withdraw'>('deposit');
    const [sofisaDate, setSofisaDate] = useState('2026-09-05'); // Fixed baseline date based on current local time

    // Inputs for custom goals
    const [newTitle, setNewTitle] = useState('');
    const [newTarget, setNewTarget] = useState('');

    // Yield Simulator inputs
    const [simAmount, setSimAmount] = useState<number>(currentSofisaBalance || 1000);

    useEffect(() => {
        if (currentSofisaBalance > 0 && simAmount === 1000) {
            setSimAmount(currentSofisaBalance);
        }
    }, [currentSofisaBalance]);

    useEffect(() => {
        try {
            localStorage.setItem('financas_sofisa_movements', JSON.stringify(movements));
        } catch (e) {
            console.error(e);
        }
    }, [movements]);

    useEffect(() => {
        try {
            localStorage.setItem('financas_savings_goals', JSON.stringify(goals));
        } catch (e) {
            console.error(e);
        }
    }, [goals]);

    // Calculate days/months elapsed relative to current date (2026-09-05)
    const calculateTimeElapsed = (dateStr: string) => {
        const depositDate = new Date(dateStr);
        const currentDate = new Date('2026-09-05');
        
        if (depositDate > currentDate) return 'Recente';
        
        const diffTime = Math.abs(currentDate.getTime() - depositDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) {
            return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
        }
        const months = Math.floor(diffDays / 30);
        const remainingDays = diffDays % 30;
        if (remainingDays === 0) {
            return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
        }
        return `há ${months} ${months === 1 ? 'mês' : 'meses'} e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`;
    };

    // Handle Deposit/Withdrawal to Sofisa Savings
    const handleSofisaTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(sofisaAmount);
        if (isNaN(amt) || amt <= 0) return;

        if (opType === 'withdraw' && amt > currentSofisaBalance) {
            alert('Saldo insuficiente na Poupança Sofisa para realizar este resgate!');
            return;
        }

        // Create movement
        const newMovement: SofisaMovement = {
            id: Date.now().toString(),
            date: sofisaDate,
            type: opType,
            amount: amt,
            description: sofisaDesc.trim() || (opType === 'deposit' ? 'Depósito via Santander' : 'Resgate para Santander')
        };

        // Update reserves:
        // Deposit: Decreases Santander, increases Sofisa
        // Withdraw: Increases Santander, decreases Sofisa
        let newSofisa = currentSofisaBalance;
        let newSantander = currentSantanderBalance;

        if (opType === 'deposit') {
            newSofisa += amt;
            newSantander -= amt; // Deducts from checking account
        } else {
            newSofisa -= amt;
            newSantander += amt; // Adds back to checking account
        }

        onUpdateReserves({
            santander: Math.round(newSantander * 100) / 100,
            inter: currentInterBalance,
            sofisa: Math.round(newSofisa * 100) / 100
        });

        setMovements([newMovement, ...movements]);
        setSofisaAmount('');
        setSofisaDesc('');
    };

    const handleDeleteMovement = (id: string, movementType: 'deposit' | 'withdraw', amount: number) => {
        // Revert reserves before deleting
        let newSofisa = currentSofisaBalance;
        let newSantander = currentSantanderBalance;

        if (movementType === 'deposit') {
            newSofisa -= amount;
            newSantander += amount;
        } else {
            newSofisa += amount;
            newSantander -= amount;
        }

        onUpdateReserves({
            santander: Math.round(newSantander * 100) / 100,
            inter: currentInterBalance,
            sofisa: Math.round(newSofisa * 100) / 100
        });

        setMovements(movements.filter(m => m.id !== id));
    };

    // Handle Goals
    const handleAddGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newTarget) return;
        const target = parseFloat(newTarget);
        if (isNaN(target) || target <= 0) return;

        const goal: SavingsGoal = {
            id: Date.now().toString(),
            title: newTitle.trim(),
            targetAmount: target,
            savedAmount: 0,
            category: 'Geral'
        };

        setGoals([...goals, goal]);
        setNewTitle('');
        setNewTarget('');
    };

    const handleAddFundsToGoal = (id: string, amount: number) => {
        setGoals(goals.map(g => g.id === id ? { ...g, savedAmount: Math.max(0, g.savedAmount + amount) } : g));
    };

    const handleDeleteGoal = (id: string) => {
        setGoals(goals.filter(g => g.id !== id));
    };

    // Simulator calculations (SELIC at ~11.25%, CDI at ~11.15%)
    // Savings: ~6.17% per year
    // CDB 110% CDI Sofisa: ~12.26% gross -> After 17.5% Income Tax (for 1 year holding) -> ~10.11% net yield
    const annualSavingsYield = simAmount * 0.0617;
    const annualCdbYield = simAmount * 0.1011; // Net yield after IR tax
    const diffYield = annualCdbYield - annualSavingsYield;

    return (
        <div className="w-full flex flex-col gap-6 pb-16 animate-fadeIn">
            {/* Real Bank Account Visual - Sofisa Direto */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-500/25">
                <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 blur-[90px] rounded-full"></div>
                <div className="absolute bottom-0 left-12 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full"></div>
                
                <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                <Building2 size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs uppercase font-black tracking-widest text-orange-400">Banco Sofisa Direto</span>
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">FGC Protegido</span>
                                </div>
                                <h2 className="text-lg lg:text-xl font-black tracking-tight text-white mt-0.5">Poupança Protegida Sofisa</h2>
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Saldo na Poupança</span>
                            <span className="text-3xl lg:text-4xl font-black tracking-tight text-orange-300 mt-1 block">
                                {currencyFormatter(currentSofisaBalance)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Conta Origem (Giro)</span>
                                <p className="text-base font-black text-slate-200 mt-1">Santander</p>
                            </div>
                            <span className="text-xs text-slate-400 font-bold mt-2">Disponível: {currencyFormatter(currentSantanderBalance)}</span>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status do Saldo</span>
                                <p className="text-base font-black text-teal-400 mt-1">Livre para Resgate</p>
                            </div>
                            <span className="text-xs text-slate-400 font-bold mt-2">Sem carência ou travas</span>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tempo Acumulado</span>
                                <p className="text-base font-black text-orange-400 mt-1">Desde Março/2026</p>
                            </div>
                            <span className="text-xs text-slate-400 font-bold mt-2">Primeiro depósito há 174 dias</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split Operations & Movements */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Statement & Movements (Left 7 columns) */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-600" />
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Extrato & Tempo Investido</h3>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{movements.length} transações</span>
                        </div>

                        {/* Statement Timeline */}
                        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                            {movements.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-xs font-bold">
                                    Nenhuma movimentação registrada na poupança Sofisa.
                                </div>
                            ) : (
                                movements.map((m) => {
                                    const isDeposit = m.type === 'deposit';
                                    return (
                                        <div key={m.id} className="group p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100 transition-all flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                                    isDeposit 
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                        : 'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                    {isDeposit ? <ArrowUpRight size={18} strokeWidth={2.5} /> : <ArrowDownLeft size={18} strokeWidth={2.5} />}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs sm:text-sm font-black text-slate-900">{m.description}</h4>
                                                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5">
                                                        <span>{new Date(m.date).toLocaleDateString('pt-BR')}</span>
                                                        <span>•</span>
                                                        <span className="text-indigo-600">{calculateTimeElapsed(m.date)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm sm:text-base font-black text-right ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {isDeposit ? '+' : '-'} {currencyFormatter(m.amount)}
                                                </span>
                                                <button 
                                                    onClick={() => handleDeleteMovement(m.id, m.type, m.amount)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-300 transition-all"
                                                    title="Estornar e Deletar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center gap-2 mt-4 text-[11px] text-slate-500 font-bold">
                        <Info size={14} className="text-indigo-500 shrink-0" />
                        <span>O saldo total da poupança é integrado com as reservas gerais e protegido de gastos acidentais.</span>
                    </div>
                </div>

                {/* Operations Form (Right 5 columns) */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Plus size={18} className="text-orange-500" />
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Movimentar Saldo</h3>
                        </div>

                        <form onSubmit={handleSofisaTransaction} className="space-y-4">
                            {/* Operation Selector Toggle */}
                            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setOpType('deposit')}
                                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase transition-all ${
                                        opType === 'deposit' 
                                            ? 'bg-white text-emerald-700 shadow-sm border border-emerald-50' 
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Guardar (Poupar)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOpType('withdraw')}
                                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase transition-all ${
                                        opType === 'withdraw' 
                                            ? 'bg-white text-rose-700 shadow-sm border border-rose-50' 
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Resgatar (Giro)
                                </button>
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Valor (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    placeholder="Ex: 50.00"
                                    value={sofisaAmount}
                                    onChange={e => setSofisaAmount(e.target.value)}
                                    className="w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-600"
                                />
                            </div>

                            {/* Description Input */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 font-bold">Descrição / Motivo</label>
                                <input 
                                    type="text" 
                                    placeholder={opType === 'deposit' ? 'Ex: Economia do mês' : 'Ex: Pagar boleto urgente'}
                                    value={sofisaDesc}
                                    onChange={e => setSofisaDesc(e.target.value)}
                                    className="w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                                />
                            </div>

                            {/* Date Input */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Data do Depósito</label>
                                <input 
                                    type="date" 
                                    required
                                    value={sofisaDate}
                                    onChange={e => setSofisaDate(e.target.value)}
                                    className="w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-950 focus:outline-none focus:border-indigo-600"
                                />
                            </div>

                            <button 
                                type="submit"
                                className={`w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md ${
                                    opType === 'deposit'
                                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10'
                                        : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/10'
                                }`}
                            >
                                {opType === 'deposit' ? (
                                    <>
                                        <Plus size={16} strokeWidth={2.5} /> Guardar na Poupança
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownLeft size={16} strokeWidth={2.5} /> Resgatar para Santander
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="text-[10px] font-medium text-slate-400 mt-4 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {opType === 'deposit' 
                            ? "Dedução Automática: O valor guardado sairá do saldo do Santander no fluxo real." 
                            : "Estorno Automático: O valor resgatado entrará de volta no Santander para pagamentos."
                        }
                    </div>
                </div>

            </div>

            {/* Smart Simulator - Como melhorar (CDI vs Poupança) */}
            <div className="bg-gradient-to-br from-indigo-50/70 to-teal-50/50 border border-indigo-100 rounded-3xl p-6 lg:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                            <TrendingUp size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Como Otimizar: CDB 110% CDI Sofisa</h3>
                            <p className="text-xs text-slate-500 font-medium">A poupança comum rende muito pouco. Veja como fazer seu dinheiro trabalhar mais.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-600 uppercase">Simular Valor:</span>
                        <input 
                            type="number"
                            value={simAmount}
                            onChange={(e) => setSimAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-28 py-1.5 px-3 bg-white border border-slate-200 text-xs font-black rounded-xl text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Visual Comparison */}
                    <div className="space-y-4">
                        {/* Poupança Card */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                                <span className="flex items-center gap-1.5"><Percent size={14} /> Poupança Tradicional (Sofisa ou outros)</span>
                                <span className="text-amber-600 font-bold">~6,17% a.a.</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-black text-slate-700">{currencyFormatter(simAmount + annualSavingsYield)}</span>
                                <span className="text-xs font-bold text-emerald-600">+{currencyFormatter(annualSavingsYield)} de rendimento</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
                                <div className="bg-slate-400 h-full rounded-full" style={{ width: '60%' }}></div>
                            </div>
                        </div>

                        {/* CDB Card */}
                        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm relative overflow-hidden ring-2 ring-indigo-500/10">
                            <div className="absolute top-0 right-0 bg-indigo-600 text-[9px] text-white font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                                Recomendado
                            </div>
                            <div className="flex items-center justify-between text-xs font-black text-indigo-950 uppercase tracking-wider mb-2">
                                <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-500" /> CDB Liquidez Diária 110% CDI</span>
                                <span className="text-indigo-600">~10,11% a.a. líquido</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-black text-indigo-950">{currencyFormatter(simAmount + annualCdbYield)}</span>
                                <span className="text-xs font-bold text-indigo-600">+{currencyFormatter(annualCdbYield)} de rendimento</span>
                            </div>
                            <div className="w-full bg-indigo-50 h-2.5 rounded-full overflow-hidden mt-3">
                                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Simulation results & action */}
                    <div className="bg-white/80 rounded-2xl p-5 border border-indigo-50/50 flex flex-col justify-between h-full">
                        <div>
                            <span className="text-[10px] uppercase font-black text-indigo-800 tracking-wider">Lucro Adicional Estimado (1 ano)</span>
                            <div className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight mt-1.5 flex items-center gap-2">
                                <span className="text-teal-600">+{currencyFormatter(diffYield)}</span>
                                <span className="text-xs font-bold text-slate-500">líquidos na sua conta</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-3 font-medium leading-relaxed">
                                No próprio aplicativo do **Sofisa Direto**, você pode aplicar seu dinheiro no **CDB de Liquidez Diária de 110% do CDI** ao invés da poupança comum. Ele rende muito mais, tem resgate imediato e conta com a mesma garantia do FGC.
                            </p>
                        </div>

                        <div className="mt-5 pt-4 border-t border-indigo-100/50 flex items-center justify-between gap-4 text-[11px] font-bold text-indigo-950">
                            <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-teal-600" /> 100% Seguro</span>
                            <span className="flex items-center gap-1"><Building2 size={14} strokeWidth={2.5} /> Liquidez Diária</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Savings Goals / Cofrinhos Extras */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target size={18} className="text-indigo-600" />
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Outros Cofrinhos & Metas Extras</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{goals.length} metas ativas</span>
                </div>

                {/* Goals List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {goals.map(goal => {
                        const progress = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
                        return (
                            <div key={goal.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between gap-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">{goal.title}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{goal.category}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteGoal(goal.id)}
                                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-bold text-slate-600">Guardado: <strong className="text-teal-600">{currencyFormatter(goal.savedAmount)}</strong></span>
                                        <span className="font-bold text-slate-400">{progress}% de {currencyFormatter(goal.targetAmount)}</span>
                                    </div>

                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                        <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <button 
                                        onClick={() => handleAddFundsToGoal(goal.id, 10)}
                                        className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all flex items-center justify-center gap-1"
                                    >
                                        <Plus size={14} /> +R$ 10
                                    </button>
                                    <button 
                                        onClick={() => handleAddFundsToGoal(goal.id, 50)}
                                        className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all flex items-center justify-center gap-1"
                                    >
                                        <Plus size={14} /> +R$ 50
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add Goal Form */}
                <form onSubmit={handleAddGoal} className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                    <input 
                        type="text"
                        placeholder="Nome do cofrinho (ex: Viagem de Salvador)"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="flex-1 py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    <input 
                        type="number"
                        placeholder="Meta (R$)"
                        value={newTarget}
                        onChange={e => setNewTarget(e.target.value)}
                        className="w-full sm:w-32 py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    <button 
                        type="submit"
                        className="py-3 px-6 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Criar Meta
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SavingsPlanner;
