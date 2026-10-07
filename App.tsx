import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import Sidebar from './components/Sidebar';
import SummaryCard from './components/SummaryCard';
import TransactionList from './components/TransactionList';
import Statistics from './components/Statistics';
import Settlements from './components/Settlements';
import FlightPlan from './components/FlightPlan';
import SavingsPlanner from './components/SavingsPlanner';
import EditTransactionModal from './components/EditTransactionModal';
import FinancialHealthWidget from './components/FinancialHealthWidget';
import DailyBalanceTracker from './components/DailyBalanceTracker';
import Header from './components/Header';
import { MonthData, TransactionType, Transaction, FinancialProjection, DebtSettlement, DailyBalanceLog } from './types';
import { generateMonthData, getStorageKey } from './utils/financeUtils';
import { INITIAL_SEPTEMBER_AVULSO_TRANSACTIONS } from './data/avulsoData';
import { db, auth, isConfigured, onAuthStateChanged, signInAnonymously } from './services/firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { FAMILY_ID } from './constants';
import { Target, Plus, ShoppingBag, User, Users, ArrowRight, Plane, Wallet, PiggyBank, Home as HomeIcon, Palmtree, Heart, Car, GraduationCap, MoreHorizontal, TrendingUp, ShoppingCart, FileWarning, CreditCard, Shirt, Landmark, Clock, Calendar, Check, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from './utils/financeUtils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const jsonError = JSON.stringify(errInfo);
  console.error("Firestore Error: ", jsonError);
  // Do not throw as it crashes the entire React tree causing a white screen
  // instead, we just log and let the app continue in offline mode if possible
};

