import React, { useState, useEffect } from 'react';
import { PiggyBank, Coins, Target, Sparkles, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { MonthData } from '../types';

interface SavingsPlannerProps {
    monthData: MonthData;
    currencyFormatter: (val: number) => string;
}

interface SavingsGoal {
    id: string;
    title: string;
    targetAmount: number;
    savedAmount: number;
    category: string;
}

export const SavingsPlanner: React.FC<SavingsPlannerProps> = ({ monthData, currencyFormatter }) => {
    const totalIncome = monthData.incomes.reduce((acc, i) => acc + i.amount, 0);
    const totalExpenses = monthData.expenses.reduce((acc, e) => acc + e.amount, 0) + monthData.avulsosItems.reduce((acc, a) => acc + a.amount, 0);
    const monthlySurplus = totalIncome - totalExpenses;

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

    const [newTitle, setNewTitle] = useState('');
    const [newTarget, setNewTarget] = useState('');
    const [selectedMonthlySave, setSelectedMonthlySave] = useState<number>(30);

    useEffect(() => {
        try {
            localStorage.setItem('financas_savings_goals', JSON.stringify(goals));
        } catch (e) {
            console.error(e);
        }
    }, [goals]);

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

    const handleAddFunds = (id: string, amount: number) => {
        setGoals(goals.map(g => g.id === id ? { ...g, savedAmount: Math.max(0, g.savedAmount + amount) } : g));
    };

    const handleDeleteGoal = (id: string) => {
        setGoals(goals.filter(g => g.id !== id));
    };

    return (
        <div className="w-full flex flex-col gap-6 pb-16 animate-fadeIn">
            {/* Header banner */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-teal-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            <PiggyBank size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black tracking-tight">Planejador de Poupança</h2>
                            <p className="text-xs text-slate-300 font-medium">Construa o hábito de guardar dinheiro, mesmo com a renda apertada.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Renda do Mês</span>
                            <p className="text-lg font-black text-emerald-400 mt-1">{currencyFormatter(totalIncome)}</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gastos Totais</span>
                            <p className="text-lg font-black text-rose-400 mt-1">{currencyFormatter(totalExpenses)}</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sobra Estimada</span>
                            <p className={`text-lg font-black mt-1 ${monthlySurplus >= 0 ? 'text-teal-300' : 'text-amber-400'}`}>
                                {currencyFormatter(monthlySurplus)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Micro-Savings Habit Builder */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={18} className="text-teal-600" />
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Desafio do Hábito (Pouco a Pouco)</h3>
                </div>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Mesmo com orçamento apertado, guardar o equivalente a um cafezinho por dia cria um colchão de segurança essencial. Escolha quanto deseja separar por mês:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[10, 30, 50, 100].map(val => (
                        <button
                            key={val}
                            onClick={() => setSelectedMonthlySave(val)}
                            className={`py-3 px-4 rounded-2xl border font-black text-sm transition-all flex flex-col items-center gap-1 ${selectedMonthlySave === val ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                        >
                            <span>{currencyFormatter(val)}</span>
                            <span className="text-[10px] font-normal opacity-80">por mês</span>
                        </button>
                    ))}
                </div>

                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                            <Coins size={20} />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-teal-900">Em 1 ano guardando {currencyFormatter(selectedMonthlySave)}/mês:</span>
                            <h4 className="text-base font-black text-teal-700">{currencyFormatter(selectedMonthlySave * 12)}</h4>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Apenas</span>
                        <p className="text-xs font-bold text-teal-900">{currencyFormatter(selectedMonthlySave / 30)} / dia</p>
                    </div>
                </div>
            </div>

            {/* Savings Goals / Cofrinhos */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target size={18} className="text-indigo-600" />
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Meus Cofrinhos & Metas</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{goals.length} metas ativas</span>
                </div>

                {/* Goals List */}
                <div className="space-y-4 mb-6">
                    {goals.map(goal => {
                        const progress = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
                        return (
                            <div key={goal.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
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

                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-600">Guardado: <strong className="text-teal-600">{currencyFormatter(goal.savedAmount)}</strong></span>
                                    <span className="font-bold text-slate-400">Meta: {currencyFormatter(goal.targetAmount)} ({progress}%)</span>
                                </div>

                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div className="bg-teal-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <button 
                                        onClick={() => handleAddFunds(goal.id, 10)}
                                        className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all flex items-center justify-center gap-1"
                                    >
                                        <Plus size={14} /> +R$ 10
                                    </button>
                                    <button 
                                        onClick={() => handleAddFunds(goal.id, 50)}
                                        className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all flex items-center justify-center gap-1"
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
                        placeholder="Nome do cofrinho (ex: Reserva Urgente)"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="flex-1 py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                    <input 
                        type="number"
                        placeholder="Meta (R$)"
                        value={newTarget}
                        onChange={e => setNewTarget(e.target.value)}
                        className="w-full sm:w-32 py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                    <button 
                        type="submit"
                        className="py-3 px-6 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Criar Meta
                    </button>
                </form>
            </div>

            {/* Smart Tips for Tight Budget */}
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={20} className="text-amber-700" />
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">Regras de Ouro para Orçamento Apertado</h4>
                </div>
                <ul className="space-y-2 text-xs text-amber-950 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                        <span className="text-amber-700 font-black">•</span>
                        <span><strong>Pague-se primeiro:</strong> Assim que entrar qualquer receita, separe imediatamente o seu valor mínimo de poupança (mesmo que seja R$ 5 ou R$ 10), antes de pagar contas flexíveis.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-amber-700 font-black">•</span>
                        <span><strong>Proteja-se de juros:</strong> Evite ao máximo dívidas com juros rotativos altos; use a sobra líquida para quitar o essencial primeiro.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-amber-700 font-black">•</span>
                        <span><strong>Micro-hábitos:</strong> Não espere sobra grandiosa para começar. Quem guarda R$ 10 hoje aprende a disciplina para guardar R$ 1.000 amanhã.</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default SavingsPlanner;
