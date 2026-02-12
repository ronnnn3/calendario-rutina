
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Utensils, 
  Dumbbell, 
  Bike, 
  Moon, 
  Droplets,
  ChevronRight,
  ChevronLeft,
  Info,
  Apple,
  Bell,
  AlertTriangle,
  Sparkles,
  Zap,
  Lightbulb,
  X
} from 'lucide-react';
import { DayDetails, CompletedTasks, TabType, Task, RoutineType } from './types';
import { getDailyCoachTip, getMealAlternative } from './services/geminiService';

const START_DATE = new Date(2026, 1, 11);
const TOTAL_DAYS = 84;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [completedTasks, setCompletedTasks] = useState<CompletedTasks>(() => {
    const saved = localStorage.getItem('fitlife_tasks');
    return saved ? JSON.parse(saved) : {};
  });
  const [coachTip, setCoachTip] = useState<string>('Cargando consejos...');
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  
  const [mealAlternatives, setMealAlternatives] = useState<{[key: string]: string}>({});
  const [loadingAlternatives, setLoadingAlternatives] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    localStorage.setItem('fitlife_tasks', JSON.stringify(completedTasks));
  }, [completedTasks]);

  const getDayDetails = useCallback((date: Date): DayDetails => {
    const dayOfWeek = date.getDay();
    const diffTime = date.getTime() - START_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNum = Math.floor(diffDays / 7) + 1;

    let type: RoutineType = 'B'; 
    let title = 'CrossFit + Definición';

    if (dayOfWeek === 1 || dayOfWeek === 5) {
      type = 'A';
      title = 'Pedal + CrossFit';
    } else if (dayOfWeek === 0) {
      type = 'C';
      title = 'Descanso Total';
    }

    return { type, title, weekNum, dayIndex: diffDays + 1 };
  }, []);

  const currentDay = useMemo(() => getDayDetails(selectedDate), [selectedDate, getDayDetails]);

  useEffect(() => {
    const fetchTip = async () => {
      setIsCoachLoading(true);
      const progress = (currentDay.dayIndex / TOTAL_DAYS) * 100;
      const tip = await getDailyCoachTip(currentDay.type, currentDay.weekNum, progress);
      setCoachTip(tip);
      setIsCoachLoading(false);
    };

    if (activeTab === 'coach' || activeTab === 'today') {
      fetchTip();
    }
  }, [currentDay.type, currentDay.weekNum, currentDay.dayIndex, activeTab]);

  const getTasks = (type: RoutineType): Task[] => {
    const common: Task[] = [
      { id: 'water_1', time: '04:30', task: '500ml Agua + Sal (Electrolitos)', icon: <Droplets className="w-4 h-4" /> },
      { id: 'creatine', time: '11:30', task: '5g Creatina (con agua)', icon: <Info className="w-4 h-4" /> },
      { id: 'crossfit', time: '12:00', task: 'CrossFit WOD', icon: <Dumbbell className="w-4 h-4" /> },
      { id: 'whey', time: '13:15', task: 'Batido Whey (Post-Entreno)', icon: <Droplets className="w-4 h-4" /> },
      { id: 'lunch', time: '13:45', task: 'Almuerzo: 250g Carne + 300g Carbo + Vitaminas', icon: <Utensils className="w-4 h-4" /> },
      { id: 'snack', time: '15:30', task: 'Lanche: Yogur Griego + Banana + Avena', icon: <Apple className="w-4 h-4" /> },
      { id: 'dinner', time: '20:30', task: 'Jantar: 200g Carne + 4 Huevos + Omega 3', icon: <Utensils className="w-4 h-4" /> },
      { id: 'magnesium', time: '21:30', task: 'Magnesio + Dormir (Inicio Ayuno)', icon: <Moon className="w-4 h-4" /> },
    ];

    if (type === 'A') {
      return [
        { id: 'pedal', time: '05:00', task: 'Pedal (2h30min en Ayunas)', icon: <Bike className="w-4 h-4" /> },
        { id: 'coffee', time: '07:30', task: 'Café Negro (Sin azúcar)', icon: <Clock className="w-4 h-4" /> },
        ...common.slice(1)
      ];
    }
    if (type === 'C') {
      return [
        { id: 'rest', time: 'Todo el día', task: 'Descanso. Recuperación muscular.', icon: <Moon className="w-4 h-4" /> },
        { id: 'creatine_rest', time: 'Mañana', task: '5g Creatina (No olvidar)', icon: <Info className="w-4 h-4" /> },
        { id: 'carbs_load', time: '20:30', task: 'Jantar con Carbos (Carga para el lunes)', icon: <Utensils className="w-4 h-4" /> },
      ];
    }
    
    const tasksB = [...common];
    tasksB[4] = { ...tasksB[4], task: 'Almuerzo: 200g Carne + 200g Carbo + Vitaminas' };
    tasksB[6] = { ...tasksB[6], task: 'Jantar Low Carb: 200g Carne + 4 Huevos (Sin arroz)' };
    return [
      { id: 'coffee_b', time: '07:30', task: 'Café Negro + Hidratación', icon: <Clock className="w-4 h-4" /> },
      ...tasksB.slice(1)
    ];
  };

  const handleSuggestAlternative = async (taskId: string, mealDesc: string) => {
    if (loadingAlternatives[taskId]) return;
    setLoadingAlternatives(prev => ({ ...prev, [taskId]: true }));
    const alt = await getMealAlternative(mealDesc, currentDay.type);
    setMealAlternatives(prev => ({ ...prev, [taskId]: alt }));
    setLoadingAlternatives(prev => ({ ...prev, [taskId]: false }));
  };

  const toggleTask = (taskId: string) => {
    const dateKey = selectedDate.toISOString().split('T')[0];
    setCompletedTasks(prev => {
      const dayTasks = prev[dateKey] || {};
      return {
        ...prev,
        [dateKey]: { ...dayTasks, [taskId]: !dayTasks[taskId] }
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32 selection:bg-blue-500/30">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-6 py-4 sticky top-0 z-40 touch-none">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
               <Zap className="text-white w-6 h-6 fill-current" />
             </div>
             <div>
                <h1 className="text-lg font-black tracking-tight text-white leading-none">FITLIFE 12</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  S{currentDay.weekNum} • Día {currentDay.dayIndex}/84
                </p>
             </div>
          </div>
          <button className="p-2.5 bg-slate-800/80 rounded-xl text-blue-400 border border-white/10 active:scale-95 transition-transform">
            <Bell className="w-5 h-5" />
          </button>
        </div>
        
        <div className="max-w-lg mx-auto mt-4">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-blue-600 to-emerald-400 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${Math.min(100, (currentDay.dayIndex / TOTAL_DAYS) * 100)}%` }}
            ></div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-3xl mb-6 border border-white/5 shadow-2xl backdrop-blur-sm">
          <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-3 text-slate-400 active:bg-slate-800 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <span className="block text-[10px] font-black uppercase text-blue-500 mb-0.5">
              {selectedDate.toLocaleDateString('es-ES', { weekday: 'short' })}
            </span>
            <span className="font-black text-xl text-white tracking-tight">
              {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-3 text-slate-400 active:bg-slate-800 rounded-full">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {activeTab === 'today' && (
          <div className="space-y-6">
            <div className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
              currentDay.type === 'A' ? 'bg-blue-600/10 border-blue-500/30' : 
              currentDay.type === 'B' ? 'bg-emerald-600/10 border-emerald-500/30' : 
              'bg-slate-900/50 border-white/5'
            }`}>
               <div className="flex items-center gap-5 relative z-10">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                   currentDay.type === 'A' ? 'bg-blue-500 text-white' : 
                   currentDay.type === 'B' ? 'bg-emerald-500 text-white' : 
                   'bg-slate-800 text-slate-400'
                 }`}>
                   {currentDay.type === 'A' ? <Bike size={28} /> : currentDay.type === 'B' ? <Dumbbell size={28} /> : <Moon size={28} />}
                 </div>
                 <div>
                   <h2 className="font-black text-xl text-white tracking-tight">Tipo {currentDay.type}</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{currentDay.title}</p>
                 </div>
               </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1">Checklist</h3>
              <div className="space-y-2.5">
                {getTasks(currentDay.type).map((item) => {
                  const dateKey = selectedDate.toISOString().split('T')[0];
                  const isDone = completedTasks[dateKey]?.[item.id];
                  const isMeal = ['lunch', 'dinner', 'snack'].includes(item.id);
                  const showAlt = mealAlternatives[item.id];
                  const isLoadingAlt = loadingAlternatives[item.id];

                  return (
                    <div key={item.id} className={`rounded-2xl border transition-all ${
                      isDone ? 'bg-slate-900/20 border-emerald-500/10 opacity-60' : 'bg-slate-900 border-white/5 shadow-md'
                    }`}>
                      <div onClick={() => toggleTask(item.id)} className="flex items-center gap-4 p-4 cursor-pointer active:bg-slate-800/50 rounded-2xl">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                          isDone ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-white/10 text-slate-400'
                        }`}>
                          {isDone ? <CheckCircle2 size={20} /> : item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[9px] font-black uppercase ${isDone ? 'text-emerald-500' : 'text-blue-500'}`}>{item.time}</span>
                          <div className={`font-bold text-sm leading-snug ${isDone ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                            {item.task}
                          </div>
                        </div>
                        {isMeal && !isDone && (
                          <button onClick={(e) => { e.stopPropagation(); handleSuggestAlternative(item.id, item.task); }} className="p-2 rounded-lg border border-blue-500/20 active:bg-blue-500/20">
                            <Sparkles className={`w-4 h-4 text-blue-400 ${isLoadingAlt ? 'animate-pulse' : ''}`} />
                          </button>
                        )}
                      </div>
                      {(showAlt || isLoadingAlt) && (
                        <div className="px-4 pb-4 animate-in slide-in-from-top-1">
                          <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 relative">
                             <div className="flex items-center gap-2 mb-1.5 text-[9px] font-black text-blue-400 uppercase">
                               <Lightbulb size={10} /> Tips AI
                             </div>
                             {isLoadingAlt ? <div className="h-2.5 bg-slate-800 rounded w-full animate-pulse" /> : <p className="text-[10px] text-slate-300 italic leading-relaxed">{showAlt}</p>}
                             <button onClick={() => setMealAlternatives(p => { const n={...p}; delete n[item.id]; return n; })} className="absolute top-1.5 right-1.5 text-slate-600"><X size={12} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Otras pestañas simplificadas para móvil */}
        {activeTab === 'coach' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center"><Sparkles className="text-white w-6 h-6" /></div>
                  <h3 className="text-lg font-black text-white">Coach AI</h3>
                </div>
                <div className="p-5 bg-slate-800/40 rounded-2xl border border-white/5">
                  <p className="text-slate-200 italic text-base">"{coachTip}"</p>
                </div>
                <button onClick={() => window.location.reload()} className="w-full mt-6 py-3.5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl active:scale-95 transition-transform">Refrescar</button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 px-4 pt-3 pb-safe-area flex justify-around items-center z-50 rounded-t-3xl shadow-2xl">
        <button onClick={() => setActiveTab('today')} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'today' ? 'text-blue-500 scale-105' : 'text-slate-500'}`}>
          <Calendar size={22} />
          <span className="text-[9px] font-black uppercase">Hoy</span>
        </button>
        <button onClick={() => setActiveTab('diet')} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'diet' ? 'text-blue-500 scale-105' : 'text-slate-500'}`}>
          <Utensils size={22} />
          <span className="text-[9px] font-black uppercase">Dieta</span>
        </button>
        <button onClick={() => setActiveTab('coach')} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'coach' ? 'text-blue-500 scale-105' : 'text-slate-500'}`}>
          <Sparkles size={22} />
          <span className="text-[9px] font-black uppercase">Coach</span>
        </button>
        <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'calendar' ? 'text-blue-500 scale-105' : 'text-slate-500'}`}>
          <CheckCircle2 size={22} />
          <span className="text-[9px] font-black uppercase">Meta</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