const App: React.FC = () => {
    // App State
    // Default to September 2026 if it's currently August 2026, otherwise use current month
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return (now.getFullYear() === 2026 && now.getMonth() === 7) ? 9 : now.getMonth() + 1;
    });
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [monthData, setMonthData] = useState<MonthData | null>(null);
    const [view, setView] = useState<'home' | 'transactions' | 'statistics' | 'settlements' | 'flightPlan' | 'savings'>('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'offline' | 'syncing' | 'online'>('offline');
    const [transactionListType, setTransactionListType] = useState<TransactionType>('expenses');
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
    const [filter, setFilter] = useState<{ type: 'group' | 'none', value: string }>({ type: 'none', value: '' });

    const [showSecurityMessage, setShowSecurityMessage] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            setDeferredPrompt(null);
        });
    };

    // Edit Modal State
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [checkIn, setCheckIn] = useState<{ isDone: boolean; date: string | null }>({ isDone: false, date: null });
    // NEW: Centralized Bank Reserves Update from monthData
    const bankReserves = useMemo(() => {
        return monthData?.bankReserves || { santander: 0, inter: 0, sofisa: 0 };
    }, [monthData]);

    const handleUpdateReserves = (newReserves: { santander: number; inter: number; sofisa: number }) => {
        if (!monthData) return;
        saveData({ ...monthData, bankReserves: newReserves }, currentYear, currentMonth);
    };

    useEffect(() => {
        if (monthData?.checkIn) {
            setCheckIn(monthData.checkIn);
        } else {
            setCheckIn({ isDone: false, date: null });
        }
    }, [monthData]);

    const handleCheckIn = () => {
        if (!monthData) return;
        const date = new Date().toISOString();
        const newState = { isDone: true, date };
        setCheckIn(newState);
        saveData({ ...monthData, checkIn: newState }, currentYear, currentMonth);
    };

    const handleUpdateSettlements = (newSettlements: DebtSettlement[]) => {
        if (!monthData) return;
        saveData({ ...monthData, debtSettlements: newSettlements }, currentYear, currentMonth);
    };

    const handleUpdateDailyBalances = (newDailyBalances: DailyBalanceLog[]) => {
        if (!monthData) return;
        saveData({ ...monthData, dailyBalances: newDailyBalances }, currentYear, currentMonth);
    };

    // Santander balance based on User Calculation (May 2026 Cycle)
    // Managed centrally in ensureSystemIntegrity and handleTogglePaid

    // User request: Avulsos are now baked into defaults in financeUtils.ts

    // Automatic salary payment
    useEffect(() => {
        if (!monthData) return;
        
        const now = new Date();
        const payTimeLimit = new Date();
        payTimeLimit.setHours(7, 1, 0, 0);

        let updated = false;
        const newIncomes = monthData.incomes.map(item => {
            if (item.category === 'Salário' && !item.paid && item.dueDate) {
                const [y, m, d] = item.dueDate.split('-').map(Number);
                const dueDate = new Date(y, m - 1, d);
                
                // If today is or after due date and it's past 07:01 AM (or it's after the due date)
                if (now >= dueDate && (now.getDate() !== dueDate.getDate() || now >= payTimeLimit)) {
                    updated = true;
                    return { ...item, paid: true, paidAt: now.toISOString() };
                }
            }
            return item;
        });

        if (updated) {
            const newData = { ...monthData, incomes: newIncomes };
            saveData(newData, currentYear, currentMonth);
        }
    }, [monthData]);

    // Ref for accessing latest data in closures/listeners
    const monthDataRef = useRef<MonthData | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    useEffect(() => { monthDataRef.current = monthData; }, [monthData]);

    // Load Initial Data
    useEffect(() => {
        loadData(currentYear, currentMonth);
        if (isConfigured && auth) {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setSyncStatus('online');
                    setupRealtimeListener(currentYear, currentMonth);
                } else {
                    signInAnonymously(auth).catch((e) => {
                        if (e.code === 'auth/admin-restricted-operation' || (e.message && e.message.includes('identity-toolkit-api-has-not-been-used')) || e.code === 'auth/network-request-failed') {
                            console.warn("Firebase Auth API offline or network unavailable. Running with local cache.");
                        } else {
                            console.warn("Auth Notice:", e.message || e);
                        }
                        setSyncStatus('offline');
                    });
                }
            });
        }

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    // Online and Offline event listeners for instant connectivity awareness
    useEffect(() => {
        const handleOnline = () => {
            setSyncStatus('syncing');
            if (monthDataRef.current) {
                saveData(monthDataRef.current, currentYear, currentMonth);
            }
            setupRealtimeListener(currentYear, currentMonth);
        };
        const handleOffline = () => {
            setSyncStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [currentYear, currentMonth]);

    // Force sync on visibility change (when opening app from background) to ensure instant updates
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log("App foregrounded, ensuring sync...");
                if (isConfigured && auth?.currentUser) {
                    setupRealtimeListener(currentYear, currentMonth);
                }
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [currentYear, currentMonth]);

    const ensureSystemIntegrity = (data: MonthData, year: number, month: number): MonthData => {
        if (!data) return generateMonthData(year, month);

        // Remove the non-existent 232.33 expense everywhere
        if (data.expenses) data.expenses = data.expenses.filter(e => e.amount !== 232.33);
        if (data.avulsosItems) data.avulsosItems = data.avulsosItems.filter(a => a.amount !== 232.33);

        // Initialize arrays and default objects
        data.incomes = (data.incomes || []).map(i => ({
            ...i,
            amount: Number(i.amount) || 0,
            paid: !!i.paid,
            skipped: !!i.skipped
        }));
        data.expenses = (data.expenses || []).map(e => ({
            ...e,
            amount: Number(e.amount) || 0,
            paid: !!e.paid,
            skipped: !!e.skipped
        }));
        data.avulsosItems = (data.avulsosItems || []).map(a => ({
            ...a,
            amount: Number(a.amount) || 0,
            paid: !!a.paid,
            skipped: !!a.skipped
        }));
        data.shoppingItems = data.shoppingItems || [];
        data.bankAccounts = data.bankAccounts || [];
        data.goals = data.goals || [];
        data.bankReserves = data.bankReserves || { santander: 0, inter: 0, sofisa: 0 };
        data.checkIn = data.checkIn || { isDone: false, date: null };
        data.debtSettlements = data.debtSettlements || [
            { id: 'set_nubank', description: 'Acordo Nubank (À Vista)', amount: 700, priority: 1, isPaid: false, notes: 'Pagamento via PIX' },
            { id: 'set_itau_marcelly', description: 'Acordo Itaú Marcelly (À Vista)', amount: 400, priority: 2, isPaid: false, notes: 'Pagamento via PIX' }
        ];
        data.dailyBalances = data.dailyBalances || [];

        // Purge specified removed items from the entire application root
        const isPurgedItem = (desc: string) => {
            const d = (desc || '').toUpperCase();
            return d.includes('POVIZTRA') || 
                   d.includes('VITAMINA B') || 
                   d.includes('VITAMINA D') || 
                   d.includes('CARTÃO DO INTER DO ANDRÉ') || 
                   d.includes('CARTAO DO INTER DO ANDRE') ||
                   (d.includes('INTER') && d.includes('ANDRÉ') && (d.includes('CARTÃO') || d.includes('CARTAO'))) ||
                   (d.includes('INTER') && d.includes('ANDRE') && (d.includes('CARTÃO') || d.includes('CARTAO')));
        };

        data.expenses = (data.expenses || []).filter(e => !isPurgedItem(e.description));
        data.avulsosItems = (data.avulsosItems || []).filter(a => !isPurgedItem(a.description));

        // PRESERVE ALL USER STATES: user toggles for 'paid', 'paidAt', 'skipped', 'isSuspended', 'suspendedUntil', 'userModifiedPaid'
        const preservedStateById = new Map<string, {
            paid: boolean;
            paidAt?: string | null;
            skipped?: boolean;
            isSuspended?: boolean;
            suspendedUntil?: string | null;
            userModifiedPaid?: boolean;
            amount?: number;
        }>();
        const preservedStateByGroupDesc = new Map<string, {
            paid: boolean;
            paidAt?: string | null;
            skipped?: boolean;
            isSuspended?: boolean;
            suspendedUntil?: string | null;
            userModifiedPaid?: boolean;
            amount?: number;
        }>();
        const preservedStateByDesc = new Map<string, {
            paid: boolean;
            paidAt?: string | null;
            skipped?: boolean;
            isSuspended?: boolean;
            suspendedUntil?: string | null;
            userModifiedPaid?: boolean;
            amount?: number;
        }>();

        const recordState = (item: Transaction) => {
            const state = {
                paid: item.paid,
                paidAt: item.paidAt,
                skipped: item.skipped,
                isSuspended: item.isSuspended,
                suspendedUntil: item.suspendedUntil,
                userModifiedPaid: item.userModifiedPaid,
                amount: item.amount
            };
            if (item.id) preservedStateById.set(item.id, state);
            const normDesc = (item.description || '').trim().toUpperCase();
            const normGroup = (item.group || '').trim().toUpperCase();
            if (normGroup && normDesc) {
                preservedStateByGroupDesc.set(`${normGroup}:::${normDesc}`, state);
            }
            if (normDesc) {
                preservedStateByDesc.set(normDesc, state);
            }
        };

        (data.expenses || []).forEach(recordState);
        (data.avulsosItems || []).forEach(recordState);
        (data.incomes || []).forEach(recordState);

        const getPreservedState = (t: Transaction) => {
            if (t.id && preservedStateById.has(t.id)) return preservedStateById.get(t.id);
            const normDesc = (t.description || '').trim().toUpperCase();
            const normGroup = (t.group || '').trim().toUpperCase();
            if (normGroup && normDesc && preservedStateByGroupDesc.has(`${normGroup}:::${normDesc}`)) {
                return preservedStateByGroupDesc.get(`${normGroup}:::${normDesc}`);
            }
            if (normDesc && preservedStateByDesc.has(normDesc)) {
                return preservedStateByDesc.get(normDesc);
            }
            return undefined;
        };

        const originalUserModifications = new Map();
        [...data.expenses, ...data.avulsosItems, ...data.incomes].forEach(item => {
            if (item.userModifiedPaid) {
                originalUserModifications.set(item.id, { paid: item.paid, paidAt: item.paidAt, userModifiedPaid: true });
            }
        });

        // Initialize debt settlements if missing
        if (!data.debtSettlements || data.debtSettlements.length === 0) {
            data.debtSettlements = [
                { id: 'set_nubank', description: 'Acordo Nubank (À Vista)', amount: 700, priority: 1, isPaid: false, notes: 'Pagamento via PIX' },
                { id: 'set_itau_marcelly', description: 'Acordo Itaú Marcelly (À Vista)', amount: 400, priority: 2, isPaid: false, notes: 'Pagamento via PIX' }
            ];
        }

        // Initialize daily physical balance tracker if missing
        if (!data.dailyBalances) {
            data.dailyBalances = [];
        }

        // Help user pre-populate requested days for May 2026 cycle
        if (year === 2026 && month === 5 && data.dailyBalances.length === 0) {
            data.dailyBalances = [
                { id: 'db_22_may', date: '2026-05-22', santander: 1250.00, inter: 100.00, sofisa: 4351.00, notes: 'Saldo palpável na data (Maio 22)' },
                { id: 'db_29_may', date: '2026-05-29', santander: 450.00, inter: 0.00, sofisa: 4351.00, notes: 'Modificações após pagamentos (Maio 29)' },
                { id: 'db_30_may', date: '2026-05-30', santander: 22.28, inter: 0.00, sofisa: 4351.00, notes: 'Hoje em conta: real e palpável' }
            ];
        }

        // Help user pre-populate requested days for June 2026 cycle
        if (year === 2026 && month === 6) {
            if (data.dailyBalances.length === 0) {
                data.dailyBalances = [
                    { id: 'db_01_june', date: '2026-06-01', santander: 1422.40, inter: 307.98, sofisa: 0.00, notes: 'Saldo atual em contas (Inter: poupança viagem, Sofisa: zerado)' }
                ];
            } else {
                data.dailyBalances = data.dailyBalances.map(db => {
                    if (db.id === 'db_01_june' || db.date === '2026-06-01') {
                        return {
                            ...db,
                            santander: 1422.40,
                            inter: 307.98,
                            sofisa: 0.00
                        };
                    }
                    return db;
                });
            }
        }

        // User request (May 2026 Cycle): Absolute corrections
        if (year === 2026 && month === 5) {
            // 1. DELETE SPECIFIC REMOVALS REQUESTED
            data.expenses = data.expenses.filter(e => {
                const desc = e.description.toUpperCase();
                return !desc.includes("VENENO") && 
                       !desc.includes("DÍVIDA NA RUA") && 
                       !desc.includes("DIVIDA NA RUA") && 
                       !desc.includes("EMPRÉSTIMO JADY") &&
                       !desc.includes("JADY - EMPRÉSTIMO") &&
                       !desc.includes("PAGAMENTO MÁRCIA BRITO") &&
                       !desc.includes("PAGAMENTO MARCIA BRITO") &&
                       !(desc.includes("EMPRÉSTIMO COM LILI") && e.amount === 800);
            });

            // 2. CONFIGURE LOANS AS REQUESTED (R$ 0 and specific installments)
            const ensureLoan = (desc: string, current: number, total: number, group: string) => {
                const existing = data.expenses.find(e => e.description.toUpperCase().includes(desc.toUpperCase()));
                if (existing) {
                    data.expenses = data.expenses.map(e => e.description.toUpperCase().includes(desc.toUpperCase()) 
                        ? { ...e, amount: 0, installments: { current, total }, paid: false, paidAt: null, group } : e);
                } else {
                    data.expenses.push({
                        id: `loan_${desc.replace(/\s/g,'')}`,
                        description: desc,
                        amount: 0,
                        category: "Empréstimos",
                        group: group,
                        paid: false,
                        dueDate: "2026-05-15",
                        installments: { current, total }
                    });
                }
            };
            ensureLoan("EMPRÉSTIMO COM MARCIA BISPO", 0, 4, "MARCIA BISPO");
            ensureLoan("EMPRÉSTIMO COM LILI", 2, 5, "LILI TORRES");

            // 3. MODIFY AND MOVE (Compras IAGO) - Removed as requested

            // 4. SPECIFIC UPDATES: Aluguel, Realized Payments, and Unpaid Items
            data.expenses = data.expenses.map(e => {
                const desc = e.description.toUpperCase();
                
                // Aluguel set to 1300 and Mark as Paid on May 4th
                if (desc === "ALUGUEL") {
                    return { ...e, amount: 1300.00, paid: true, paidAt: "2026-05-04T12:00:00Z" };
                }

                // Claros and Car Insurance to Unpaid (reset to ensure latest status)
                if ((desc.includes("CLARO") && !desc.includes("EMPRÉSTIMO")) || desc.includes("SEGURO DO CARRO")) {
                    // But if it was paid in Apr logic, keep it? No, user says "dar baixa no valor do aluguel"
                    // implies they are actively reporting May payments.
                    return { ...e, paid: false, paidAt: null, };
                }

                // Iago: Removed manual override for May as requested

                // Lili Torres Travel Installments: Sum is 1178.97 (paid on May 4th)
                if (desc.includes("ESTADIA") || desc.includes("PASSAGENS AÉREAS SP X JOBURG")) {
                    if (e.group === 'LILI TORRES') {
                        return { ...e, paid: true, paidAt: "2026-05-04T12:00:00Z" };
                    }
                }

                // Mark specific realized payments (Subtract from Santander logic)
                if (desc.includes("CARTÃO DO ITAÚ DA MARCELLY") || desc.includes("CARTAO DO ITAU DA MARCELLY")) {
                    return { ...e, amount: 168.00, paid: true, paidAt: "2026-04-28T12:00:00Z" };
                }
                if (desc.includes("CARTÃO DO ITAÚ DO ANDRÉ") || desc.includes("CARTAO DO ITAU DO ANDRE")) {
                    return { ...e, amount: 116.00, paid: true, paidAt: "2026-04-28T12:00:00Z" };
                }
                if (desc.includes("INTERNET DA CASA")) {
                    return { ...e, amount: 125.76, paid: true, paidAt: "2026-04-28T12:00:00Z" };
                }

                // New specific payments requested on April 28th
                const isPaid28 = desc.includes("GUARDA ROUPAS") || 
                                 desc.includes("REFORMA DO SOFÁ") || 
                                 desc.includes("FACULDADE DA MARCELLY") || 
                                 (desc.includes("PASSAGENS AÉREAS") && e.group !== 'MARCIA BRITO') || // Exclude Marcia Brito's passagens
                                 desc.includes("PASSAGENS DE ONIBUS") || 
                                 desc.includes("MALA DO ANDRÉ") || 
                                 desc.includes("RENEGOCIAR CARREFOUR");
                
                if (isPaid28) {
                    return { ...e, paid: true, paidAt: "2026-04-28T12:00:00Z" };
                }

                return e;
            });

            // 5. Marcia brito's specific custom overrides for May 2026:
            // "mao de obra do davi", "kr autopeças", "filhão autopeças", "cabesom", and "remédio" remain unpaid.
            // All other items for Márcia Brito are marked as paid.
            data.expenses = data.expenses.map(e => {
                if (e.group === 'MARCIA BRITO') {
                    const desc = e.description.toUpperCase();
                    const isUnpaidItem = desc.includes("MÃO DE OBRA") || 
                                         desc.includes("MAO DE OBRA") || 
                                         desc.includes("KR AUTO") || 
                                         desc.includes("FILHÃO AUTO") || 
                                         desc.includes("FILHAO AUTO") || 
                                         desc.includes("CABESOM") || 
                                         (desc.includes("REMÉDIO") && desc.includes("MARCIA"));
                    
                    if (isUnpaidItem) {
                        return { ...e, paid: false, paidAt: null, };
                    } else {
                        return { ...e, paid: true, paidAt: "2026-05-12T12:00:00Z" };
                    }
                }
                return e;
            });

            // Ensure Realized helper items exist
            const realizeItem = (desc: string, amount: number, group: string, cat: string) => {
                const existing = data.expenses.find(e => e.description.toUpperCase().includes(desc.toUpperCase()));
                if (existing) {
                    data.expenses = data.expenses.map(e => e.description.toUpperCase().includes(desc.toUpperCase()) ? { ...e, amount, paid: true, paidAt: "2026-04-30T12:00:00Z" } : e);
                } else {
                    data.expenses.push({
                        id: `real_${desc.replace(/\s/g,'')}`,
                        description: desc,
                        amount: amount,
                        category: cat,
                        group: group,
                        paid: true,
                        dueDate: "2026-04-30",
                        paidAt: "2026-04-30T12:00:00Z"
                    });
                }
            };
            realizeItem("PAGAMENTO DE PERFUME", 100.00, "DÍVIDAS", "Dívidas");
            
            // Set Avulsos specifically as paid for this cycle and ensure they exist
            const essentialAvulsos = [
                { id: `avulso_combustivel_may`, desc: "COMBUSTÍVEL (30/04)", amount: 50.00, cat: "Transporte", date: "2026-04-30" },
                { id: `avulso_mercado_may`, desc: "MERCADO (29/04)", amount: 187.28, cat: "Alimentação", date: "2026-04-29" },
                { id: `avulso_agua_may`, desc: "COMPRA DA ÁGUA (29/04)", amount: 10.00, cat: "Alimentação", date: "2026-04-29" }
            ];

            essentialAvulsos.forEach(ea => {
                const exists = data.avulsosItems.find(a => a.description.toUpperCase().includes(ea.desc.toUpperCase()));
                if (!exists) {
                    data.avulsosItems.push({
                        id: ea.id,
                        description: ea.desc,
                        amount: ea.amount,
                        category: ea.cat,
                        paid: true,
                        dueDate: ea.date,
                        date: ea.date,
                        paidAt: "2026-04-30T12:00:00Z"
                    });
                }
            });

            data.avulsosItems = data.avulsosItems.map(a => {
                const desc = a.description.toUpperCase();
                if (desc.includes("COMBUSTÍVEL") || desc.includes("ABASTECIMENTO") || desc.includes("MERCADO") || desc.includes("ÁGUA")) {
                    return { ...a, paid: true, paidAt: "2026-04-30T12:00:00Z" };
                }
                return a;
            });
        }

        // User request (June 2026 Cycle): Incomes updates
        if (year === 2026 && month === 6) {
            // Under June 2026, we have specific incomes instead of the template ones:
            // 1. Rescisão (Prefeitura de Maricá - André): 3179.98 on May 22nd
            // 2. Décimo Terceiro (Estado - André): 2433.89 on May 29th
            // 3. Salário de Maio (Estado - André): 2805.96 on May 30th
            // 4. Salário Normal (Marcelly): 3436.22 on May 22nd
            // All of these entered to pay June accounts.
            
            data.incomes = [
                {
                    id: 'inc_rescisao_andre_jun26',
                    description: 'RESCISÃO MARICÁ - ANDRÉ',
                    amount: 3179.98,
                    paid: true,
                    date: '2026-05-22',
                    dueDate: '2026-05-22',
                    category: 'Salário',
                    paidAt: '2026-05-22T12:00:00Z'
                },
                {
                    id: 'inc_m_2026_6',
                    description: 'SALARIO MARCELLY',
                    amount: 3436.22,
                    paid: true,
                    date: '2026-05-22',
                    dueDate: '2026-05-22',
                    category: 'Salário',
                    paidAt: '2026-05-22T12:00:00Z'
                },
                {
                    id: 'inc_13_estado_andre_jun26',
                    description: '13º SALÁRIO (ESTADO) - ANDRÉ',
                    amount: 2433.89,
                    paid: true,
                    date: '2026-05-29',
                    dueDate: '2026-05-29',
                    category: 'Salário',
                    paidAt: '2026-05-29T12:00:00Z'
                },
                {
                    id: 'inc_sal_estado_andre_jun26',
                    description: 'SALÁRIO MAIO (ESTADO) - ANDRÉ',
                    amount: 2805.96,
                    paid: true,
                    date: '2026-05-30',
                    dueDate: '2026-05-30',
                    category: 'Salário',
                    paidAt: '2026-05-30T12:00:00Z'
                },
                {
                    id: 'inc_mum_m_2026_6',
                    description: 'MUMBUCA MARCELLY',
                    amount: 598.00,
                    paid: false,
                    date: '2026-06-10',
                    dueDate: '2026-06-10',
                    category: 'Mumbuca'
                }
            ];
        }

        // User request starting June 2026 (June and forward)
        if (year === 2026 && month >= 6) {

            // André's salary changes to approximately 3334.00 starting July 2026 (month >= 7)
            if (month >= 7) {
                // If July 2026, customize dates and names explicitly as requested
                if (month === 7) {
                    data.incomes = data.incomes.map(i => {
                        const desc = i.description.toUpperCase();
                        if (desc === "SALARIO ANDRE" || desc === "SALÁRIO ANDRÉ" || desc === "SALÁRIO DO ANDRÉ" || desc === "SALARIO DO ANDRE" || desc.includes("SALÁRIO ANDRÉ") || desc.includes("SALARIO ANDRE")) {
                            return { 
                                ...i, 
                                description: "SALÁRIO ANDRÉ (Recebimento: 01/07 - Estado)",
                                amount: 3334.00,
                                date: "2026-07-01",
                                dueDate: "2026-07-01"
                            };
                        }
                        if (desc === "SALARIO MARCELLY" || desc === "SALÁRIO MARCELLY" || desc === "SALÁRIO DA MARCELLY" || desc === "SALARIO DA MARCELLY" || desc.includes("SALÁRIO MARCELLY") || desc.includes("SALARIO MARCELLY")) {
                            return {
                                ...i,
                                description: "SALÁRIO MARCELLY (Recebimento: 26/06)",
                                amount: 3436.22,
                                date: "2026-06-26",
                                dueDate: "2026-06-26"
                            };
                        }
                        if (desc.includes("1ª PARCELA 13º MARCELLY") || desc.includes("1A PARCELA 13O MARCELLY") || desc.includes("13º MARCELLY")) {
                            return {
                                ...i,
                                paid: true,
                                paidAt: "2026-06-26T12:00:00Z",
                                userModifiedPaid: true
                            };
                        }
                        return i;
                    });
                } else if (year === 2026 && month === 9) {
                    data.incomes = [
                        {
                            id: 'inc_taag_sep26',
                            description: 'INDENIZAÇÃO EMPRESA AÉREA TAAG (Recebido: 01/09)',
                            amount: 1492.76,
                            paid: true,
                            userModifiedPaid: true,
                            date: '2026-09-01',
                            dueDate: '2026-09-01',
                            category: 'Outros',
                            paidAt: '2026-09-01T12:00:00Z'
                        },
                        {
                            id: 'inc_a_2026_9',
                            description: 'SALÁRIO ANDRÉ (Recebido: 01/09)',
                            amount: 3219.07,
                            paid: true,
                            userModifiedPaid: true,
                            date: '2026-09-01',
                            dueDate: '2026-09-01',
                            category: 'Salário',
                            paidAt: '2026-09-01T12:00:00Z'
                        },
                        {
                            id: 'inc_m_2026_9',
                            description: 'SALÁRIO MARCELLY (Recebido: 28/08)',
                            amount: 3436.22,
                            paid: true,
                            userModifiedPaid: true,
                            date: '2026-08-28',
                            dueDate: '2026-08-28',
                            category: 'Salário',
                            paidAt: '2026-08-28T12:00:00Z'
                        },
                        {
                            id: 'inc_ferias_m_sep26',
                            description: 'FÉRIAS MARCELLY (Recebido: 28/08)',
                            amount: 1081.16,
                            paid: true,
                            userModifiedPaid: true,
                            date: '2026-08-28',
                            dueDate: '2026-08-28',
                            category: 'Salário',
                            paidAt: '2026-08-28T12:00:00Z'
                        },
                        {
                            id: 'inc_mum_m_2026_9',
                            description: 'MUMBUCA MARCELLY',
                            amount: 598.00,
                            paid: false,
                            date: '2026-09-10',
                            dueDate: '2026-09-10',
                            category: 'Mumbuca'
                        }
                    ];
                } else {
                    data.incomes = data.incomes.map(i => {
                        const desc = i.description.toUpperCase();
                        if (desc === "SALARIO ANDRE" || desc === "SALÁRIO ANDRÉ" || desc === "SALÁRIO DO ANDRÉ" || desc === "SALARIO DO ANDRE" || desc.includes("SALÁRIO ANDRÉ") || desc.includes("SALARIO ANDRE")) {
                            return { ...i, amount: ((year === 2026 && month >= 9) || year > 2026) ? 3219.07 : 3334.00 };
                        }
                        return i;
                    });
                }

                // André's 1st installment of 13º salary is removed for July 2026 (month === 7)
                if (month === 7) {
                    data.incomes = data.incomes.filter(i => {
                        const desc = i.description.toUpperCase();
                        return !desc.includes("1ª PARCELA 13º ANDRÉ") && !desc.includes("1A PARCELA 13O ANDRE") && !desc.includes("13º ANDRÉ") && i.id !== "inc_13_1_a_2026";
                    });

                    // Add Income Tax Refund for André and Marcelly in July 2026 (R$ 343.49 each)
                    const hasRefundAndre = data.incomes.some(i => i.id === "inc_ir_a_2026" || i.description.toUpperCase().includes("RESTITUIÇÃO IR ANDRÉ") || i.description.toUpperCase().includes("RESTITUICAO IR ANDRE"));
                    const hasRefundMarcelly = data.incomes.some(i => i.id === "inc_ir_m_2026" || i.description.toUpperCase().includes("RESTITUIÇÃO IR MARCELLY") || i.description.toUpperCase().includes("RESTITUICAO IR MARCELLY"));
                    
                    if (!hasRefundAndre) {
                        data.incomes.push({
                            id: "inc_ir_a_2026",
                            description: "RESTITUIÇÃO IR ANDRÉ",
                            amount: 343.49,
                            paid: false,
                            date: "2026-07-15",
                            dueDate: "2026-07-15",
                            category: "Outros"
                        });
                    }
                    if (!hasRefundMarcelly) {
                        data.incomes.push({
                            id: "inc_ir_m_2026",
                            description: "RESTITUIÇÃO IR MARCELLY",
                            amount: 343.49,
                            paid: false,
                            date: "2026-07-15",
                            dueDate: "2026-07-15",
                            category: "Outros"
                        });
                    }
                }
            }

            // Filter out Seguro do Carro for June 2026 specifically (paying late with July funds)
            if (month === 6) {
                data.expenses = data.expenses.filter(e => e.description.toUpperCase() !== "SEGURO DO CARRO");
            }

            // Cartão do Itaú da Marcelly set to 0.00 (zerado) for June 2026 explicitly, and preserved for next months
            if (month === 6) {
                data.expenses = data.expenses.map(e => {
                    const desc = e.description.toUpperCase();
                    if (desc === "CARTÃO DO ITAÚ DA MARCELLY" || desc === "CARTAO DO ITAU DA MARCELLY") {
                        return { ...e, amount: 0.00 };
                    }
                    return e;
                });
            }

            // Pausing "Empréstimo com Márcia Bispo" for June 2026, resuming July 2026 as installment 3/4
            if (month === 6) {
                data.expenses = data.expenses.filter(e => e.description.toUpperCase() !== "EMPRÉSTIMO COM MARCIA BISPO");
            } else if (month > 6) {
                // For July 2026 and later, ensure the installment is correctly shifted
                data.expenses = data.expenses.map(e => {
                    if (e.description.toUpperCase() === "EMPRÉSTIMO COM MARCIA BISPO") {
                        const installmentAmount = 100.00; // 400.00 / 4
                        // Calculate shifted installment info where July (month 7) starting with May (5) reference is installment 3
                        const diff = month - 5;
                        const current = diff + 1;
                        if (current >= 1 && current <= 4) {
                            return {
                                ...e,
                                amount: installmentAmount,
                                installments: { current, total: 4 }
                            };
                        }
                    }
                    return e;
                });
            }

            // Alinhamento do carro: parcela 1 starts in July, parcela 2 is in August. Force removing from June if present.
            if (month === 6) {
                data.expenses = data.expenses.filter(e => e.description.toUpperCase() !== "ALINHAMENTO DO CARRO");
            } else if (month === 7 || month === 8) {
                const currentInst = month === 7 ? 1 : 2;
                // Ensure it exists with correct installment
                const existingIndex = data.expenses.findIndex(e => e.description.toUpperCase() === "ALINHAMENTO DO CARRO");
                if (existingIndex === -1) {
                    data.expenses.push({
                        id: `fin_ALINHAMENTODOCARRO_${currentInst}`,
                        description: "ALINHAMENTO DO CARRO",
                        amount: 165.00, // 330.00 / 2
                        category: "Transporte",
                        paid: false,
                        dueDate: `2026-0${month}-12`,
                        installments: { current: currentInst, total: 2 },
                        group: 'MARCIA BRITO'
                    });
                } else {
                    data.expenses = data.expenses.map(e => {
                        if (e.description.toUpperCase() === "ALINHAMENTO DO CARRO") {
                            return {
                                ...e,
                                amount: 165.00,
                                installments: { current: currentInst, total: 2 }
                            };
                        }
                        return e;
                    });
                }
            }

            // Ensure Aluguel is 1300
            data.expenses = data.expenses.map(e => {
                const desc = e.description.toUpperCase();
                if (desc === "ALUGUEL") {
                    return { ...e, amount: 1300.00 };
                }
                return e;
            });

            // 2. Cartão do Itaú do André is 100 reais (but 200 in July 2026, 237.96 in Sept 2026, 500.00 in Oct 2026 and subsequent months)
            data.expenses = data.expenses.map(e => {
                const desc = e.description.toUpperCase();
                if (desc.includes("CARTÃO DO ITAÚ DO ANDRÉ") || desc.includes("CARTAO DO ITAU DO ANDRE")) {
                    let amt = 100.00;
                    if (year === 2026 && month === 7) amt = 200.00;
                    if (year === 2026 && month === 9) amt = 237.96;
                    if (year > 2026 || (year === 2026 && month >= 10)) amt = 500.00;
                    return { ...e, amount: amt };
                }
                if (desc.includes("CARTÃO DO ITAÚ DA MARCELLY") || desc.includes("CARTAO DO ITAU DA MARCELLY")) {
                    if (year > 2026 || (year === 2026 && month >= 10)) {
                        return { ...e, amount: 200.00 };
                    }
                }
                return e;
            });

            // 3. Delete "CONTA DA CLARO ANDRÉ" completely
            data.expenses = data.expenses.filter(e => {
                const desc = e.description.toUpperCase();
                return !(desc.includes("CLARO") && (desc.includes("ANDRÉ") || desc.includes("ANDRE")));
            });

            // 4. Delete "CONTA DA VIVO DO ANDRÉ" and "CONTA DA VIVO DA MARCELLY" completely starting June
            data.expenses = data.expenses.filter(e => {
                const desc = e.description.toUpperCase();
                const isVivoAndre = desc.includes("VIVO") && (desc.includes("ANDRÉ") || desc.includes("ANDRE"));
                const isVivoMarcelly = desc.includes("VIVO") && desc.includes("MARCELLY");
                return !(isVivoAndre || isVivoMarcelly);
            });

            // 5. Adjust "REMÉDIOS DO ANDRÉ" to 170.00 and mark as paid ONLY in June 2026. Filter generic out for September onwards.
            data.expenses = data.expenses.filter(e => {
                const desc = e.description.toUpperCase();
                if ((month >= 9 || year > 2026) && (desc === "REMÉDIOS DO ANDRÉ" || desc === "REMEDIOS DO ANDRE")) {
                    return false;
                }
                return true;
            }).map(e => {
                const desc = e.description.toUpperCase();
                if (desc === "REMÉDIOS DO ANDRÉ" || desc === "REMEDIOS DO ANDRE") {
                    if (month === 6) {
                        return { ...e, amount: 170.00, paid: true, paidAt: '2026-05-27' };
                    } else if (month >= 7 && month < 9) {
                        return { ...e, amount: 170.00, paid: false, paidAt: null };
                    }
                }
                return e;
            });

            // 6. Iago single transaction requested by user
            data.expenses = data.expenses.filter(e => {
                const isIago = e.category === 'Iago' || e.group === 'IAGO' || e.description.toUpperCase().includes('IAGO');
                if (isIago && e.description !== 'CARTÃO DO IAGO') {
                    return false;
                }
                return true;
            });
            data.avulsosItems = data.avulsosItems.filter(e => {
                const isIago = e.category === 'Iago' || e.group === 'IAGO' || e.description.toUpperCase().includes('IAGO');
                if (isIago && e.description !== 'CARTÃO DO IAGO') {
                    return false;
                }
                return true;
            });

            // Ensure our new CARTÃO DO IAGO is correctly there (if amount > 0)
            const targetIagoAmount = (year === 2026 && month === 7) ? 1204.00 : (year > 2026 || (year === 2026 && month >= 8) ? 0 : 1819.22);
            if (targetIagoAmount === 0) {
                data.expenses = data.expenses.filter(e => !(e.description.includes('CARTÃO DO IAGO') || e.description.includes('CARTAO DO IAGO')));
                data.avulsosItems = data.avulsosItems.filter(e => !(e.description.includes('CARTÃO DO IAGO') || e.description.includes('CARTAO DO IAGO')));
            } else {
                const hasCartaoIago = data.expenses.some(e => e.description === 'CARTÃO DO IAGO' || e.description.includes('NUBANK'));
                if (!hasCartaoIago) {
                    data.expenses.push({
                        id: `exp_cartao_iago_${year}_${month}`,
                        description: "CARTÃO DO IAGO (NUBANK)",
                        amount: targetIagoAmount,
                        category: "Iago",
                        paid: (year === 2026 && month === 7) ? true : false,
                        userModifiedPaid: (year === 2026 && month === 7) ? true : false,
                        dueDate: `${year}-${month.toString().padStart(2,'0')}-07`,
                        group: 'IAGO (CARTÃO NUBANK)'
                    });
                } else {
                    // Ensure it has the correct amount (in case user had a different amount saved locally)
                    data.expenses = data.expenses.map(e => {
                        if (e.description.includes('IAGO') && (e.description.includes('CARTAO') || e.description.includes('CARTÃO'))) {
                            let isPaid = e.paid;
                            let userMod = e.userModifiedPaid;
                            if (year === 2026 && month === 7) {
                                isPaid = true;
                                userMod = true;
                            }
                            return { ...e, description: "CARTÃO DO IAGO (NUBANK)", amount: targetIagoAmount, paid: isPaid, userModifiedPaid: userMod, dueDate: `${year}-${month.toString().padStart(2,'0')}-07`, group: 'IAGO (CARTÃO NUBANK)' };
                        }
                        return e;
                    });
                }
            }

            // Ensure EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO is correctly present for months 7, 8, 9, 10 in 2026
            if (year === 2026 && month === 6) {
                 data.expenses = data.expenses.filter(e => {
                     const d = e.description.toUpperCase();
                     return !(d.includes('EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO') || d.includes('EMPRESTIMO PARA PAGAR AS CONTAS DE JUNHO'));
                 });
            }
            if (year === 2026 && month >= 7 && month <= 10) {
                const currentInst = month - 6; // July is 1, Aug is 2, Sept is 3, Oct is 4
                const hasLoanContas = data.expenses.some(e => {
                    const d = e.description.toUpperCase();
                    return d.includes('EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO') || d.includes('EMPRESTIMO PARA PAGAR AS CONTAS DE JUNHO');
                });
                if (!hasLoanContas) {
                    data.expenses.push({
                        id: `fin_EMPRÉSTIMOPARAPAGARASCONTASDEJUNHO_${currentInst}`,
                        description: "EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO",
                        amount: 486.00, // 1944.00 / 4
                        category: "Empréstimos",
                        paid: month === 7, userModifiedPaid: month === 7,
                        dueDate: `2026-${month.toString().padStart(2,'0')}-20`,
                        installments: { current: currentInst, total: 4 },
                        group: 'MARCIA BRITO'
                    });
                } else {
                    // Update to ensure correct installment, amount, group, etc.
                    data.expenses = data.expenses.map(e => {
                        const d = e.description.toUpperCase();
                        if (d.includes('EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO') || d.includes('EMPRESTIMO PARA PAGAR AS CONTAS DE JUNHO')) {
                            return {
                                ...e,
                                amount: 486.00,
                                category: "Empréstimos",
                                dueDate: `2026-${month.toString().padStart(2,'0')}-20`,
                                installments: { current: currentInst, total: 4 },
                                paid: month === 7 ? true : e.paid, userModifiedPaid: month === 7 ? true : e.userModifiedPaid,
                                group: 'MARCIA BRITO'
                            };
                        }
                        return e;
                    });
                }
            }

            // Seguro do carro in July 2026 is skipped (congelado)
            if (year === 2026 && month === 7) {
                 data.expenses = data.expenses.map(e => {
                     if (e.description.toUpperCase() === "SEGURO DO CARRO") {
                         return { ...e, skipped: true };
                     }
                     return e;
                 });
            }

            // 7. Markings as Paid based on user request (LILI, ITAÚ DO ANDRÉ, MARCIA BRITO, CARTÃO DO IAGO)
            const markAsPaidLogic = (e: Transaction) => {
                const desc = e.description.toUpperCase();
                
                // Aluguel
                if (desc === 'ALUGUEL') {
                    return { ...e, paid: true, paidAt: e.paidAt || "2026-06-06T12:00:00Z" };
                }

                if (desc === 'INTERNET DA CASA') {
                    return { ...e, paid: true, paidAt: e.paidAt || "2026-06-06T12:00:00Z" };
                }

                // Itaú do André
                if (desc.includes('CARTÃO DO ITAÚ DO ANDRÉ') || desc.includes('CARTAO DO ITAU DO ANDRE')) {
                    return { ...e, paid: true, paidAt: e.paidAt || "2026-06-06T12:00:00Z" };
                }

                // Todas as contas com LILI
                if (e.group === 'LILI TORRES' || desc.includes('LILI')) {
                    return { ...e, paid: true, paidAt: e.paidAt || "2026-06-06T12:00:00Z" };
                }

                // Cartão do Iago
                if (desc.includes('CARTÃO DO IAGO') || desc.includes('CARTAO DO IAGO') || desc.includes('IAGO (CARTÃO NUBANK)')) {
                    return { ...e, paid: true, paidAt: e.paidAt || "2026-06-06T12:00:00Z" };
                }

                // Marcia Brito (exceto Alinhamento do carro, exceto Marcia Bispo, exceto empréstimo contas de junho)
                const isMarciaBrito = e.group === 'MARCIA BRITO' || (desc.includes('MARCIA') && !desc.includes('BISPO') && e.group !== 'MARCIA BISPO');
                if (isMarciaBrito && desc !== 'ALINHAMENTO DO CARRO' && !desc.includes('EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO') && !desc.includes('EMPRESTIMO PARA PAGAR AS CONTAS DE JUNHO')) {
                    return { ...e, paid: true, paidAt: e.paidAt || "2026-06-06T12:00:00Z" };
                }

                return e;
            };

            if (month === 6) {
                data.expenses = data.expenses.map(markAsPaidLogic);
                data.avulsosItems = data.avulsosItems.map(markAsPaidLogic);
            }

            // 8. Incomes for December 2026 (Salaries + 13th Salary)
            if (year === 2026 && month === 12) {
                // Ensure normal salaries are correct for December
                const hasSalAndre = data.incomes.some(i => i.id === "inc_a_2026_12" || i.description.toUpperCase().includes("SALÁRIO ANDRÉ") || i.description.toUpperCase().includes("SALARIO ANDRE"));
                const hasSalMarcelly = data.incomes.some(i => i.id === "inc_m_2026_12" || i.description.toUpperCase().includes("SALÁRIO MARCELLY") || i.description.toUpperCase().includes("SALARIO MARCELLY"));

                if (!hasSalAndre) {
                    data.incomes.push({
                        id: "inc_a_2026_12",
                        description: "SALÁRIO ANDRÉ (Recebido: 01/12)",
                        amount: 3219.07,
                        paid: true,
                        date: "2026-12-01",
                        dueDate: "2026-12-01",
                        category: "Salário"
                    });
                } else {
                    data.incomes = data.incomes.map(i => (i.description.toUpperCase().includes("SALÁRIO ANDRÉ") || i.description.toUpperCase().includes("SALARIO ANDRE")) ? { ...i, amount: 3219.07 } : i);
                }

                if (!hasSalMarcelly) {
                    data.incomes.push({
                        id: "inc_m_2026_12",
                        description: "SALÁRIO MARCELLY (Recebido: 27/11)",
                        amount: 3436.22,
                        paid: true,
                        date: "2026-11-27",
                        dueDate: "2026-11-27",
                        category: "Salário"
                    });
                }

                // Remove any existing 13th salary entries to avoid duplication
                data.incomes = data.incomes.filter(i => {
                    const desc = i.description.toUpperCase();
                    return !desc.includes("13º") && !desc.includes("13O") && !desc.includes("DÉCIMO TERCEIRO") && !desc.includes("DECIMO TERCEIRO");
                });

                // Marcelly: Full salary (received normal salaries)
                data.incomes.push({
                    id: "inc_13_m_2026",
                    description: "13º SALÁRIO - MARCELLY",
                    amount: 3436.22,
                    paid: false,
                    date: "2026-12-20",
                    dueDate: "2026-12-20",
                    category: "13º Salário"
                });

                // Andre: 7/12 (started in June: Jun, Jul, Aug, Sep, Oct, Nov, Dec)
                // (3219.07 / 12) * 7 = 1877.79
                data.incomes.push({
                    id: "inc_13_a_2026",
                    description: "13º SALÁRIO - ANDRÉ (7/12)",
                    amount: 1877.79,
                    paid: false,
                    date: "2026-12-20",
                    dueDate: "2026-12-20",
                    category: "13º Salário"
                });
            }
        }

        // New installment expenses for Iago starting in August 2026
        let iagoNewInst = 0;
        if (year === 2026 && month >= 8 && month <= 12) {
            iagoNewInst = month - 7; // Aug = 1, Sept = 2, Oct = 3, Nov = 4, Dec = 5
        } else if (year === 2027 && month === 1) {
            iagoNewInst = 6;
        }

        if ((year === 2026 && month >= 8) || (year === 2027 && month === 1)) {
            const addOrUpdateIagoExpense = (description: string, amount: number, idSuffix: string, installments: any, category: string = "Lazer", matchPattern?: string, purchaseDate?: string) => {
                const searchPattern = (matchPattern || description).toUpperCase();
                const index = data.expenses.findIndex(e => e.description.toUpperCase().includes(searchPattern));
                const fullName = description.replace(' (IAGO)', '');
                if (index < 0) {
                    data.expenses.push({
                        id: `exp_${idSuffix}_iago_${year}_${month}`,
                        description: fullName,
                        amount: amount,
                        category: category,
                        paid: false,
                        dueDate: `${year}-${month.toString().padStart(2,'0')}-07`,
                        purchaseDate: purchaseDate,
                        installments: installments,
                        group: 'IAGO (CARTÃO NUBANK)'
                    });
                } else {
                    data.expenses[index] = {
                        ...data.expenses[index],
                        description: fullName,
                        amount: amount,
                        category: category,
                        installments: installments,
                        dueDate: `${year}-${month.toString().padStart(2,'0')}-07`,
                        purchaseDate: purchaseDate || data.expenses[index].purchaseDate,
                        group: 'IAGO (CARTÃO NUBANK)'
                    };
                }
            };

            if (year === 2026 && month === 8) {
                addOrUpdateIagoExpense("AUTO POSTO", 300.84, "auto_posto", null, "Transporte", "AUTO POSTO");
                addOrUpdateIagoExpense("JUL AIRBNB", 190.75, "airbnb", null, "Estadias", "JUL AIRBNB");
                addOrUpdateIagoExpense("CLARO FLEX MARCELLY", 44.80, "claro_flex_marcelly", null, "Moradia", "CLARO FLEX MARCELLY");
                addOrUpdateIagoExpense("CLARO FLEX ANDRÉ", 59.90, "claro_flex_andre", null, "Moradia", "CLARO FLEX ANDRÉ");
            }

            if (year === 2026 && month === 9) {
                addOrUpdateIagoExpense("CLAROFLEX ANDRÉ", 59.90, "claroflex_andre", null, "Moradia", "CLAROFLEX ANDR");
                addOrUpdateIagoExpense("CLAROFLEX MARCELLY", 44.90, "claroflex_marcelly", null, "Moradia", "CLAROFLEX MARCELLY");
                addOrUpdateIagoExpense("ABASTECIMENTO 1", 275.00, "abastecimento_1", null, "Transporte", "ABASTECIMENTO 1");
                addOrUpdateIagoExpense("ABASTECIMENTO 2", 150.00, "abastecimento_2", null, "Transporte", "ABASTECIMENTO 2");
                addOrUpdateIagoExpense("PASSAGENS PARA SALVADOR", 216.94, "passagens_salvador", { current: 2, total: 6 }, "Viagens", "PASSAGENS PARA SALVADOR");
                addOrUpdateIagoExpense("PRIMEIRO CARRO ALUGADO", 63.17, "primeiro_carro", { current: 2, total: 6 }, "Iago", "PRIMEIRO CARRO");
                addOrUpdateIagoExpense("SEGUNDO CARRO ALUGADO", 78.57, "segundo_carro", { current: 2, total: 6 }, "Iago", "SEGUNDO CARRO");
                addOrUpdateIagoExpense("AIRBNB (HMT3Q9TBYB)", 190.74, "airbnb_hmt3q9tbyb", { current: 2, total: 6 }, "Estadias", "HMT3Q9TBYB");
                addOrUpdateIagoExpense("AIRBNB (hmjhtc29yf)", 69.64, "airbnb_hmjhtc29yf", { current: 2, total: 6 }, "Estadias", "HMJHTC29YF");
                addOrUpdateIagoExpense("AIRBNB (hm2ydd2j9t)", 52.17, "airbnb_hm2ydd2j9t", { current: 2, total: 6 }, "Estadias", "HM2YDD2J9T");
                addOrUpdateIagoExpense("AIRBNB (hmepqps338)", 63.33, "airbnb_hmepqps338", { current: 2, total: 6 }, "Estadias", "HMEPQPS338");
                addOrUpdateIagoExpense("AIRBNB (hm5kaqjy4j)", 27.17, "airbnb_hm5kaqjy4j", { current: 2, total: 6 }, "Estadias", "HM5KAQJY4J");
                addOrUpdateIagoExpense("EMPRÉSTIMO PARA VIAJAR", 416.66, "emprestimo_viajar", { current: 2, total: 6 }, "Iago", "EMPRÉSTIMO PARA VIAJAR");
            }

            // October 2026 to February 2027: User screenshot items
            if ((year === 2026 && month >= 10) || (year === 2027 && month <= 2)) {
                const targetInst8 = (year - 2026) * 12 + month - 8 + 1; // 10 -> 3, 11 -> 4, 12 -> 5, 1 -> 6

                if (targetInst8 >= 1 && targetInst8 <= 6) {
                    addOrUpdateIagoExpense("AIRBNB (HMT3Q9TBYB)", 190.74, "airbnb_hmt3q9tbyb", { current: targetInst8, total: 6 }, "Estadias", "HMT3Q9TBYB");
                    addOrUpdateIagoExpense("AIRBNB (hm2ydd2j9t)", 52.17, "airbnb_hm2ydd2j9t", { current: targetInst8, total: 6 }, "Estadias", "HM2YDD2J9T");
                    addOrUpdateIagoExpense("AIRBNB (hmepqps338)", 63.33, "airbnb_hmepqps338", { current: targetInst8, total: 6 }, "Estadias", "HMEPQPS338");
                    addOrUpdateIagoExpense("AIRBNB (hm5kaqjy4j)", 27.17, "airbnb_hm5kaqjy4j", { current: targetInst8, total: 6 }, "Estadias", "HM5KAQJY4J");
                    addOrUpdateIagoExpense("AIRBNB (hmjhtc29yf)", 69.64, "airbnb_hmjhtc29yf", { current: targetInst8, total: 6 }, "Estadias", "HMJHTC29YF");
                    addOrUpdateIagoExpense("PRIMEIRO CARRO ALUGADO", 63.17, "primeiro_carro", { current: targetInst8, total: 6 }, "Iago", "PRIMEIRO CARRO");
                    addOrUpdateIagoExpense("SEGUNDO CARRO ALUGADO", 78.57, "segundo_carro", { current: targetInst8, total: 6 }, "Iago", "SEGUNDO CARRO");
                    addOrUpdateIagoExpense("PASSAGENS PARA SALVADOR", 216.94, "passagens_salvador", { current: targetInst8, total: 6 }, "Viagens", "PASSAGENS PARA SALVADOR");
                    addOrUpdateIagoExpense("EMPRÉSTIMO PARA VIAJAR", 416.66, "emprestimo_viajar", { current: targetInst8, total: 6 }, "Iago", "EMPRÉSTIMO PARA VIAJAR");
                }
                addOrUpdateIagoExpense("CLAROFLEX ANDRÉ", 59.90, "claroflex_andre", null, "Moradia", "CLAROFLEX ANDR");
                addOrUpdateIagoExpense("CLAROFLEX MARCELLY", 44.90, "claroflex_marcelly", null, "Moradia", "CLAROFLEX MARCELLY");

                if (year === 2026 && month === 10) {
                    addOrUpdateIagoExpense("CONSERTO DO CELULAR", 110.00, "conserto_celular", { current: 1, total: 2 }, "Iago", "CONSERTO DO CELULAR");
                    addOrUpdateIagoExpense("ABASTECIMENTO (19/09)", 307.46, "abastecimento_1909", null, "Iago", "ABASTECIMENTO (19/09)", "2026-09-19");
                    addOrUpdateIagoExpense("ABASTECIMENTO (29/09)", 342.24, "abastecimento_2909", null, "Iago", "ABASTECIMENTO (29/09)", "2026-09-29");
                    addOrUpdateIagoExpense("CANETA EMAGRECEDORA (DROGARAIA)", 490.00, "caneta_emagrecedora", null, "Iago", "CANETA EMAGRECEDORA", "2026-09-29");
                } else if (year === 2026 && month === 11) {
                    addOrUpdateIagoExpense("CONSERTO DO CELULAR", 110.00, "conserto_celular", { current: 2, total: 2 }, "Iago", "CONSERTO DO CELULAR");
                }
            }
            
            // Cleanup old variables and requested removals
            data.expenses = data.expenses.filter(e => {
                const d = e.description.toUpperCase();
                
                return !(d.includes("ESTADIA EM SALVADOR") && !d.includes("AIRBNB")) && 
                       !(d.includes("PRIMEIRA ESTADIA EM SALVADOR") && !d.includes("AIRBNB")) &&
                       !(d.includes("SEGUNDA ESTADIA EM SALVADOR") && !d.includes("AIRBNB")) &&
                       !(d.includes("COMPRA (697+697)")) &&
                       !(d === "PASSAGENS AÉREAS" || d === "PASSAGENS AEREAS" || d.includes("PASSAGENS AÉREAS (IAGO)") || d.includes("PASSAGENS AEREAS (IAGO)")) &&
                       !(d.includes("GOL LINHAS")) &&
                       !(d.includes("02 JUL GOL LINHAS")) &&
                       !(d.includes("ALUGUEL DO CARRO")) &&
                       !(d.includes("ALUGUEL CARRO")) &&
                       !(d.includes("RENT CARS")) &&
                       !(d.includes("EMPRESTIMO NO CARTAO") || d.includes("EMPRÉSTIMO NO CARTÃO")) &&
                       !(d.includes("ESTADIA DE MARAGOGI")) &&
                       !(d.includes("ESTADIA EM ARACAJU")) &&
                       !(d.includes("MULTISELO")) &&
                       !(d === "CLARO FLEX (IAGO)" || d === "CLARO FLEX");
            });
        }

        // Apply preserved user states
        const applyPreserved = (t: Transaction) => {
            const desc = t.description.toUpperCase();
            const isMarciaBrito = t.group === 'MARCIA BRITO' || (desc.includes('MARCIA') && !desc.includes('BISPO') && t.group !== 'MARCIA BISPO');
            const isLili = t.group === 'LILI TORRES' || desc.includes('LILI');
            const isItauAndre = desc.includes('CARTÃO DO ITAÚ DO ANDRÉ') || desc.includes('CARTAO DO ITAU DO ANDRE');
            const isAluguel = desc === 'ALUGUEL';
            const isInternetCasa = desc === 'INTERNET DA CASA';
            const isIagoCard = desc === 'CARTÃO DO IAGO' || desc === 'CARTAO DO IAGO';
            const isLoanContasJunho = desc.includes('EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO') || desc.includes('EMPRESTIMO PARA PAGAR AS CONTAS DE JUNHO');

            if (year === 2026 && month === 6 && 
               (((isMarciaBrito && desc !== 'ALINHAMENTO DO CARRO' && !isLoanContasJunho)) || isLili || isItauAndre || isAluguel || isInternetCasa || isIagoCard)) {
                return t; // Keep the programmatic override for these accounts only in June 2026
            }
            
            const orig = originalUserModifications.get(t.id);
            if (orig) {
                return { ...t, paid: orig.paid, paidAt: orig.paidAt, userModifiedPaid: true };
            }
            return t;
        };

        data.expenses = data.expenses.map(applyPreserved);
        data.avulsosItems = data.avulsosItems.map(applyPreserved);
        data.incomes = data.incomes.map(applyPreserved);

        // For July 2026 and subsequent months, ensure all debts (expenses and avulsos) are unmarked/unpaid by default
        if ((year === 2026 && month >= 7) || year > 2026) {
            data.expenses = data.expenses.map(e => {
                if (e.userModifiedPaid) return e;
                return { ...e, paid: false, paidAt: null, };
            });
            data.avulsosItems = data.avulsosItems.map(a => {
                if (a.userModifiedPaid) return a;
                return { ...a, paid: false, paidAt: null, };
            });
        }

        // Explicit updates for September 2026 as requested by user
        if (year === 2026 && month === 9) {
            data.expenses = data.expenses.filter(e => {
                const desc = e.description.toUpperCase();
                if (desc.includes('APPAI DA MARCELLY') || desc.includes('CELULAR DA MARCELLY')) {
                    return false;
                }
                return true;
            }).map(e => {
                const desc = e.description.toUpperCase();
                if (desc === 'ALUGUEL') {
                    return {
                        ...e,
                        dueDate: '2026-09-01'
                    };
                }
                if (desc.includes('INTERNET DA CASA') || desc === 'INTERNET') {
                    return {
                        ...e,
                        amount: 125.89
                    };
                }
                if (desc.includes('PSICÓLOGA') || desc.includes('PSICOLOGA')) {
                    return {
                        ...e,
                        amount: 350.00
                    };
                }
                if (desc.includes('CARTÃO DO ITAÚ DO ANDRÉ') || desc.includes('CARTAO DO ITAU DO ANDRE')) {
                    return {
                        ...e,
                        amount: 237.96
                    };
                }
                if (desc.includes('CARTÃO DO ITAÚ DA MARCELLY') || desc.includes('CARTAO DO ITAU DA MARCELLY')) {
                    return {
                        ...e,
                        amount: 198.34
                    };
                }
                return e;
            });

            // Ensure July loan of 500 for Marcia Bispo in September
            const hasJulyLoan = data.expenses.some(e => e.description.toUpperCase().includes('EMPRÉSTIMO COM MARCIA BISPO (JULHO)') || e.description.toUpperCase().includes('EMPRÉSTIMO DE JULHO'));
            if (!hasJulyLoan) {
                data.expenses.push({
                    id: 'loan_mb_july_sep26',
                    description: 'EMPRÉSTIMO DE JULHO (MARCIA BISPO)',
                    amount: 500.00,
                    category: 'Empréstimos',
                    paid: false,
                    dueDate: '2026-09-01',
                    group: 'MARCIA BISPO'
                });
            }

            // Marcia Brito installment counts and items for September 2026
            const mbOverrides: Array<{ match: (d: string) => boolean; desc: string; current: number; total: number; amount: number; cat: string }> = [
                { match: d => d.includes('APPAI DO ANDRÉ') || d.includes('APPAI DO ANDRE') || (d.includes('APPAI') && d.includes('ANDRÉ')), desc: 'APPAI DO ANDRÉ', current: 9, total: 12, amount: 129.50, cat: 'Saúde' },
                { match: d => d.includes('INTERMÉDICA DO ANDRÉ') || d.includes('INTERMEDICA DO ANDRE') || (d.includes('INTERMÉDICA') && d.includes('ANDRÉ')), desc: 'INTERMÉDICA DO ANDRÉ', current: 9, total: 12, amount: 123.00, cat: 'Saúde' },
                { match: d => d.includes('DENTISTA'), desc: 'DENTISTA', current: 1, total: 3, amount: 250.00, cat: 'Saúde' },
                { match: d => d.includes('EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO') || d.includes('EMPRESTIMO PARA PAGAR AS CONTAS DE JUNHO'), desc: 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO', current: 3, total: 4, amount: 486.00, cat: 'Empréstimos' },
                { match: d => d.includes('FACULDADE DA MARCELLY') || d.includes('FACULDADE'), desc: 'FACULDADE DA MARCELLY', current: 9, total: 10, amount: 202.68, cat: 'Educação' },
                { match: d => d.includes('KR AUTOPEÇAS') || d.includes('KR AUTOPECAS'), desc: 'KR AUTOPEÇAS', current: 4, total: 7, amount: 41.57, cat: 'Transporte' },
                { match: d => d.includes('RENEGOCIAR CARREFOUR') || d.includes('CARREFOUR'), desc: 'RENEGOCIAR CARREFOUR', current: 9, total: 16, amount: 312.50, cat: 'Dívidas' },
                { match: d => d.includes('REFORMA DO SOFÁ') || d.includes('REFORMA DO SOFA') || d.includes('SOFÁ DE CAXIAS') || d.includes('SOFA DE CAXIAS'), desc: 'REFORMA DO SOFÁ DE CAXIAS', current: 5, total: 5, amount: 115.00, cat: 'Moradia' },
                { match: d => d.includes('ALINHAMENTO DO CARRO') || d.includes('ALINHAMENTO'), desc: 'ALINHAMENTO DO CARRO', current: 1, total: 2, amount: 165.00, cat: 'Transporte' }
            ];

            mbOverrides.forEach(item => {
                const index = data.expenses.findIndex(e => item.match(e.description.toUpperCase()));
                if (index >= 0) {
                    data.expenses[index] = {
                        ...data.expenses[index],
                        description: item.desc,
                        amount: item.amount,
                        category: item.cat,
                        installments: { current: item.current, total: item.total },
                        group: 'MARCIA BRITO'
                    };
                } else {
                    data.expenses.push({
                        id: `fin_${item.desc.replace(/[^A-Z0-9]/gi, '')}_sep26`,
                        description: item.desc,
                        amount: item.amount,
                        category: item.cat,
                        paid: false,
                        dueDate: '2026-09-12',
                        installments: { current: item.current, total: item.total },
                        group: 'MARCIA BRITO'
                    });
                }
            });

            // Lili Torres items for September 2026
            const liliOverrides: Array<{ match: (d: string) => boolean; desc: string; current: number; total: number; amount: number; cat: string }> = [
                { match: d => d.includes('EMPRÉSTIMO COM LILI') || d.includes('EMPRESTIMO COM LILI'), desc: 'EMPRÉSTIMO COM LILI', current: 3, total: 5, amount: 800.00, cat: 'Empréstimos' },
                { match: d => d.includes('SHEIN'), desc: 'COMPRA NA SHEIN (LILI)', current: 2, total: 3, amount: 94.07, cat: 'Roupas' },
                { match: d => d.includes('BRISA'), desc: 'COMPRA NA BRISA (LILI)', current: 2, total: 3, amount: 86.67, cat: 'Roupas' },
                { match: d => d.includes('DALUZ'), desc: 'COMPRA NA DALUZ (LILI)', current: 2, total: 3, amount: 56.00, cat: 'Roupas' },
                { match: d => d.includes('NORDESTE') || (d.includes('VIAGEM') && d.includes('LILI')), desc: 'EMPRÉSTIMO VIAGEM NORDESTE (LILI)', current: 2, total: 6, amount: 335.90, cat: 'Empréstimos' },
                { match: d => d.includes('PRESENTE DO ANDRÉ') || d.includes('PRESENTE DO ANDRE') || (d.includes('PRESENTE') && d.includes('LILI')), desc: 'PRESENTE DO ANDRÉ (LILI)', current: 1, total: 3, amount: 119.97, cat: 'Outros' }
            ];

            liliOverrides.forEach(item => {
                const index = data.expenses.findIndex(e => item.match(e.description.toUpperCase()) && (e.group === 'LILI TORRES' || !e.group));
                if (index >= 0) {
                    data.expenses[index] = {
                        ...data.expenses[index],
                        description: item.desc,
                        amount: item.amount,
                        category: item.cat,
                        installments: { current: item.current, total: item.total },
                        group: 'LILI TORRES'
                    };
                } else {
                    data.expenses.push({
                        id: `fin_${item.desc.replace(/[^A-Z0-9]/gi, '')}_sep26`,
                        description: item.desc,
                        amount: item.amount,
                        category: item.cat,
                        paid: false,
                        dueDate: '2026-09-04',
                        installments: { current: item.current, total: item.total },
                        group: 'LILI TORRES'
                    });
                }
            });

            // André separated medicine expenses for September 2026
            const remediosAndresList = [
                { desc: 'REMÉDIO DO ANDRÉ (TEA/TDAH)', amount: 250.00, due: '2026-09-10' }
            ];
            remediosAndresList.forEach(item => {
                const index = data.expenses.findIndex(e => e.description.toUpperCase() === item.desc);
                if (index >= 0) {
                    data.expenses[index] = {
                        ...data.expenses[index],
                        amount: item.amount,
                        category: 'Saúde',
                        group: 'MORADIA'
                    };
                } else {
                    data.expenses.push({
                        id: `remed_andre_${item.desc.replace(/[^A-Z0-9]/gi, '')}_sep26`,
                        description: item.desc,
                        amount: item.amount,
                        category: 'Saúde',
                        paid: false,
                        dueDate: item.due,
                        group: 'MORADIA'
                    });
                }
            });

            // Marcia Brito items for September 2026
            const mbPedreiroIdx = data.expenses.findIndex(e => 
                e.description.toUpperCase().includes('PEDREIRO') && 
                (e.group === 'MARCIA BRITO' || !e.group)
            );
            if (mbPedreiroIdx >= 0) {
                data.expenses[mbPedreiroIdx] = {
                    ...data.expenses[mbPedreiroIdx],
                    description: 'DIÁRIA DE PEDREIRO',
                    amount: 160.00,
                    category: 'Moradia',
                    dueDate: '2026-09-12',
                    installments: { current: 1, total: 1 },
                    group: 'MARCIA BRITO'
                };
            } else {
                data.expenses.push({
                    id: 'fin_diaria_pedreiro_sep26',
                    description: 'DIÁRIA DE PEDREIRO',
                    amount: 160.00,
                    category: 'Moradia',
                    paid: false,
                    dueDate: '2026-09-12',
                    installments: { current: 1, total: 1 },
                    group: 'MARCIA BRITO'
                });
            }

            // Moradia items for September 2026
            const seguradoraIdx = data.expenses.findIndex(e => 
                (e.description.toUpperCase().includes('ADESÃO DA SEGURADORA') || e.description.toUpperCase().includes('SEGURADORA')) && 
                (e.group === 'MORADIA' || !e.group)
            );
            if (seguradoraIdx >= 0) {
                data.expenses[seguradoraIdx] = {
                    ...data.expenses[seguradoraIdx],
                    description: 'ADESÃO DA SEGURADORA',
                    amount: 100.00,
                    category: 'Moradia',
                    dueDate: '2026-09-05',
                    installments: { current: 1, total: 1 },
                    group: 'MORADIA'
                };
            } else {
                data.expenses.push({
                    id: 'fin_adesao_seguradora_sep26',
                    description: 'ADESÃO DA SEGURADORA',
                    amount: 100.00,
                    category: 'Moradia',
                    paid: false,
                    dueDate: '2026-09-05',
                    installments: { current: 1, total: 1 },
                    group: 'MORADIA'
                });
            }

            // Rebecca Brito items for September 2026 (Parcela 22 e Parcela 23)
            data.expenses = data.expenses.filter(e => !e.description.toUpperCase().includes('CIDADANIA'));
            data.expenses.push({
                id: 'fin_cidadania_22_sep26',
                description: 'CIDADANIA PORTUGUESA',
                amount: 140.00,
                category: 'Dívidas',
                paid: false,
                dueDate: '2026-09-12',
                installments: { current: 22, total: 37 },
                group: 'REBECCA BRITO'
            });
            data.expenses.push({
                id: 'fin_cidadania_23_sep26',
                description: 'CIDADANIA PORTUGUESA',
                amount: 140.00,
                category: 'Dívidas',
                paid: false,
                dueDate: '2026-09-12',
                installments: { current: 23, total: 37 },
                group: 'REBECCA BRITO'
            });

            // Ensure September 2026 avulsos are present
            INITIAL_SEPTEMBER_AVULSO_TRANSACTIONS.forEach(item => {
                if (!data.avulsosItems.some(a => a.id === item.id || a.description.toLowerCase() === item.description.toLowerCase() && a.amount === item.amount)) {
                    data.avulsosItems.push({ ...item });
                }
            });

            // Iago Cartão Nubank items for September 2026 (all with exact decimal cents)
            const iagoOverridesSept2026 = [
                { match: (d: string) => d.includes('ABASTECIMENTO 1'), desc: 'ABASTECIMENTO 1', amount: 275.00, cat: 'Transporte', day: 7, inst: null },
                { match: (d: string) => d.includes('ABASTECIMENTO 2'), desc: 'ABASTECIMENTO 2', amount: 150.00, cat: 'Transporte', day: 7, inst: null },
                { match: (d: string) => d.includes('ACRÉSCIMO PASSAGEM') || d.includes('ACRESCIMO PASSAGEM'), desc: 'ACRÉSCIMO PASSAGEM AÉREA', amount: 120.00, cat: 'Iago', day: 7, inst: { current: 2, total: 2 } },
                { match: (d: string) => d.includes('HMT3Q9TBYB'), desc: 'AIRBNB (HMT3Q9TBYB)', amount: 190.74, cat: 'Estadias', day: 7, inst: { current: 2, total: 6 } },
                { match: (d: string) => d.includes('HM2YDD2J9T') || (d.includes('AIRBNB') && d.includes('ARACAJU')), desc: 'AIRBNB (hm2ydd2j9t)', amount: 52.17, cat: 'Estadias', day: 7, inst: { current: 2, total: 6 } },
                { match: (d: string) => d.includes('HMEPQPS338'), desc: 'AIRBNB (hmepqps338)', amount: 63.33, cat: 'Estadias', day: 7, inst: { current: 2, total: 6 } },
                { match: (d: string) => d.includes('HM5KAQJY4J'), desc: 'AIRBNB (hm5kaqjy4j)', amount: 27.17, cat: 'Estadias', day: 7, inst: { current: 2, total: 6 } },
                { match: (d: string) => d.includes('HMJHTC29YF') || (d.includes('AIRBNB') && d.includes('SALVADOR')), desc: 'AIRBNB (hmjhtc29yf)', amount: 69.64, cat: 'Estadias', day: 7, inst: { current: 2, total: 6 } },
                { match: (d: string) => d === 'CLAROFLEX ANDRÉ' || d === 'CLAROFLEX ANDRE' || d.includes('CLAROFLEX ANDRÉ'), desc: 'CLAROFLEX ANDRÉ', amount: 59.90, cat: 'Moradia', day: 7, inst: null },
                { match: (d: string) => d === 'CLAROFLEX MARCELLY' || d.includes('CLAROFLEX MARCELLY'), desc: 'CLAROFLEX MARCELLY', amount: 44.90, cat: 'Moradia', day: 7, inst: null },
                { match: (d: string) => d.includes('COMPRAS GUANABARA') || d.includes('GUANABARA'), desc: 'COMPRAS GUANABARA', amount: 923.54, cat: 'Alimentação', day: 7, inst: null },
                { match: (d: string) => d.includes('EMPRÉSTIMO PARA VIAJAR') || d.includes('EMPRESTIMO PARA VIAJAR'), desc: 'EMPRÉSTIMO PARA VIAJAR', amount: 416.66, cat: 'Empréstimos', day: 7, inst: { current: 1, total: 6 } },
                { match: (d: string) => d.includes('BAHIA') || d.includes('INGRESSO JOGO'), desc: 'INGRESSO JOGO BAHIA', amount: 214.34, cat: 'Iago', day: 7, inst: { current: 2, total: 2 } },
                { match: (d: string) => d.includes('PASSAGENS PARA SALVADOR'), desc: 'PASSAGENS PARA SALVADOR', amount: 216.94, cat: 'Viagens', day: 7, inst: { current: 1, total: 6 } },
                { match: (d: string) => d.includes('PRIMEIRO CARRO'), desc: 'PRIMEIRO CARRO ALUGADO', amount: 63.17, cat: 'Viagens', day: 7, inst: { current: 2, total: 6 } },
                { match: (d: string) => d.includes('SEGUNDO CARRO'), desc: 'SEGUNDO CARRO ALUGADO', amount: 78.57, cat: 'Viagens', day: 7, inst: { current: 2, total: 6 } }
            ];

            iagoOverridesSept2026.forEach(item => {
                const index = data.expenses.findIndex(e => item.match(e.description.toUpperCase()) && (e.group?.toUpperCase().includes('IAGO') || !e.group));
                if (index >= 0) {
                    data.expenses[index] = {
                        ...data.expenses[index],
                        description: item.desc,
                        amount: item.amount,
                        category: item.cat,
                        dueDate: `2026-09-${item.day.toString().padStart(2, '0')}`,
                        installments: item.inst ? item.inst : undefined,
                        group: 'IAGO (CARTÃO NUBANK)'
                    };
                } else {
                    data.expenses.push({
                        id: `iago_${item.desc.replace(/[^A-Z0-9]/gi, '')}_sep26`,
                        description: item.desc,
                        amount: item.amount,
                        category: item.cat,
                        paid: false,
                        dueDate: `2026-09-${item.day.toString().padStart(2, '0')}`,
                        installments: item.inst ? item.inst : undefined,
                        group: 'IAGO (CARTÃO NUBANK)'
                    });
                }
            });

            // Clean up unwanted items from September 2026 (UBER from Iago, unwanted Jady items)
            data.expenses = data.expenses.filter(e => {
                const d = e.description.toUpperCase();
                const g = (e.group || '').toUpperCase();
                if ((g.includes('IAGO') || d.includes('(IAGO)')) && d.includes('UBER')) {
                    return false;
                }
                if (e.group === 'JADY' || e.description.toUpperCase().includes('(JADY)')) {
                    if (d.includes('SAFARI') || d.includes('MAQUIAGEM') || d.includes('TÊNIS') || d.includes('TENIS')) {
                        return false;
                    }
                }
                return true;
            });

            // Jady items for September 2026: Empréstimo para Viagem de Salvador (2/3) R$ 395,26
            const jadyLoanIdx = data.expenses.findIndex(e => 
                (e.description.toUpperCase().includes('VIAGEM DE SALVADOR') || e.description.toUpperCase().includes('SALVADOR')) && 
                (e.group === 'JADY' || !e.group)
            );
            if (jadyLoanIdx >= 0) {
                data.expenses[jadyLoanIdx] = {
                    ...data.expenses[jadyLoanIdx],
                    description: 'EMPRÉSTIMO PARA VIAGEM DE SALVADOR',
                    amount: 395.26,
                    category: 'Empréstimos',
                    dueDate: '2026-09-10',
                    installments: { current: 2, total: 3 },
                    group: 'JADY'
                };
            } else {
                data.expenses.push({
                    id: 'jady_emprestimo_salvador_sep26',
                    description: 'EMPRÉSTIMO PARA VIAGEM DE SALVADOR',
                    amount: 395.26,
                    category: 'Empréstimos',
                    paid: false,
                    dueDate: '2026-09-10',
                    installments: { current: 2, total: 3 },
                    group: 'JADY'
                });
            }

            // Ensure Santander balance default for September 2026
            data.bankReserves = {
                santander: 2997.96,
                inter: data.bankReserves?.inter || 0.00,
                sofisa: data.bankReserves?.sofisa || 100.00
            };

            // Keep all expenses sorted alphabetically
            data.expenses.sort((a, b) => a.description.localeCompare(b.description, 'pt-BR', { sensitivity: 'base' }));
        }

        // Explicit updates and integrity enforcement for October 2026
        if (year === 2026 && month === 10) {
            const canonicalOct = generateMonthData(2026, 10);
            
            // Build map of user paid statuses
            const userPaidMap = new Map<string, { paid: boolean, paidAt?: string | null, userModifiedPaid?: boolean, skipped?: boolean }>();
            [...data.expenses, ...data.avulsosItems, ...(data.incomes || [])].forEach(item => {
                const normDesc = item.description.toUpperCase().trim();
                userPaidMap.set(normDesc, { paid: item.paid, paidAt: item.paidAt, userModifiedPaid: item.userModifiedPaid, skipped: item.skipped });
            });

            // Clean list of canonical expenses
            const cleanExpenses: Transaction[] = canonicalOct.expenses.map(exp => {
                const norm = exp.description.toUpperCase().trim();
                const userState = userPaidMap.get(norm);
                if (userState) {
                    return { ...exp, paid: userState.paid, paidAt: userState.paidAt, userModifiedPaid: userState.userModifiedPaid, skipped: userState.skipped };
                }
                return exp;
            });

            // Add any non-canonical custom expenses the user might have created
            data.expenses.forEach(exp => {
                const norm = exp.description.toUpperCase().trim();
                if (!cleanExpenses.some(c => c.description.toUpperCase().trim() === norm || c.id === exp.id)) {
                    cleanExpenses.push(exp);
                }
            });

            // Claroflex items on Iago Nubank card
            const claroflexAndre = cleanExpenses.find(e => e.description.toUpperCase().includes('CLAROFLEX ANDRÉ') || e.description.toUpperCase().includes('CLAROFLEX ANDRE'));
            if (!claroflexAndre) {
                cleanExpenses.push({
                    id: 'exp_claroflex_andre_iago_2026_10',
                    description: 'CLAROFLEX ANDRÉ',
                    amount: 59.90,
                    category: 'Moradia',
                    paid: false,
                    dueDate: '2026-10-07',
                    group: 'IAGO (CARTÃO NUBANK)'
                });
            }
            const claroflexMarcelly = cleanExpenses.find(e => e.description.toUpperCase().includes('CLAROFLEX MARCELLY'));
            if (!claroflexMarcelly) {
                cleanExpenses.push({
                    id: 'exp_claroflex_marcelly_iago_2026_10',
                    description: 'CLAROFLEX MARCELLY',
                    amount: 44.90,
                    category: 'Moradia',
                    paid: false,
                    dueDate: '2026-10-07',
                    group: 'IAGO (CARTÃO NUBANK)'
                });
            }

            // Empréstimo Junho parcela 4/4
            const loanJunho = cleanExpenses.find(e => e.description.toUpperCase().includes('EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO') || e.description.toUpperCase().includes('EMPRESTIMO PARA PAGAR AS CONTAS DE JUNHO'));
            if (!loanJunho) {
                cleanExpenses.push({
                    id: 'fin_EMPRÉSTIMOPARAPAGARASCONTASDEJUNHO_4',
                    description: 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE JUNHO',
                    amount: 486.00,
                    category: 'Empréstimos',
                    paid: false,
                    dueDate: '2026-10-20',
                    installments: { current: 4, total: 4 },
                    group: 'MARCIA BRITO'
                });
            }

            // Ensure Alinhamento do Carro parcela 2 de 2 (R$ 165,00) in Marcia Brito for October 2026
            const alinhamentoOct = cleanExpenses.find(e => e.description.toUpperCase().includes('ALINHAMENTO DO CARRO') || e.description.toUpperCase().includes('ALINHAMENTO'));
            if (alinhamentoOct) {
                alinhamentoOct.description = 'ALINHAMENTO DO CARRO';
                alinhamentoOct.amount = 165.00;
                alinhamentoOct.category = 'Transporte';
                alinhamentoOct.group = 'MARCIA BRITO';
                alinhamentoOct.dueDate = alinhamentoOct.dueDate || '2026-10-12';
                alinhamentoOct.installments = { current: 2, total: 2 };
            } else {
                cleanExpenses.push({
                    id: 'fin_ALINHAMENTODOCARRO_2',
                    description: 'ALINHAMENTO DO CARRO',
                    amount: 165.00,
                    category: 'Transporte',
                    paid: false,
                    dueDate: '2026-10-12',
                    installments: { current: 2, total: 2 },
                    group: 'MARCIA BRITO'
                });
            }

            // Ensure Jady Empréstimo Viagem Salvador parcela 3/3
            const jadyLoan = cleanExpenses.find(e => e.description.toUpperCase().includes('VIAGEM DE SALVADOR') || (e.description.toUpperCase().includes('SALVADOR') && (e.group === 'JADY' || e.category === 'Jady')));
            if (jadyLoan) {
                jadyLoan.group = 'JADY';
                jadyLoan.category = 'Empréstimos';
                jadyLoan.amount = 395.26;
                jadyLoan.installments = { current: 3, total: 3 };
            } else {
                cleanExpenses.push({
                    id: 'fin_EMPRÉSTIMOPARAVIAGEMDESALVADOR_3',
                    description: 'EMPRÉSTIMO PARA VIAGEM DE SALVADOR',
                    amount: 395.26,
                    category: 'Empréstimos',
                    paid: false,
                    dueDate: '2026-10-10',
                    installments: { current: 3, total: 3 },
                    group: 'JADY'
                });
            }

            // Ensure Faculdade da Marcelly parcela 10 de 10 (R$ 202.68) in Marcia Brito for October 2026
            const faculdadeOct = cleanExpenses.find(e => e.description.toUpperCase().includes('FACULDADE DA MARCELLY') || e.description.toUpperCase().includes('FACULDADE'));
            if (faculdadeOct) {
                faculdadeOct.description = 'FACULDADE DA MARCELLY';
                faculdadeOct.amount = 202.68;
                faculdadeOct.category = 'Educação';
                faculdadeOct.group = 'MARCIA BRITO';
                faculdadeOct.dueDate = faculdadeOct.dueDate || '2026-10-12';
                faculdadeOct.installments = { current: 10, total: 10 };
            } else {
                cleanExpenses.push({
                    id: 'fin_FACULDADEDAMARCELLY_10',
                    description: 'FACULDADE DA MARCELLY',
                    amount: 202.68,
                    category: 'Educação',
                    paid: false,
                    dueDate: '2026-10-12',
                    installments: { current: 10, total: 10 },
                    group: 'MARCIA BRITO'
                });
            }

            // Ensure Claudio Silva Empréstimo Contas de Setembro parcela 1/5 (R$ 300,00)
            const claudioLoan = cleanExpenses.find(e => e.description.toUpperCase().includes('CONTAS DE SETEMBRO'));
            if (claudioLoan) {
                claudioLoan.description = 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO';
                claudioLoan.group = 'CLAUDIO SILVA';
                claudioLoan.category = 'Empréstimos';
                claudioLoan.amount = 300.00;
                claudioLoan.installments = { current: 1, total: 5 };
            } else {
                cleanExpenses.push({
                    id: 'fin_EMPRÉSTIMOPARAPAGARASCONTASDESETEMBRO_1',
                    description: 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO',
                    amount: 300.00,
                    category: 'Empréstimos',
                    paid: false,
                    dueDate: '2026-10-15',
                    installments: { current: 1, total: 5 },
                    group: 'CLAUDIO SILVA'
                });
            }

            // Ensure EMPRÉSTIMO COM LILI is frozen (congelado / skipped) for October 2026
            const liliLoan = cleanExpenses.find(e => e.description.toUpperCase().includes('EMPRÉSTIMO COM LILI') || e.description.toUpperCase().includes('EMPRESTIMO COM LILI'));
            if (liliLoan) {
                liliLoan.skipped = true;
                liliLoan.amount = 800.00;
                liliLoan.group = 'LILI TORRES';
            } else {
                cleanExpenses.push({
                    id: 'fin_EMPRÉSTIMOCOMLILI_oct26_frozen',
                    description: 'EMPRÉSTIMO COM LILI',
                    amount: 800.00,
                    category: 'Empréstimos',
                    paid: false,
                    skipped: true,
                    dueDate: '2026-10-04',
                    installments: { current: 3, total: 5 },
                    group: 'LILI TORRES'
                });
            }

            // Ensure Conserto do Celular (parcela 1 de 2, R$ 110,00) and Abastecimento (R$ 310,00) for Iago in October 2026
            const consertoCelularOct = cleanExpenses.find(e => e.description.toUpperCase().includes('CONSERTO DO CELULAR') || e.description.toUpperCase().includes('CONSERTO CELULAR'));
            if (consertoCelularOct) {
                consertoCelularOct.amount = 110.00;
                consertoCelularOct.category = 'Iago';
                consertoCelularOct.group = 'IAGO (CARTÃO NUBANK)';
                consertoCelularOct.installments = { current: 1, total: 2 };
                consertoCelularOct.dueDate = '2026-10-07';
            } else {
                cleanExpenses.push({
                    id: 'exp_conserto_celular_iago_2026_10',
                    description: 'CONSERTO DO CELULAR',
                    amount: 110.00,
                    category: 'Iago',
                    paid: false,
                    dueDate: '2026-10-07',
                    installments: { current: 1, total: 2 },
                    group: 'IAGO (CARTÃO NUBANK)'
                });
            }

            // Remove obsolete generic ABASTECIMENTO if present
            const obsoleteAbastIdx = cleanExpenses.findIndex(e => e.description.toUpperCase().trim() === 'ABASTECIMENTO' && (e.group?.includes('IAGO') || e.category === 'Iago'));
            if (obsoleteAbastIdx >= 0) {
                cleanExpenses.splice(obsoleteAbastIdx, 1);
            }

            // Abastecimento 19/09 (R$ 307,46)
            const abast19 = cleanExpenses.find(e => e.description.toUpperCase().includes('19/09') || (e.description.toUpperCase().includes('ABASTECIMENTO') && e.amount === 307.46));
            if (abast19) {
                abast19.description = 'ABASTECIMENTO (19/09)';
                abast19.amount = 307.46;
                abast19.category = 'Iago';
                abast19.group = 'IAGO (CARTÃO NUBANK)';
                abast19.dueDate = '2026-10-07';
                abast19.purchaseDate = '2026-09-19';
            } else {
                cleanExpenses.push({
                    id: 'exp_abastecimento_1909_iago_2026_10',
                    description: 'ABASTECIMENTO (19/09)',
                    amount: 307.46,
                    category: 'Iago',
                    paid: false,
                    dueDate: '2026-10-07',
                    purchaseDate: '2026-09-19',
                    group: 'IAGO (CARTÃO NUBANK)'
                });
            }

            // Abastecimento 29/09 (R$ 342,24)
            const abast29 = cleanExpenses.find(e => e.description.toUpperCase().includes('29/09') && e.description.toUpperCase().includes('ABASTECIMENTO'));
            if (abast29) {
                abast29.description = 'ABASTECIMENTO (29/09)';
                abast29.amount = 342.24;
                abast29.category = 'Iago';
                abast29.group = 'IAGO (CARTÃO NUBANK)';
                abast29.dueDate = '2026-10-07';
                abast29.purchaseDate = '2026-09-29';
            } else {
                cleanExpenses.push({
                    id: 'exp_abastecimento_2909_iago_2026_10',
                    description: 'ABASTECIMENTO (29/09)',
                    amount: 342.24,
                    category: 'Iago',
                    paid: false,
                    dueDate: '2026-10-07',
                    purchaseDate: '2026-09-29',
                    group: 'IAGO (CARTÃO NUBANK)'
                });
            }

            // Caneta Emagrecedora DrogaRaia (R$ 490,00 - 29/09)
            const canetaDrogaRaia = cleanExpenses.find(e => e.description.toUpperCase().includes('CANETA') || e.description.toUpperCase().includes('DROGARAIA') || e.amount === 490.00);
            if (canetaDrogaRaia) {
                canetaDrogaRaia.description = 'CANETA EMAGRECEDORA (DROGARAIA)';
                canetaDrogaRaia.amount = 490.00;
                canetaDrogaRaia.category = 'Iago';
                canetaDrogaRaia.group = 'IAGO (CARTÃO NUBANK)';
                canetaDrogaRaia.dueDate = '2026-10-07';
                canetaDrogaRaia.purchaseDate = '2026-09-29';
            } else {
                cleanExpenses.push({
                    id: 'exp_caneta_emagrecedora_iago_2026_10',
                    description: 'CANETA EMAGRECEDORA (DROGARAIA)',
                    amount: 490.00,
                    category: 'Iago',
                    paid: false,
                    dueDate: '2026-10-07',
                    purchaseDate: '2026-09-29',
                    group: 'IAGO (CARTÃO NUBANK)'
                });
            }

            // Ensure Aluguel, Internet, and Iago's values are marked as paid in October 2026
            cleanExpenses.forEach(e => {
                const norm = e.description.toUpperCase().trim();
                if (norm === 'ALUGUEL' || norm.includes('INTERNET')) {
                    e.paid = true;
                    if (!e.paidAt) e.paidAt = '2026-10-01';
                }
                if (e.group === 'IAGO (CARTÃO NUBANK)' || e.category === 'Iago' || norm.includes('IAGO')) {
                    e.paid = true;
                    if (!e.paidAt) e.paidAt = '2026-10-07';
                }
            });

            // Exclude Seguro do Carro for October 2026 (não tem que pagar este mês)
            data.expenses = cleanExpenses.filter(e => !e.description.toUpperCase().trim().includes('SEGURO DO CARRO'));

            // Incomes for October 2026
            const cleanIncomes: Transaction[] = canonicalOct.incomes.map(inc => {
                const norm = inc.description.toUpperCase().trim();
                const userState = userPaidMap.get(norm);
                if (userState) {
                    return { ...inc, paid: userState.paid, paidAt: userState.paidAt, userModifiedPaid: userState.userModifiedPaid };
                }
                return inc;
            });

            (data.incomes || []).forEach(inc => {
                const norm = inc.description.toUpperCase().trim();
                if (!cleanIncomes.some(c => c.description.toUpperCase().trim() === norm || c.id === inc.id)) {
                    cleanIncomes.push(inc);
                }
            });

            data.incomes = cleanIncomes;

            // Bank reserves default for October 2026
            if (!data.bankReserves || data.bankReserves.santander === undefined) {
                data.bankReserves = {
                    santander: 0.00,
                    inter: 0.00,
                    sofisa: 100.00
                };
            }

            data.expenses.sort((a, b) => a.description.localeCompare(b.description, 'pt-BR', { sensitivity: 'base' }));
        }

        // SYSTEM RULES: Apply these regardless of whether the user has modified data
        
        // Filter out any "CONTAS DE SETEMBRO" belonging to MARCIA BISPO anywhere in the application
        if (data.expenses) {
            data.expenses = data.expenses.filter(e => {
                const desc = e.description.toUpperCase();
                const grp = (e.group || '').toUpperCase();
                if (desc.includes('CONTAS DE SETEMBRO') && (desc.includes('MARCIA') || grp.includes('MARCIA') || desc.includes('BISPO') || grp.includes('BISPO'))) {
                    return false;
                }
                return true;
            });
        }

        // Ensure Claudio Silva Empréstimo Contas de Setembro (3 installments: Oct 300, Nov 300, Dec 400)
        if (year === 2026 && (month === 10 || month === 11 || month === 12)) {
            const current = month - 10 + 1; // 10 -> 1, 11 -> 2, 12 -> 3
            const total = 3;
            const amount = month === 12 ? 400.00 : 300.00;
            const claudioLoan = data.expenses.find(e => e.description.toUpperCase().includes('CONTAS DE SETEMBRO') && e.group === 'CLAUDIO SILVA');
            if (claudioLoan) {
                claudioLoan.description = 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO';
                claudioLoan.group = 'CLAUDIO SILVA';
                claudioLoan.category = 'Empréstimos';
                claudioLoan.amount = amount;
                claudioLoan.installments = { current, total };
            } else {
                data.expenses.push({
                    id: `fin_EMPRÉSTIMOPARAPAGARASCONTASDESETEMBRO_${current}`,
                    description: 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO',
                    amount: amount,
                    category: 'Empréstimos',
                    paid: false,
                    dueDate: `2026-${month.toString().padStart(2, '0')}-15`,
                    installments: { current, total },
                    group: 'CLAUDIO SILVA'
                });
            }
        } else {
            data.expenses = data.expenses.filter(e => !(e.description.toUpperCase().includes('CONTAS DE SETEMBRO') && e.group === 'CLAUDIO SILVA'));
        }

        // Ensure Jady Empréstimo Contas de Setembro (R$ 400,00, installments 1 to 5) starting Oct 2026
        if ((year === 2026 && month >= 10) || year > 2026) {
            const diff = (year - 2026) * 12 + (month - 10);
            const current = diff + 1;
            const total = 5;
            if (current >= 1 && current <= total) {
                const jadyLoan = data.expenses.find(e => e.description.toUpperCase().includes('CONTAS DE SETEMBRO') && e.group === 'JADY');
                if (jadyLoan) {
                    jadyLoan.description = 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO';
                    jadyLoan.group = 'JADY';
                    jadyLoan.category = 'Empréstimos';
                    jadyLoan.amount = 400.00;
                    jadyLoan.installments = { current, total };
                } else {
                    data.expenses.push({
                        id: `fin_JADY_EMPRÉSTIMOPARAPAGARASCONTASDESETEMBRO_${current}`,
                        description: 'EMPRÉSTIMO PARA PAGAR AS CONTAS DE SETEMBRO',
                        amount: 400.00,
                        category: 'Empréstimos',
                        paid: false,
                        dueDate: `${year}-${month.toString().padStart(2, '0')}-10`,
                        installments: { current, total },
                        group: 'JADY'
                    });
                }
            } else {
                data.expenses = data.expenses.filter(e => !(e.description.toUpperCase().includes('CONTAS DE SETEMBRO') && e.group === 'JADY'));
            }
        }

        // Ensure Lili Torres Empréstimo Viagem Nordeste is exactly R$ 335,90 and correctly sequenced from Oct 2026 onwards
        if ((year === 2026 && month >= 8) || year > 2026) {
            const diff = (year - 2026) * 12 + (month - 8);
            const current = diff + 1;
            const total = 6;
            if (current >= 1 && current <= total) {
                const liliNordeste = data.expenses.find(e => e.description.toUpperCase().includes('NORDESTE') && (e.group === 'LILI TORRES' || e.description.toUpperCase().includes('LILI')));
                if (liliNordeste) {
                    liliNordeste.description = 'EMPRÉSTIMO VIAGEM NORDESTE (LILI)';
                    liliNordeste.group = 'LILI TORRES';
                    liliNordeste.category = 'Empréstimos';
                    liliNordeste.amount = 335.90;
                    liliNordeste.installments = { current, total };
                } else {
                    data.expenses.push({
                        id: `fin_EMPRÉSTIMOVIAGEMNORDESTELILI_${current}`,
                        description: 'EMPRÉSTIMO VIAGEM NORDESTE (LILI)',
                        amount: 335.90,
                        category: 'Empréstimos',
                        paid: false,
                        dueDate: `${year}-${month.toString().padStart(2, '0')}-04`,
                        installments: { current, total },
                        group: 'LILI TORRES'
                    });
                }
            } else {
                data.expenses = data.expenses.filter(e => !(e.description.toUpperCase().includes('NORDESTE') && e.group === 'LILI TORRES'));
            }
        }

        // Ensure Sandália (Jady) - 2 installments of R$ 50,00 in Nov 2026 (1/2) and Dec 2026 (2/2)
        if (year === 2026 && (month === 11 || month === 12)) {
            const current = month === 11 ? 1 : 2;
            const sandaliaJady = data.expenses.find(e => 
                (e.description.toUpperCase().includes('SANDÁLIA') || e.description.toUpperCase().includes('SANDALIA')) && 
                (e.group === 'JADY' || e.category === 'Jady')
            );
            if (sandaliaJady) {
                sandaliaJady.description = 'SANDÁLIA';
                sandaliaJady.amount = 50.00;
                sandaliaJady.category = 'Jady';
                sandaliaJady.group = 'JADY';
                sandaliaJady.installments = { current, total: 2 };
                sandaliaJady.dueDate = `2026-${month.toString().padStart(2, '0')}-10`;
            } else {
                data.expenses.push({
                    id: `fin_SANDÁLIA_JADY_${current}`,
                    description: 'SANDÁLIA',
                    amount: 50.00,
                    category: 'Jady',
                    paid: false,
                    dueDate: `2026-${month.toString().padStart(2, '0')}-10`,
                    installments: { current, total: 2 },
                    group: 'JADY'
                });
            }
        } else {
            // Ensure no stray Sandália for JADY in other months
            data.expenses = data.expenses.filter(e => !(
                (e.description.toUpperCase().includes('SANDÁLIA') || e.description.toUpperCase().includes('SANDALIA')) && 
                (e.group === 'JADY' || e.category === 'Jady')
            ));
        }

        // Ensure EMPRÉSTIMO COM LILI is correctly sequenced for November and December 2026
        if (year === 2026 && month === 11) {
            const liliLoanNov = data.expenses.find(e => e.description.toUpperCase().includes('EMPRÉSTIMO COM LILI') || e.description.toUpperCase().includes('EMPRESTIMO COM LILI'));
            if (liliLoanNov) {
                liliLoanNov.amount = 800.00;
                liliLoanNov.installments = { current: 4, total: 5 };
                liliLoanNov.group = 'LILI TORRES';
                liliLoanNov.category = 'Empréstimos';
                liliLoanNov.skipped = false;
            } else {
                data.expenses.push({
                    id: 'fin_EMPRÉSTIMOCOMLILI_nov26_4_5',
                    description: 'EMPRÉSTIMO COM LILI',
                    amount: 800.00,
                    category: 'Empréstimos',
                    paid: false,
                    dueDate: '2026-11-04',
                    installments: { current: 4, total: 5 },
                    group: 'LILI TORRES'
                });
            }

            const consertoCelularNov = data.expenses.find(e => e.description.toUpperCase().includes('CONSERTO DO CELULAR') || e.description.toUpperCase().includes('CONSERTO CELULAR'));
            if (consertoCelularNov) {
                consertoCelularNov.amount = 110.00;
                consertoCelularNov.category = 'Iago';
                consertoCelularNov.group = 'IAGO (CARTÃO NUBANK)';
                consertoCelularNov.installments = { current: 2, total: 2 };
                consertoCelularNov.dueDate = '2026-11-07';
            } else {
                data.expenses.push({
                    id: 'exp_conserto_celular_iago_2026_11',
                    description: 'CONSERTO DO CELULAR',
                    amount: 110.00,
                    category: 'Iago',
                    paid: false,
                    dueDate: '2026-11-07',
                    installments: { current: 2, total: 2 },
                    group: 'IAGO (CARTÃO NUBANK)'
                });
            }
        }

        if (year === 2026 && month === 12) {
            const liliLoanDec = data.expenses.find(e => e.description.toUpperCase().includes('EMPRÉSTIMO COM LILI') || e.description.toUpperCase().includes('EMPRESTIMO COM LILI'));
            if (liliLoanDec) {
                liliLoanDec.amount = 800.00;
                liliLoanDec.installments = { current: 5, total: 5 };
                liliLoanDec.group = 'LILI TORRES';
                liliLoanDec.category = 'Empréstimos';
                liliLoanDec.skipped = false;
            } else {
                data.expenses.push({
                    id: 'fin_EMPRÉSTIMOCOMLILI_dec26_5_5',
                    description: 'EMPRÉSTIMO COM LILI',
                    amount: 800.00,
                    category: 'Empréstimos',
                    paid: false,
                    dueDate: '2026-12-04',
                    installments: { current: 5, total: 5 },
                    group: 'LILI TORRES'
                });
            }
        }

        // 1. Update Andre's Salary for Sept 2026 onwards
        if ((year === 2026 && month >= 9) || year > 2026) {
            data.incomes = data.incomes.map(i => {
                const desc = i.description.toUpperCase();
                const isAndreSalary = desc === "SALARIO ANDRE" || 
                                    desc === "SALÁRIO ANDRÉ" || 
                                    desc === "SALÁRIO DO ANDRÉ" || 
                                    desc === "SALARIO DO ANDRE" || 
                                    desc.includes("SALÁRIO ANDRÉ") || 
                                    desc.includes("SALARIO ANDRE") ||
                                    i.amount === 3100 || 
                                    i.amount === 3100.00;
                
                if (isAndreSalary) {
                    return { ...i, amount: 3219.07 };
                }
                return i;
            });
        }

        // 2. December 2026 special rules (13th salary)
        if (year === 2026 && month === 12) {
             // Ensure normal salaries are correct for December
             const hasSalAndre = data.incomes.some(i => i.id === "inc_a_2026_12" || i.description.toUpperCase().includes("SALÁRIO ANDRÉ") || i.description.toUpperCase().includes("SALARIO ANDRE"));
             const hasSalMarcelly = data.incomes.some(i => i.id === "inc_m_2026_12" || i.description.toUpperCase().includes("SALÁRIO MARCELLY") || i.description.toUpperCase().includes("SALARIO MARCELLY"));

             if (!hasSalAndre) {
                 data.incomes.push({
                     id: "inc_a_2026_12",
                     description: "SALÁRIO ANDRÉ",
                     amount: 3219.07,
                     paid: false,
                     date: "2026-12-01",
                     dueDate: "2026-12-01",
                     category: "Salário"
                 });
             }

             if (!hasSalMarcelly) {
                 data.incomes.push({
                     id: "inc_m_2026_12",
                     description: "SALÁRIO MARCELLY",
                     amount: 3436.22,
                     paid: false,
                     date: "2026-12-27",
                     dueDate: "2026-12-27",
                     category: "Salário"
                 });
             }

             // Remove any existing 13th salary entries to avoid duplication
             data.incomes = data.incomes.filter(i => {
                 const desc = i.description.toUpperCase();
                 return !desc.includes("13º") && !desc.includes("13O") && !desc.includes("DÉCIMO TERCEIRO") && !desc.includes("DECIMO TERCEIRO");
             });

             // Marcelly: Full salary
             data.incomes.push({
                 id: "inc_13_m_2026",
                 description: "13º SALÁRIO - MARCELLY",
                 amount: 3436.22,
                 paid: false,
                 date: "2026-12-20",
                 dueDate: "2026-12-20",
                 category: "13º Salário"
             });

             // Andre: 7/12
             data.incomes.push({
                 id: "inc_13_a_2026",
                 description: "13º SALÁRIO - ANDRÉ (7/12)",
                 amount: 1877.79,
                 paid: false,
                 date: "2026-12-20",
                 dueDate: "2026-12-20",
                 category: "13º Salário"
             });
        }

        // Universal Preservation: Ensure no user toggles (paid, paidAt, skipped, isSuspended, suspendedUntil, userModifiedPaid) are ever lost
        const applyFinalPreservation = (t: Transaction): Transaction => {
            const p = getPreservedState(t);
            if (!p) return t;
            return {
                ...t,
                paid: p.paid !== undefined ? p.paid : t.paid,
                paidAt: p.paid !== undefined ? p.paidAt : t.paidAt,
                skipped: p.skipped !== undefined ? p.skipped : t.skipped,
                isSuspended: p.isSuspended !== undefined ? p.isSuspended : t.isSuspended,
                suspendedUntil: p.suspendedUntil !== undefined ? p.suspendedUntil : t.suspendedUntil,
                userModifiedPaid: p.userModifiedPaid !== undefined ? p.userModifiedPaid : t.userModifiedPaid
            };
        };

        data.expenses = data.expenses.map(applyFinalPreservation);
        data.avulsosItems = data.avulsosItems.map(applyFinalPreservation);
        data.incomes = data.incomes.map(applyFinalPreservation);

        // Explicit Post-Preservation Systemic Rule for October 2026
        if (year === 2026 && month === 10) {
            // Remove Seguro do Carro (not to be paid this month)
            data.expenses = data.expenses.filter(e => !e.description.toUpperCase().includes('SEGURO DO CARRO'));
            
            // Ensure Aluguel, Internet, and Iago's values are marked as paid
            data.expenses = data.expenses.map(e => {
                const norm = e.description.toUpperCase().trim();
                if (norm === 'ALUGUEL' || norm.includes('INTERNET')) {
                    return {
                        ...e,
                        paid: true,
                        paidAt: e.paidAt || '2026-10-01'
                    };
                }
                if (e.group === 'IAGO (CARTÃO NUBANK)' || e.category === 'Iago' || norm.includes('IAGO')) {
                    return {
                        ...e,
                        paid: true,
                        paidAt: e.paidAt || '2026-10-07'
                    };
                }
                return e;
            });

            // Ensure Alinhamento do Carro with parcela 2 de 2 in Marcia Brito
            const alinhamentoIdx = data.expenses.findIndex(e => {
                const norm = e.description.toUpperCase().trim();
                return norm.includes('ALINHAMENTO DO CARRO') || norm.includes('ALINHAMENTO');
            });
            if (alinhamentoIdx >= 0) {
                data.expenses[alinhamentoIdx] = {
                    ...data.expenses[alinhamentoIdx],
                    description: 'ALINHAMENTO DO CARRO',
                    amount: 165.00,
                    category: 'Transporte',
                    group: 'MARCIA BRITO',
                    dueDate: data.expenses[alinhamentoIdx].dueDate || '2026-10-12',
                    installments: { current: 2, total: 2 }
                };
            } else {
                data.expenses.push({
                    id: 'fin_ALINHAMENTODOCARRO_2',
                    description: 'ALINHAMENTO DO CARRO',
                    amount: 165.00,
                    category: 'Transporte',
                    paid: false,
                    dueDate: '2026-10-12',
                    installments: { current: 2, total: 2 },
                    group: 'MARCIA BRITO'
                });
            }
        }

        // Global deduplication to remove duplicate Iago items caused by trailing "(IAGO)"
        data.expenses = data.expenses.map(e => {
            if (e.description.endsWith(' (IAGO)')) {
                return { ...e, description: e.description.replace(' (IAGO)', '') };
            }
            return e;
        });
        
        const uniqueExpensesMap = new Map();
        data.expenses.forEach(e => {
            const key = `${e.description.toUpperCase().trim()}_${e.amount}`;
            if (!uniqueExpensesMap.has(key)) {
                uniqueExpensesMap.set(key, e);
            } else {
                const existing = uniqueExpensesMap.get(key);
                if (!existing.paid && e.paid) {
                    uniqueExpensesMap.set(key, e);
                }
            }
        });
        data.expenses = Array.from(uniqueExpensesMap.values());

        // Final sort to ensure all programmatically added items are alphabetically ordered
        data.expenses = [...data.expenses].sort((a, b) => 
            a.description.localeCompare(b.description, 'pt-BR', { sensitivity: 'base' })
        );
        data.avulsosItems = [...data.avulsosItems].sort((a, b) => 
            a.description.localeCompare(b.description, 'pt-BR', { sensitivity: 'base' })
        );

        return data;
    };

    const loadData = async (year: number, month: number) => {
        try {
            const key = getStorageKey(year, month);
            const local = localStorage.getItem(key);
            
            if (local) {
                try {
                    const parsed = JSON.parse(local);
                    setMonthData(ensureSystemIntegrity(parsed, year, month));
                } catch (e) {
                    console.error("Failed to parse local data", e);
                    const newData = ensureSystemIntegrity(generateMonthData(year, month), year, month);
                    setMonthData(newData);
                }
            } else {
                const newData = ensureSystemIntegrity(generateMonthData(year, month), year, month);
                setMonthData(newData);
            }
        } catch (error) {
            console.error("Critical error in loadData", error);
            // Fallback to minimal data to avoid white screen
            setMonthData(generateMonthData(year, month));
        }
    };

    const setupRealtimeListener = (year: number, month: number) => {
        if (!isConfigured) return;
        
        // Cleanup previous listener
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        const docRef = doc(db, 'families', FAMILY_ID, 'months', `${year}_${month}`);
        const path = `families/${FAMILY_ID}/months/${year}_${month}`;
        
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                let cloudData = snapshot.data() as MonthData;
                const localData = monthDataRef.current;
                const rawCloudStr = JSON.stringify(snapshot.data());

                cloudData = ensureSystemIntegrity(cloudData, year, month);
                const cleanCloudStr = JSON.stringify(cloudData);

                // Only update if cloud data is newer
                if (!localData || cloudData.updatedAt >= (localData.updatedAt || 0)) {
                    setMonthData(cloudData);
                    try { localStorage.setItem(getStorageKey(year, month), cleanCloudStr); } catch (e) { console.warn("LocalStorage Quota Exceeded:", e); }
                    if (rawCloudStr !== cleanCloudStr) {
                        setDoc(docRef, JSON.parse(cleanCloudStr))
                            .then(() => setSyncStatus('online'))
                            .catch(e => handleFirestoreError(e, OperationType.WRITE, path));
                    }
                } else if (localData && localData.updatedAt > cloudData.updatedAt) {
                    // Local data is newer than Firestore! Push local to cloud!
                    setDoc(docRef, JSON.parse(JSON.stringify(localData)))
                        .then(() => setSyncStatus('online'))
                        .catch(e => handleFirestoreError(e, OperationType.WRITE, path));
                }
            } else {
                // Documents does not exist in Firestore yet!
                // If we have local data, push it. Otherwise generate default and push.
                const localData = monthDataRef.current;
                if (localData) {
                    setDoc(docRef, JSON.parse(JSON.stringify(localData)))
                        .then(() => setSyncStatus('online'))
                        .catch(e => handleFirestoreError(e, OperationType.WRITE, path));
                } else {
                    const newData = ensureSystemIntegrity(generateMonthData(year, month), year, month);
                    setMonthData(newData);
                    try { localStorage.setItem(getStorageKey(year, month), JSON.stringify(newData)); } catch (e) { console.warn("LocalStorage Quota Exceeded:", e); }
                    setDoc(docRef, JSON.parse(JSON.stringify(newData)))
                        .then(() => setSyncStatus('online'))
                        .catch(e => handleFirestoreError(e, OperationType.WRITE, path));
                }
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, path);
        });

        unsubscribeRef.current = unsubscribe;
        return unsubscribe;
    };

    const cleanDataForFirestore = (data: any) => JSON.parse(JSON.stringify(data));

    const saveData = async (data: MonthData | null, year: number, month: number) => {
        if (!data) return;
        
        const ensuredData = ensureSystemIntegrity(data, year, month);
        const updatedData = { ...ensuredData, updatedAt: Date.now() };
        setMonthData(updatedData);
        try { localStorage.setItem(getStorageKey(year, month), JSON.stringify(updatedData)); } catch (e) { console.warn("LocalStorage Quota Exceeded:", e); }

        if (isConfigured && auth?.currentUser) {
            setSyncStatus('syncing');
            const path = `families/${FAMILY_ID}/months/${year}_${month}`;
            try {
                const docRef = doc(db, 'families', FAMILY_ID, 'months', `${year}_${month}`);
                await setDoc(docRef, cleanDataForFirestore(updatedData));
                setSyncStatus('online');
            } catch (e) {
                handleFirestoreError(e, OperationType.WRITE, path);
            }
        }
    };

    const handleMonthChange = (diff: number) => {
        let newMonth = currentMonth + diff;
        let newYear = currentYear;
        
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        
        setCurrentYear(newYear);
        setCurrentMonth(newMonth);
        loadData(newYear, newMonth);
        if (isConfigured && auth?.currentUser) {
            setupRealtimeListener(newYear, newMonth);
        }
    };

    const handleTogglePaid = (id: string, paid: boolean, type?: TransactionType) => {
        if (!monthData) return;
        const newData = { ...monthData };
        
        let amountDiff = 0;
        let foundType: TransactionType = type || 'expenses';

        const checkAndUpdate = (listKey: TransactionType) => {
            let changed = false;
            newData[listKey] = (newData[listKey] || []).map(t => {
                if (t.id === id) {
                    if (t.paid !== paid) {
                        amountDiff = t.amount;
                    }
                    changed = true;
                    foundType = listKey;
                    return { ...t, paid, paidAt: paid ? (t.paidAt || new Date().toISOString()) : null, userModifiedPaid: true };
                }
                return t;
            });
            return changed;
        };

        if (type && checkAndUpdate(type)) {
            // Updated in preferred list
        } else {
            if (!checkAndUpdate('expenses')) {
                if (!checkAndUpdate('avulsosItems')) {
                    checkAndUpdate('incomes');
                }
            }
        }

        // Modify Santander balance!
        if (amountDiff !== 0) {
            const currentSantander = newData.bankReserves?.santander ?? 0;
            let newSantander = currentSantander;
            if (foundType === 'expenses' || foundType === 'avulsosItems') {
                newSantander = paid ? (currentSantander - amountDiff) : (currentSantander + amountDiff);
            } else if (foundType === 'incomes') {
                newSantander = paid ? (currentSantander + amountDiff) : (currentSantander - amountDiff);
            }
            
            newData.bankReserves = {
                ...newData.bankReserves,
                santander: Math.round(newSantander * 100) / 100
            };
        }
        
        saveData(newData, currentYear, currentMonth);
    };

    const handleToggleGroupPaid = (items: Transaction[]) => {
        if (!monthData) return;
        const allPaid = items.every(i => i.paid);
        const newData = { ...monthData };
        const itemIds = new Set(items.map(i => i.id));
        
        let totalDiff = 0;
        items.forEach(i => {
            if (i.paid === allPaid) { // State will flip to !allPaid
                totalDiff += i.amount;
            }
        });
        
        const updateItem = (e: Transaction) => itemIds.has(e.id) ? { ...e, paid: !allPaid, paidAt: !allPaid ? (e.paidAt || new Date().toISOString()) : null, userModifiedPaid: true } : e;

        newData.expenses = (newData.expenses || []).map(updateItem);
        newData.avulsosItems = (newData.avulsosItems || []).map(updateItem);
        
        // Update Santander balance!
        const currentSantander = newData.bankReserves?.santander ?? 0;
        let newSantander = currentSantander;
        if (!allPaid) {
            newSantander -= totalDiff; // Marked as paid
        } else {
            newSantander += totalDiff; // Marked as unpaid
        }
        
        newData.bankReserves = {
            ...newData.bankReserves,
            santander: Math.round(newSantander * 100) / 100
        };

        saveData(newData, currentYear, currentMonth);
    };

    const handleEditTransaction = (t: Transaction) => {
        setEditingTransaction(t);
        setIsEditModalOpen(true);
    };

    const handleSaveTransaction = (updated: Transaction, type?: TransactionType) => {
        if (!monthData) return;
        const newData = { ...monthData };
        
        let found = false;
        const targetType = type || transactionListType;
        
        // Ensure manual edits mark userModifiedPaid if they explicitly deal with payments
        const finalUpdated = { ...updated, userModifiedPaid: true };

        // Helper to check and update
        let oldTx: Transaction | null = null;
        const tryUpdate = (listName: TransactionType) => {
            const index = newData[listName].findIndex(t => t.id === finalUpdated.id);
            if (index !== -1) {
                oldTx = newData[listName][index];
                newData[listName][index] = finalUpdated;
                return true;
            }
            return false;
        };

        if (tryUpdate('incomes')) found = true;
        else if (tryUpdate('expenses')) found = true;
        else if (tryUpdate('avulsosItems')) found = true;

        const currentSantander = newData.bankReserves?.santander ?? 0;
        let newSantander = currentSantander;

        if (!found) {
            // New transaction
            newData[targetType] = [finalUpdated, ...newData[targetType]];
            if (finalUpdated.paid) {
                if (targetType === 'expenses' || targetType === 'avulsosItems') {
                    newSantander -= finalUpdated.amount;
                } else if (targetType === 'incomes') {
                    newSantander += finalUpdated.amount;
                }
            }
        } else if (oldTx) {
            // Transaction was edited. Adjust Santander based on differences in paid status and/or amount!
            const oldT = oldTx as Transaction;
            
            // Reverse old transaction's effect if it was paid
            if (oldT.paid) {
                if (targetType === 'expenses' || targetType === 'avulsosItems') {
                    newSantander += oldT.amount;
                } else if (targetType === 'incomes') {
                    newSantander -= oldT.amount;
                }
            }
            
            // Apply new transaction's effect if it is paid
            if (finalUpdated.paid) {
                if (targetType === 'expenses' || targetType === 'avulsosItems') {
                    newSantander -= finalUpdated.amount;
                } else if (targetType === 'incomes') {
                    newSantander += finalUpdated.amount;
                }
            }
        }

        newData.bankReserves = {
            ...newData.bankReserves,
            santander: Math.round(newSantander * 100) / 100
        };
        
        saveData(newData, currentYear, currentMonth);
        setIsEditModalOpen(false);
    };

    const handleAddNewTransaction = () => {
        const newT: Transaction = {
            id: `manual_${Date.now()}`,
            description: 'Nova Transação',
            amount: 0,
            category: 'Outros',
            paid: false,
            dueDate: `${currentYear}-${currentMonth.toString().padStart(2,'0')}-15`,
            group: transactionListType === 'expenses' ? 'Despesas Fixas' : null
        };
        handleEditTransaction(newT);
    };

    const filteredTransactions = useMemo(() => {
        if (!monthData) return [];
        let list = [...monthData[transactionListType]];
        if (transactionListType === 'expenses' || transactionListType === 'avulsosItems') {
            list.sort((a, b) => a.description.localeCompare(b.description, 'pt-BR', { sensitivity: 'base' }));
        }
        if (filter.type === 'group') {
            list = list.filter(t => t.group === filter.value);
        } else if (filter.type === 'category') {
            list = list.filter(t => t.category === filter.value);
        }
        return list;
    }, [monthData, transactionListType, filter]);

    const handleFilter = (type: 'group' | 'category' | 'none', value: string) => {
        setFilter({ type, value });
        setView('transactions');
        setTransactionListType('expenses');
    };

    // Stats Calculation
    const stats = useMemo(() => {
        if (!monthData) return { 
            salary: { total: 0, paid: 0 }, 
            combined: { total: 0, paid: 0 }, 
            realExpenses: { total: 0, paid: 0, unpaid: 0 },
            surplusRaw: 0
        };

        const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

        const isExcluded = (t: Transaction) => {
            if (t.skipped) return true;
            if (!t.isSuspended) return false;
            if (!t.suspendedUntil) return true; // Suspended indefinitely
            return currentMonthStr < t.suspendedUntil;
        };

        const salary = monthData.incomes.filter(i => i.category === 'Salário');
        const combined = monthData.incomes;
        
        // Filter out suspended transactions from totals
        const realExpenses = [
            ...monthData.expenses.filter(e => !isExcluded(e)),
            ...monthData.avulsosItems.filter(e => !isExcluded(e))
        ];

        const sum = (arr: Transaction[]) => arr.reduce((acc, t) => acc + Number(t.amount || 0), 0);
        const sumPaid = (arr: Transaction[]) => arr.filter(t => t.paid).reduce((acc, t) => acc + Number(t.amount || 0), 0);
        const sumUnpaid = (arr: Transaction[]) => arr.filter(t => !t.paid).reduce((acc, t) => acc + Number(t.amount || 0), 0);

        const surplusRaw = sum(combined) - sum(realExpenses);

        return {
            salary: { total: sum(salary), paid: sumPaid(salary) },
            combined: { total: sum(combined), paid: sumPaid(combined) },
            realExpenses: { total: sum(realExpenses), paid: sumPaid(realExpenses), unpaid: sumUnpaid(realExpenses) },
            surplusRaw
        };
    }, [monthData, currentYear, currentMonth]);

    const balance = (stats.combined.paid) - stats.realExpenses.paid;

    const latestDailyBalance = useMemo(() => {
        return (bankReserves.santander ?? 0) + (bankReserves.inter ?? 0) + (bankReserves.sofisa ?? 0);
    }, [bankReserves]);

    // O valor que fica girando para pagar as contas é o Santander (R$ 2997,96).
    // Sofisa é poupança protegida e não entra na conta de pagar coisas.
    const santanderGiro = bankReserves.santander ?? 0;

    // 5º item: O quanto to precisando para acabar de pagar = diferença do Santander para as contas não pagas
    const precisoParaQuitar = useMemo(() => {
        const diff = stats.realExpenses.unpaid - santanderGiro;
        return diff > 0 ? diff : 0;
    }, [stats.realExpenses.unpaid, santanderGiro]);

    // 6º item: Sobra Real = Santander - Contas Não Pagas (azul se >= 0, vermelho se < 0)
    const sobraReal = useMemo(() => {
        return santanderGiro - stats.realExpenses.unpaid;
    }, [santanderGiro, stats.realExpenses.unpaid]);

    // Group Debts by Person
    const groupedDebts = useMemo(() => {
        if (!monthData) return [];
        const groups: Record<string, { name: string, total: number, paidAmount: number, items: Transaction[] }> = {};
        
        // Include both expenses and avulsosItems in the grouping
        const allItems = [...monthData.expenses, ...monthData.avulsosItems].sort((a, b) => 
            a.description.localeCompare(b.description, 'pt-BR', { sensitivity: 'base' })
        );
        
        allItems.forEach(e => {
            const groupNormal = e.group ? e.group.toUpperCase() : '';
            const excludedGroups = ['MORADIA', 'DESPESAS FIXAS', 'DESPESAS VARIÁVEIS', 'DESPESAS VARIAVEIS'];
            
            if (groupNormal && !excludedGroups.includes(groupNormal) && !e.isDistribution) {
                const name = groupNormal;
                if (!groups[name]) groups[name] = { name, total: 0, paidAmount: 0, items: [] };
                groups[name].total += e.amount;
                if (e.paid) groups[name].paidAmount += e.amount;
                groups[name].items.push(e);
            }
        });

        return Object.values(groups).sort((a, b) => b.total - a.total);
    }, [monthData]);

    const getDebtColor = (name: string) => {
        if (name.includes('MORADIA')) return 'from-red-600 to-red-700';
        if (name.includes('MARCIA BRITO')) return 'from-orange-500 to-orange-600';
        if (name.includes('MARCIA BISPO')) return 'from-amber-500 to-amber-600';
        if (name.includes('CLAUDIO SILVA') || name.includes('CLÁUDIO SILVA') || name.includes('CLAUDIO') || name.includes('CLÁUDIO')) return 'from-purple-600 to-indigo-700';
        if (name.includes('LILI')) return 'from-yellow-400 to-yellow-500';
        if (name.includes('REBECCA')) return 'from-emerald-500 to-emerald-600';
        if (name.includes('IAGO')) return 'from-emerald-800 to-emerald-950';
        if (name.includes('JADY')) return 'from-blue-800 to-indigo-950';
        if (name.includes('DÍVIDAS NA RUA') || name.includes('DIVIDAS NA RUA')) return 'from-sky-400 to-sky-600';
        return 'from-slate-700 to-slate-900';
    };

    // Próximas 3 contas a vencer nos próximos 7 dias para a tela de Visão Geral (Planejamento Imediato)
    const upcomingSevenDaysBills = useMemo(() => {
        if (!monthData) return [];

        const now = new Date();
        const isCurrentCalendarMonth = (currentYear === now.getFullYear() && currentMonth === (now.getMonth() + 1));
        const refDate = isCurrentCalendarMonth
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
            : new Date(currentYear, currentMonth - 1, 1);
        refDate.setHours(0, 0, 0, 0);

        const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
        const isExcluded = (t: Transaction) => {
            if (t.skipped) return true;
            if (!t.isSuspended) return false;
            if (!t.suspendedUntil) return true;
            return currentMonthStr < t.suspendedUntil;
        };

        const unpaid = [
            ...(monthData.expenses || []),
            ...(monthData.avulsosItems || [])
        ].filter(t => !t.paid && !isExcluded(t) && (t.dueDate || t.date));

        const mapped = unpaid.map(t => {
            const rawDate = (t.dueDate || t.date)!;
            const parts = rawDate.split('-').map(Number);
            const billDate = new Date(parts[0], parts[1] - 1, parts[2]);
            billDate.setHours(0, 0, 0, 0);
            const diffMs = billDate.getTime() - refDate.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            return {
                ...t,
                parsedDate: billDate,
                diffDays,
                displayDay: parts[2],
                displayMonth: parts[1]
            };
        });

        // Contas nos próximos 7 dias (0 <= diffDays <= 7)
        const inWindow = mapped.filter(b => b.diffDays >= 0 && b.diffDays <= 7);

        inWindow.sort((a, b) => {
            if (a.diffDays !== b.diffDays) return a.diffDays - b.diffDays;
            return b.amount - a.amount;
        });

        return inWindow.slice(0, 3);
    }, [monthData, currentYear, currentMonth]);

    const totalUpcomingSevenDays = useMemo(() => {
        return upcomingSevenDaysBills.reduce((acc, b) => acc + (b.amount || 0), 0);
    }, [upcomingSevenDaysBills]);

    const sidebarAccounts = monthData?.bankAccounts || [];

    if (!monthData) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-black text-slate-400 animate-pulse">Carregando Finanças...</div>;

    const getTabStyle = (type: TransactionType) => {
        if (transactionListType !== type) return 'text-slate-400 border-transparent';
        switch(type) {
            case 'incomes': return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm';
            case 'expenses': return 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm';
            case 'avulsosItems': return 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm';
            default: return 'bg-teal-50 text-teal-600';
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#f0fdf4] text-slate-900 font-sans overflow-hidden">
            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 lg:h-20 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around px-4 lg:px-8 z-[100] shadow-[0_-8px_30px_rgb(0,0,0,0.04)] max-w-lg mx-auto md:max-w-none">
                <button 
                    onClick={() => { setView('home'); setActiveTab('overview'); }}
                    className={`flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 px-6 py-2 rounded-2xl transition-all font-black ${view === 'home' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <HomeIcon size={20} className="lg:w-5 lg:h-5" />
                    <span className="text-[10px] lg:text-sm uppercase tracking-wider">Visão</span>
                </button>
                <button 
                    onClick={() => { setView('transactions'); }}
                    className={`flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 px-6 py-2 rounded-2xl transition-all font-black ${view === 'transactions' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <ShoppingBag size={20} className="lg:w-5 lg:h-5" />
                    <span className="text-[10px] lg:text-sm uppercase tracking-wider">Extrato</span>
                </button>
                <button 
                    onClick={() => { setView('savings'); }}
                    className={`flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 px-6 py-2 rounded-2xl transition-all font-black ${view === 'savings' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <PiggyBank size={20} className="lg:w-5 lg:h-5" />
                    <span className="text-[10px] lg:text-sm uppercase tracking-wider">Poupar</span>
                </button>
            </nav>

            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-100/30 blur-[120px] rounded-full -z-10"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/30 blur-[100px] rounded-full -z-10"></div>


                <Sidebar 
                    isOpen={sidebarOpen} 
                    onClose={() => setSidebarOpen(false)} 
                    accounts={sidebarAccounts} 
                    syncStatus={syncStatus}
                    onSync={() => saveData(monthData, currentYear, currentMonth)}
                    currentView={view}
                    onNavigate={setView}
                    onInstall={handleInstallClick}
                    canInstall={!!deferredPrompt}
                />

                <EditTransactionModal 
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    transaction={editingTransaction}
                    onSave={handleSaveTransaction}
                />

                {showSecurityMessage && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center gap-6">
                            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-inner">
                                <FileWarning size={40} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Segurança de Dados</h3>
                                <p className="text-base font-black text-slate-500 leading-relaxed">
                                    Por diretriz de segurança inabalável, a exclusão de contas e transações foi desativada. Seus dados estão protegidos e permanecerão no backup do sistema e na nuvem para sempre.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowSecurityMessage(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto pb-20 scroll-smooth relative">
                    <Header 
                        month={currentMonth}
                        year={currentYear}
                        balance={balance}
                        bankReserves={bankReserves}
                        setBankReserves={handleUpdateReserves}
                        checkInDate={checkIn.date}
                        onMonthChange={handleMonthChange}
                        onSync={() => monthData && saveData(monthData, currentYear, currentMonth)}
                        syncStatus={syncStatus}
                        hideBankReserves={view === 'transactions'}
                    />

                    <AnimatePresence mode="wait">
                        {view === 'home' && (
                            <motion.div 
                                key="home"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="w-full flex flex-col gap-8 px-4 lg:px-8 pb-8"
                            >
                                
                                {/* Dashboard Header Tabs - Mobile Only */}
                                <div className="lg:hidden flex p-1 bg-white rounded-2xl shadow-sm border border-slate-100 mb-2">
                                    <button 
                                        onClick={() => setActiveTab('overview')}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                                    >
                                        Visão Geral
                                    </button>
                                    <button 
                                        onClick={() => setView('transactions')}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide text-slate-400"
                                    >
                                        Gastos
                                    </button>
                                </div>

                                {activeTab === 'overview' && (
                                    <>
                                        {/* BALANCE OVERVIEW CARD - SAÚDE FINANCEIRA */}
                                        <div className="bg-slate-900 rounded-3xl lg:rounded-[2.5rem] p-4 lg:p-7 text-white shadow-2xl shadow-slate-950/30 border border-slate-800 mb-6 lg:mb-8 relative overflow-hidden group">
                                            <div className={`absolute -top-24 -right-24 w-80 h-80 ${sobraReal >= 0 ? 'bg-sky-500/10' : 'bg-rose-500/10'} blur-[100px] rounded-full pointer-events-none`}></div>
                                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                                            
                                            <div className="relative z-10">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 lg:mb-6 pb-4 border-b border-white/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-3 bg-white/10 backdrop-blur-md text-white rounded-2xl border border-white/10 shadow-inner">
                                                            <TrendingUp size={24} className="text-emerald-400" strokeWidth={3} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-xl lg:text-3xl font-black tracking-tight text-white">Saúde Financeira</h3>
                                                                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                                                                    Fluxo Real
                                                                </span>
                                                            </div>
                                                            <p className="text-xs sm:text-sm font-bold text-slate-300 mt-1">
                                                                Giro no Santander: <strong className="text-emerald-400 font-black">{formatCurrency(bankReserves.santander)}</strong> • Poupança Sofisa: <strong className="text-teal-300 font-black">{formatCurrency(bankReserves.sofisa)}</strong> (protegida)
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                                        <span className={`text-xs sm:text-sm font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border shadow-sm ${
                                                            sobraReal >= 0 
                                                                ? 'bg-sky-500/20 border-sky-400/40 text-sky-200' 
                                                                : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
                                                        }`}>
                                                            {sobraReal >= 0 ? '✓ Sobra Real Positiva' : '⚠️ Déficit em Conta'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* 6 ITENS DA SAÚDE FINANCEIRA */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
                                                    {/* 1º ITEM EM VERDE: Entradas (Soma dos Salários) */}
                                                    <div 
                                                        onClick={() => {
                                                            setView('transactions');
                                                            setTransactionListType('incomes');
                                                        }}
                                                        className="bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group/stat shadow-md"
                                                    >
                                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-sm"></span>
                                                                1. Entradas (Salários)
                                                            </span>
                                                            <ArrowRight size={14} className="text-emerald-400 opacity-0 group-hover/stat:opacity-100 transition-all -translate-x-1 group-hover/stat:translate-x-0" />
                                                        </div>
                                                        <div className="my-1.5">
                                                            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                                                                {formatCurrency(stats.combined.total)}
                                                            </span>
                                                        </div>
                                                        <div className="pt-2.5 border-t border-emerald-500/25 text-xs font-bold text-emerald-200/80 flex items-center justify-between">
                                                            <span>Soma salários</span>
                                                            <span className="text-emerald-300 font-black uppercase text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">Congelado</span>
                                                        </div>
                                                    </div>

                                                    {/* 2º ITEM EM VERMELHO: As Despesas */}
                                                    <div 
                                                        onClick={() => {
                                                            setView('transactions');
                                                            setTransactionListType('expenses');
                                                        }}
                                                        className="bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group/stat shadow-md"
                                                    >
                                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0 shadow-sm"></span>
                                                                2. Despesas
                                                            </span>
                                                            <ArrowRight size={14} className="text-rose-400 opacity-0 group-hover/stat:opacity-100 transition-all -translate-x-1 group-hover/stat:translate-x-0" />
                                                        </div>
                                                        <div className="my-1.5">
                                                            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                                                                {formatCurrency(stats.realExpenses.total)}
                                                            </span>
                                                        </div>
                                                        <div className="pt-2.5 border-t border-rose-500/25 text-xs font-bold text-rose-200/80 flex items-center justify-between">
                                                            <span>Total de contas</span>
                                                            <span className="text-rose-300 font-black">{Math.round((stats.realExpenses.total / (stats.combined.total || 1)) * 100)}% da renda</span>
                                                        </div>
                                                    </div>

                                                    {/* 3º ITEM EM AZUL: Contas que já paguei */}
                                                    <div 
                                                        onClick={() => {
                                                            setView('transactions');
                                                            setTransactionListType('expenses');
                                                        }}
                                                        className="bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group/stat shadow-md"
                                                    >
                                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 shadow-sm"></span>
                                                                3. Já Paguei
                                                            </span>
                                                            <ArrowRight size={14} className="text-sky-400 opacity-0 group-hover/stat:opacity-100 transition-all -translate-x-1 group-hover/stat:translate-x-0" />
                                                        </div>
                                                        <div className="my-1.5">
                                                            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                                                                {formatCurrency(stats.realExpenses.paid)}
                                                            </span>
                                                        </div>
                                                        <div className="pt-2.5 border-t border-sky-500/25 text-xs font-bold text-sky-200/80 flex items-center justify-between">
                                                            <span>Contas quitadas</span>
                                                            <span className="text-sky-300 font-black">{stats.realExpenses.total > 0 ? Math.round((stats.realExpenses.paid / stats.realExpenses.total) * 100) : 0}% pagas</span>
                                                        </div>
                                                    </div>

                                                    {/* 4º ITEM EM VERMELHO: Contas que ainda não paguei */}
                                                    <div 
                                                        onClick={() => {
                                                            setView('transactions');
                                                            setTransactionListType('expenses');
                                                        }}
                                                        className="bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group/stat shadow-md"
                                                    >
                                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0 shadow-sm"></span>
                                                                4. Não Paguei
                                                            </span>
                                                            <ArrowRight size={14} className="text-rose-400 opacity-0 group-hover/stat:opacity-100 transition-all -translate-x-1 group-hover/stat:translate-x-0" />
                                                        </div>
                                                        <div className="my-1.5">
                                                            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                                                                {formatCurrency(stats.realExpenses.unpaid)}
                                                            </span>
                                                        </div>
                                                        <div className="pt-2.5 border-t border-rose-500/25 text-xs font-bold text-rose-200/80 flex items-center justify-between">
                                                            <span>Contas pendentes</span>
                                                            <span className="text-rose-300 font-black">{stats.realExpenses.total > 0 ? Math.round((stats.realExpenses.unpaid / stats.realExpenses.total) * 100) : 0}% pendente</span>
                                                        </div>
                                                    </div>

                                                    {/* 5º ITEM: O quanto to precisando para acabar de pagar */}
                                                    <div 
                                                        className="bg-slate-800/95 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between shadow-md"
                                                    >
                                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-sm"></span>
                                                                5. Preciso p/ Quitar
                                                            </span>
                                                        </div>
                                                        <div className="my-1.5">
                                                            <span className={`text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm ${precisoParaQuitar > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                                                                {formatCurrency(precisoParaQuitar)}
                                                            </span>
                                                        </div>
                                                        <div className="pt-2.5 border-t border-white/10 text-xs font-bold text-slate-300 flex items-center justify-between">
                                                            <span>Santander vs Pendentes</span>
                                                            <span className={`font-black ${precisoParaQuitar > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                                                                {precisoParaQuitar > 0 ? 'Faltando' : 'Coberto'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 6º ITEM: Sobra Real (Azul se >= 0, Vermelho se < 0) */}
                                                    <div 
                                                        className={`rounded-2xl p-4 flex flex-col justify-between shadow-md border transition-all ${
                                                            sobraReal >= 0 
                                                                ? 'bg-sky-950/50 border-sky-500/40' 
                                                                : 'bg-rose-950/50 border-rose-500/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                                            <span className={`text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                                                sobraReal >= 0 ? 'text-sky-300' : 'text-rose-300'
                                                            }`}>
                                                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${sobraReal >= 0 ? 'bg-sky-400' : 'bg-rose-400'}`}></span>
                                                                6. Sobra Real
                                                            </span>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                                sobraReal >= 0 ? 'bg-sky-500/25 text-sky-200 border border-sky-500/30' : 'bg-rose-500/25 text-rose-200 border border-rose-500/30'
                                                            }`}>
                                                                {sobraReal >= 0 ? '> 0' : '< 0'}
                                                            </span>
                                                        </div>
                                                        <div className="my-1.5">
                                                            <span className={`text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm ${
                                                                sobraReal >= 0 ? 'text-sky-300' : 'text-rose-300'
                                                            }`}>
                                                                {formatCurrency(sobraReal)}
                                                            </span>
                                                        </div>
                                                        <div className={`pt-2.5 border-t text-xs font-bold flex items-center justify-between ${
                                                            sobraReal >= 0 ? 'border-sky-500/25 text-sky-200/80' : 'border-rose-500/25 text-rose-200/80'
                                                        }`}>
                                                            <span>Santander líquido</span>
                                                            <span className={`font-black ${sobraReal >= 0 ? 'text-sky-300' : 'text-rose-300'}`}>
                                                                {sobraReal >= 0 ? '+ Líquido' : '- Déficit'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* PRÓXIMAS 3 CONTAS A VENCER (PRÓXIMOS 7 DIAS) - PLANEJAMENTO IMEDIATO */}
                                        <div className="bg-white/45 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] p-4 lg:p-8 border border-white/60 shadow-xl shadow-slate-200/40 mb-6 lg:mb-8">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 lg:p-3 bg-amber-500/10 text-amber-600 rounded-2xl shadow-sm border border-amber-200/50">
                                                        <Clock size={22} className="lg:w-7 lg:h-7 text-amber-500" strokeWidth={2.5} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <h2 className="text-base lg:text-xl font-black text-slate-850 tracking-tight">Próximos Vencimentos (7 Dias)</h2>
                                                            <span className="text-[10px] lg:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 border border-amber-300/50">
                                                                Planejamento Imediato
                                                            </span>
                                                        </div>
                                                        <span className="text-xs lg:text-sm font-bold text-slate-400">
                                                            {upcomingSevenDaysBills.length > 0 
                                                                ? `As ${upcomingSevenDaysBills.length} próximas obrigações mais urgentes para você planejar seu caixa` 
                                                                : 'Nenhuma conta a vencer nesta semana'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {upcomingSevenDaysBills.length > 0 && (
                                                    <div className="flex items-center gap-2 self-start sm:self-auto bg-white/85 border border-slate-200/80 px-3.5 py-2 rounded-2xl shadow-sm">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Imediato:</span>
                                                        <span className="text-sm lg:text-base font-black text-slate-900 tracking-tight">
                                                            {formatCurrency(totalUpcomingSevenDays)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {upcomingSevenDaysBills.length > 0 ? (
                                                <>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-4 mb-4">
                                                        {upcomingSevenDaysBills.map((bill) => {
                                                            const isDueToday = bill.diffDays === 0;
                                                            const isDueTomorrow = bill.diffDays === 1;

                                                            return (
                                                                <div 
                                                                    key={bill.id} 
                                                                    onClick={() => handleEditTransaction(bill)}
                                                                    className={`bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group relative overflow-hidden ${
                                                                        isDueToday 
                                                                            ? 'border-rose-300 ring-2 ring-rose-400/20' 
                                                                            : isDueTomorrow 
                                                                                ? 'border-amber-300' 
                                                                                : 'border-slate-100'
                                                                    }`}
                                                                >
                                                                    {/* Top row: Urgency badge and due date */}
                                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                                        <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                                                                            isDueToday
                                                                                ? 'bg-rose-500/15 text-rose-700 border border-rose-300/50'
                                                                                : isDueTomorrow
                                                                                    ? 'bg-amber-500/15 text-amber-800 border border-amber-300/50'
                                                                                    : 'bg-sky-500/10 text-sky-800 border border-sky-200'
                                                                        }`}>
                                                                            <span className={`w-2 h-2 rounded-full ${
                                                                                isDueToday ? 'bg-rose-500 animate-pulse' : isDueTomorrow ? 'bg-amber-500' : 'bg-sky-500'
                                                                            }`}></span>
                                                                            {isDueToday ? 'Vence Hoje' : isDueTomorrow ? 'Vence Amanhã' : `Em ${bill.diffDays} dias`}
                                                                        </span>

                                                                        <div className="flex items-center gap-1 text-xs font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                                                            <Calendar size={13} className="text-slate-400" />
                                                                            <span>{String(bill.displayDay).padStart(2, '0')}/{String(bill.displayMonth).padStart(2, '0')}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Middle: Description, category, installments */}
                                                                    <div className="mb-4">
                                                                        <h3 className="text-base font-black text-slate-850 tracking-tight line-clamp-1 group-hover:text-slate-950 transition-colors">
                                                                            {bill.description}
                                                                        </h3>

                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                                            {bill.group && (
                                                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                                                                                    {bill.group}
                                                                                </span>
                                                                            )}
                                                                            {bill.installments && (
                                                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                                                                                    {bill.installments.current}/{bill.installments.total}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-50 text-slate-500">
                                                                                {bill.category}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Bottom: Amount and Quick Pay Button */}
                                                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor</span>
                                                                            <span className="text-lg lg:text-xl font-black text-slate-900 tracking-tight">
                                                                                {formatCurrency(bill.amount)}
                                                                            </span>
                                                                        </div>

                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleTogglePaid(bill.id, true, 'expenses');
                                                                            }}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm shadow-emerald-500/20"
                                                                            title="Marcar como Pago"
                                                                        >
                                                                            <Check size={14} strokeWidth={3} />
                                                                            <span>Pagar</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Reassuring Planning Footer Bar */}
                                                    <div className="bg-white/80 rounded-2xl p-3.5 lg:p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${santanderGiro >= totalUpcomingSevenDays ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                            <p className="text-xs sm:text-sm font-bold text-slate-600">
                                                                {santanderGiro >= totalUpcomingSevenDays ? (
                                                                    <>
                                                                        O giro do Santander (<strong className="text-emerald-600 font-black">{formatCurrency(santanderGiro)}</strong>) cobre com folga as contas dos próximos 7 dias, restando <strong className="text-slate-900 font-black">{formatCurrency(santanderGiro - totalUpcomingSevenDays)}</strong>.
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        Atenção: O giro do Santander (<strong className="text-amber-600 font-black">{formatCurrency(santanderGiro)}</strong>) não cobre todo o valor imediato. Faltam <strong className="text-rose-600 font-black">{formatCurrency(totalUpcomingSevenDays - santanderGiro)}</strong>.
                                                                    </>
                                                                )}
                            </p>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                setView('transactions');
                                                                setTransactionListType('expenses');
                                                            }}
                                                            className="text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors self-end sm:self-auto shrink-0"
                                                        >
                                                            <span>Ver todas as contas</span>
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="bg-white/80 rounded-2xl p-6 border border-emerald-100 flex items-center gap-4 text-slate-700">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                                                        <CheckCircle2 size={24} strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-850 text-sm lg:text-base">Nenhuma conta a vencer nos próximos 7 dias!</h4>
                                                        <p className="text-xs lg:text-sm text-slate-500 font-bold mt-0.5">
                                                            Todas as obrigações para esta semana já foram quitadas ou têm vencimento posterior. Planejamento financeiro imediato tranquilo.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* QUITAÇÃO DE DÍVIDAS EM ABERTO */}
                                        <div className="bg-white/45 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] p-4 lg:p-8 border border-white/60 shadow-xl shadow-slate-200/40 mb-6 lg:mb-8">
                                            <div className="flex items-center gap-3 mb-6 lg:mb-8">
                                                <div className="p-2.5 lg:p-3 bg-rose-50 text-rose-600 rounded-2xl shadow-sm">
                                                    <Wallet size={22} className="lg:w-7 lg:h-7" strokeWidth={3} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h2 className="text-base lg:text-xl font-black text-slate-850 tracking-tight">O que falta para quitar as Dívidas em Aberto?</h2>
                                                    <span className="text-xs lg:text-sm font-black text-slate-400 uppercase tracking-wide">
                                                        Demonstrativo Real baseando-se no saldo do Santander em giro
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-2">
                                                {/* Card 1: Open Debts */}
                                                <div className="bg-white rounded-2xl p-3.5 lg:p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                                                    <span className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-wider">Contas em Aberto</span>
                                                    <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight mt-1.5">
                                                        {formatCurrency(stats.realExpenses.unpaid)}
                                                    </span>
                                                    <span className="text-xs sm:text-sm mt-2 font-bold text-slate-400">
                                                        Total de boletos não pagos
                                                    </span>
                                                </div>

                                                {/* Card 2: Santander Giro */}
                                                <div className="bg-white rounded-2xl p-3.5 lg:p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                                                    <span className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-wider">Saldo em Giro (Santander)</span>
                                                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight mt-1.5">
                                                        {formatCurrency(bankReserves.santander)}
                                                    </span>
                                                    <span className="text-xs sm:text-sm mt-2 font-bold text-slate-400">
                                                        Em conta para pagamentos
                                                    </span>
                                                </div>

                                                {/* Card 3: Sofisa (Poupança protegida) */}
                                                <div className="bg-white rounded-2xl p-3.5 lg:p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                                                    <span className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-wider">Poupança Sofisa</span>
                                                    <span className="text-2xl sm:text-3xl font-black text-teal-600 tracking-tight mt-1.5">
                                                        {formatCurrency(bankReserves.sofisa)}
                                                    </span>
                                                    <span className="text-xs sm:text-sm mt-2 font-bold text-teal-700">
                                                        🛡️ Poupança protegida (não gira)
                                                    </span>
                                                </div>

                                                {/* Card 4: Missing Amount */}
                                                {(() => {
                                                    const isDeficit = precisoParaQuitar > 0;
                                                    
                                                    return (
                                                        <div className={`rounded-2xl p-3.5 lg:p-5 border shadow-sm flex flex-col justify-between ${
                                                            isDeficit 
                                                                ? 'bg-amber-50/80 border-amber-200 text-amber-950' 
                                                                : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                                        }`}>
                                                            <span className="text-xs sm:text-sm font-black uppercase tracking-wider opacity-80">
                                                                {isDeficit ? 'Quanto Ainda Preciso' : 'Saldo Suficiente'}
                                                            </span>
                                                            <span className="text-2xl sm:text-3xl font-black tracking-tight mt-1.5">
                                                                {isDeficit ? formatCurrency(precisoParaQuitar) : 'R$ 0,00'}
                                                            </span>
                                                            <span className="text-xs sm:text-sm mt-2 font-bold opacity-80">
                                                                {isDeficit 
                                                                    ? `Falta ${formatCurrency(precisoParaQuitar)} no Santander` 
                                                                    : 'Contas cobertas pelo Santander!'}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* EXPENSES BY CATEGORY CARD */}
                                        <div className="bg-white/45 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] p-4 lg:p-8 border border-white/60 shadow-xl shadow-slate-200/40 mb-6 lg:mb-8">
                                            <div className="flex items-center gap-3 mb-6 lg:mb-8">
                                                <div className="p-2.5 lg:p-3 bg-rose-50 text-rose-600 rounded-2xl shadow-sm">
                                                    <Users size={22} className="lg:w-7 lg:h-7" strokeWidth={3} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h2 className="text-base lg:text-xl font-black text-slate-850 tracking-tight">Despesas por Categoria</h2>
                                                    <span className="text-xs lg:text-sm font-black text-slate-500 uppercase tracking-wide">
                                                        Pendente: {formatCurrency(groupedDebts.reduce((acc, g) => acc + (g.total - g.paidAmount), 0))}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                                                {groupedDebts.map(group => (
                                                    <button key={group.name} onClick={() => handleFilter('group', group.name)} className="bg-white rounded-2xl lg:rounded-3xl p-3.5 lg:p-4 border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all w-full text-left">
                                                        <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
                                                            <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br ${getDebtColor(group.name)} text-white flex items-center justify-center shrink-0 shadow-lg shadow-slate-200/50`}>
                                                                <User size={22} strokeWidth={2.5} className="lg:w-6 lg:h-6" />
                                                            </div>
                                                            <div className="flex flex-col flex-1">
                                                                <span className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider">{group.name}</span>
                                                                <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                                                                    Falta: {formatCurrency(group.total - group.paidAmount)}
                                                                </span>
                                                                <div className="flex flex-col gap-1.5 mt-1.5 text-xs sm:text-sm font-bold w-full">
                                                                    <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                                                        <span>Pago:</span>
                                                                        <span className="font-black">{formatCurrency(group.paidAmount)}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                                        <span>Total:</span>
                                                                        <span className="font-black">{formatCurrency(group.total)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-2 lg:p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-rose-500 transition-colors shrink-0">
                                                            <ArrowRight size={18} className="lg:w-5 lg:h-5" />
                                                        </div>
                                                    </button>
                                                ))}
                                                {groupedDebts.length === 0 && (
                                                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-4">
                                                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                                                            <PiggyBank size={40} />
                                                        </div>
                                                        <span className="text-base font-black">Nenhuma dívida pendente com familiares!</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* CATEGORY OVERVIEW - Matching Screenshot 3 */}
                                        <div className="bg-white/45 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] p-5 lg:p-8 border border-white/60 shadow-xl shadow-slate-200/40">
                                            <div className="flex items-center gap-3 mb-6 lg:mb-8">
                                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                                                    <PiggyBank size={24} strokeWidth={3} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h2 className="text-base lg:text-xl font-black text-slate-850 tracking-tight">Categorização de Gastos</h2>
                                                    <span className="text-xs lg:text-sm font-black text-slate-500 uppercase tracking-wide">
                                                        Total: {formatCurrency(stats.realExpenses.total)}
                                                    </span>
                                                </div>
                                            </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {(() => {
                                                const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
                                                const isExcluded = (t: any) => {
                                                    if (t.skipped) return true;
                                                    if (!t.isSuspended) return false;
                                                    if (!t.suspendedUntil) return true;
                                                    return currentMonthStr < t.suspendedUntil;
                                                };
                                                const allExps = [
                                                    ...monthData.expenses.filter(e => !isExcluded(e)),
                                                    ...monthData.avulsosItems.filter(e => !isExcluded(e))
                                                ];
                                                const catsSet = new Set(
                                                    allExps
                                                        .map(e => e.category)
                                                        .filter(cat => cat && cat !== 'Jady' && cat !== 'Claudio Silva' && cat !== 'Claudio' && cat !== 'Cláudio')
                                                );
                                                const cats = Array.from(catsSet).sort();
                                                return cats.map(cat => {
                                                    const catExps = allExps.filter(e => e.category === cat || 
                                                        (cat === 'Jady' && ((e.group || '').toUpperCase().includes('JADY') || (e.description || '').toUpperCase().includes('(JADY)') || (e.category || '').toUpperCase() === 'JADY')) ||
                                                        (cat === 'Claudio Silva' && ((e.group || '').toUpperCase().includes('CLAUDIO') || (e.group || '').toUpperCase().includes('CLÁUDIO') || (e.description || '').toUpperCase().includes('CLAUDIO') || (e.description || '').toUpperCase().includes('CLÁUDIO') || (e.category || '').toUpperCase().includes('CLAUDIO') || (e.category || '').toUpperCase().includes('CLÁUDIO')))
                                                    );
                                                    const amount = catExps.reduce((s, e) => s + (e.amount || 0), 0);
                                                    const paidAmount = catExps.filter(e => e.paid).reduce((s, e) => s + (e.amount || 0), 0);
                                                    const pendingAmount = catExps.filter(e => !e.paid).reduce((s, e) => s + (e.amount || 0), 0);
                                                    
                                                    const totalExpenses = stats.realExpenses.total || 1;
                                                    const percent = Math.round((amount / totalExpenses) * 100);
                                                    
                                                    const getCatStyle = (c: string) => {
                                                        const cn = c.toUpperCase();
                                                        if (cn.includes('DÍVIDAS') || cn.includes('DIVIDAS') || cn.includes('EMPRÉSTIMOS') || cn.includes('EMPRESTIMOS')) return { bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', icon: Landmark };
                                                        if (cn.includes('JADY')) return { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', bar: 'bg-fuchsia-500', icon: CreditCard };
                                                        if (cn.includes('CLAUDIO') || cn.includes('CLÁUDIO')) return { bg: 'bg-purple-50', text: 'text-purple-600', bar: 'bg-purple-500', icon: CreditCard };
                                                        if (cn.includes('IAGO')) return { bg: 'bg-sky-50', text: 'text-sky-600', bar: 'bg-sky-500', icon: CreditCard };
                                                        if (c === 'Moradia') return { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500', icon: HomeIcon };
                                                        if (c === 'Lazer') return { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', icon: Palmtree };
                                                        if (c === 'Saúde') return { bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', icon: Heart };
                                                        if (c === 'Outros') return { bg: 'bg-slate-50', text: 'text-slate-600', bar: 'bg-slate-500', icon: Wallet };
                                                        if (c === 'Transporte') return { bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-500', icon: Car };
                                                        if (c === 'Educação') return { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', icon: GraduationCap };
                                                        if (c === 'Alimentação') return { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500', icon: ShoppingBag };
                                                        if (c === 'Estadias') return { bg: 'bg-cyan-50', text: 'text-cyan-600', bar: 'bg-cyan-500', icon: HomeIcon };
                                                        if (c === 'Viagens') return { bg: 'bg-sky-50', text: 'text-sky-600', bar: 'bg-sky-500', icon: Plane };
                                                        if (c === 'Roupas') return { bg: 'bg-indigo-50', text: 'text-indigo-600', bar: 'bg-indigo-500', icon: Shirt };
                                                        return { bg: 'bg-gray-50', text: 'text-gray-600', bar: 'bg-gray-500', icon: MoreHorizontal };
                                                    };
                                                    
                                                    const s = getCatStyle(cat);
                                                    const Icon = s.icon;

                                                    return (
                                                        <button key={cat} onClick={() => handleFilter('category', cat)} className="bg-white rounded-2xl lg:rounded-3xl p-3.5 lg:p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4 group hover:shadow-md transition-all overflow-hidden w-full text-left">
                                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl ${s.bg} ${s.text} flex items-center justify-center shrink-0`}>
                                                                    <Icon size={22} strokeWidth={2.5} className="lg:w-6 lg:h-6" />
                                                                </div>
                                                                 <div className="flex flex-col sm:hidden flex-1">
                                                                    <span className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider">{cat}</span>
                                                                    <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                                                        {formatCurrency(amount)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 flex flex-col gap-1 w-full">
                                                                <span className="hidden sm:inline text-xs sm:text-sm font-black text-slate-500 uppercase tracking-wider">{cat}</span>
                                                                <span className="hidden sm:inline text-base sm:text-lg lg:text-xl font-black text-slate-900 tracking-tight">
                                                                    {formatCurrency(amount)}
                                                                </span>
                                                                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                                                    <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${percent}%` }}></div>
                                                                </div>
                                                                
                                                                <div className="flex flex-col gap-1.5 mt-1.5 text-xs sm:text-sm font-bold w-full">
                                                                    <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                                                        <span>Pago:</span>
                                                                        <span className="font-black">{formatCurrency(paidAmount)}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                                                                        <span>Falta:</span>
                                                                        <span className="font-black">{formatCurrency(pendingAmount)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="relative w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center shrink-0 ml-auto sm:ml-2 mt-2 sm:mt-0">
                                                                <svg className="w-full h-full transform -rotate-90">
                                                                    <circle cx="50%" cy="50%" r="40%" fill="transparent" stroke="currentColor" strokeWidth="3.5" className="text-slate-100" />
                                                                    <circle cx="50%" cy="50%" r="40%" fill="transparent" stroke="currentColor" strokeWidth="3.5" strokeDasharray="100" strokeDashoffset={100 - percent} className={s.text} strokeLinecap="round" />
                                                                </svg>
                                                                <span className="absolute text-xs font-black text-slate-800">{percent}%</span>
                                                            </div>
                                                        </button>
                                                    );
                                                });
                                            })()}
                                        </div>
                                        </div>




                                    </>
                                )}
                            </motion.div>
                        )}

                        {view === 'statistics' && (
                            <motion.div
                                key="statistics"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="w-full flex flex-col gap-8 max-w-7xl mx-auto px-4 lg:px-8 pb-8"
                            >
                                <Statistics monthData={monthData} currentMonth={currentMonth} currentYear={currentYear} />
                            </motion.div>
                        )}

                        {view === 'flightPlan' && (
                            <motion.div
                                key="flightPlan"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="w-full flex flex-col gap-8 max-w-7xl mx-auto animate-slide-up px-4 lg:px-8 pb-8"
                            >
                                <FlightPlan monthData={monthData} />
                            </motion.div>
                        )}

                        {view === 'settlements' && (
                            <motion.div
                                key="settlements"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="w-full flex flex-col gap-8 max-w-7xl mx-auto px-4 lg:px-8 pb-8"
                            >
                                <Settlements 
                                    monthData={monthData} 
                                    onUpdateSettlements={handleUpdateSettlements} 
                                    onBack={() => setView('home')}
                                />
                            </motion.div>
                        )}

                        {view === 'savings' && (
                            <motion.div
                                key="savings"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="w-full flex flex-col gap-8 max-w-7xl mx-auto px-4 lg:px-8 pb-8"
                            >
                                <SavingsPlanner monthData={monthData} currencyFormatter={formatCurrency} onUpdateReserves={handleUpdateReserves} />
                            </motion.div>
                        )}

                        {view === 'transactions' && (
                            <motion.div 
                                key="transactions"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="w-full flex flex-col gap-5 pb-8"
                            >
                                <div className="sticky top-0 z-20 pt-3 pb-3 bg-[#f0fdf4] backdrop-blur-md border-b border-emerald-900/5 px-0">
                                    <div className="flex p-1.5 bg-white border-y border-slate-100 shadow-md">
                                        {(['incomes', 'expenses', 'avulsosItems'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    setTransactionListType(type);
                                                    setFilter({ type: 'none', value: '' });
                                                }}
                                                className={`flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${getTabStyle(type)}`}
                                            >
                                                {type === 'incomes' ? `Entradas (${formatCurrency(stats.combined.total)})` : 
                                                 type === 'expenses' ? `Despesas (${formatCurrency(stats.realExpenses.total)})` :
                                                 `Avulsos (${formatCurrency(monthData?.avulsosItems?.reduce((acc, i) => acc + (i.amount || 0), 0) || 0)})`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <TransactionList 
                                    transactions={filteredTransactions}
                                    onTogglePaid={(id, paid) => handleTogglePaid(id, paid, transactionListType)}
                                    onEdit={handleEditTransaction}
                                    onUpdate={(updated) => handleSaveTransaction(updated, transactionListType)}
                                    currentMonth={currentMonth}
                                    currentYear={currentYear}
                                />
                            </motion.div>
                        )}


                    </AnimatePresence>
                </main>

                {/* Floating Action Button (FAB) moved up for mobile navigation */}
                <button 
                    onClick={handleAddNewTransaction}
                    className="fixed bottom-20 lg:bottom-24 right-5 w-14 h-14 lg:w-16 lg:h-16 bg-slate-900 text-white rounded-[1.2rem] lg:rounded-[1.5rem] shadow-2xl shadow-slate-900/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 group"
                >
                    <Plus size={28} strokeWidth={3} className="lg:w-8 lg:h-8 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
};

export default App;
