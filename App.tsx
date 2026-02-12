
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  BellOff,
  AlertTriangle,
  Sparkles,
  Zap,
  Lightbulb,
  X,
  ChefHat,
  Flame,
  Timer,
  Coffee,
  Egg,
  Volume2
} from 'lucide-react';
import { DayDetails, CompletedTasks, TabType, Task, RoutineType } from './types';
import { getDailyCoachTip, getMealAlternative, getRecipesByType } from './services/geminiService';

const START_DATE = new Date(2026, 1, 11);
const TOTAL_DAYS = 84;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [completedTasks, setCompletedTasks] = useState<CompletedTasks>(() => {
    const saved = localStorage.getItem('fitlife_tasks');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [coachTip, setCoachTip] = useState<string>('Cargando consejos...');
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  
  const [mealAlternatives, setMealAlternatives] = useState<{[key: string]: string}>({});
  const [loadingAlternatives, setLoadingAlternatives] = useState<{[key: string]: boolean}>({});

  const [dietRecipes, setDietRecipes] = useState<string | null>(null);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [selectedMealCategory, setSelectedMealCategory] = useState<string | null>(null);

  // Audio Alarm Logic
  const playAlarmSound = useCallback((frequency = 880, duration = 1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime); 
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + duration - 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio context not allowed yet", e);
    }
  }, []);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        playAlarmSound(1100, 0.3); // Confirm sound
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 3000);
        
        new Notification("FitLife 12", { 
          body: "¡Sistema de Alarmas Activo! Te avisaré a la hora exacta.", 
          icon: "https://cdn-icons-png.flaticon.com/512/2936/2936886.png" 
        });
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (notificationsEnabled) {
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateKey = now.toISOString().split('T')[0];
        const dayType = getDayDetails(now).type;
        const dailyTasks = getTasks(dayType);

        dailyTasks.forEach(task => {
          const taskKey = `${dateKey}-${task.id}`;
          if (task.time === timeStr && !notifiedTasks.has(taskKey)) {
            playAlarmSound();
            if (Notification.permission === 'granted') {
              new Notification(`¡Es hora de: ${task.task}!`, {
                body: `Hora programada: ${task.time}.`,
                icon: "https://cdn-icons-png.flaticon.com/512/2936/2936886.png"
              });
            }
            setNotifiedTasks(prev => new Set(prev).add(taskKey));
          }
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [notificationsEnabled, notifiedTasks, playAlarmSound]);

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
        { id: 'rest', time: '08:00', task: 'Descanso. Recuperación muscular.', icon: <Moon className="w-4 h-4" /> },
        { id: 'creatine_rest', time: '10:00', task: '5g Creatina (No olvidar)', icon: <Info className="w-4 h-4" /> },
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

  const handleGenerateRecipes = async (category: string) => {
    setIsGeneratingRecipes(true);
    setSelectedMealCategory(category);
    const recipes = await getRecipesByType(category, currentDay.type, currentDay.weekNum);
    setDietRecipes(recipes || "Error al cargar recetas.");
    setIsGeneratingRecipes(false);
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

  const mealCategories = [
    { id: 'Desayuno', label: 'Desayuno', icon: <Coffee size={20} />, color: 'orange' },
    { id: 'Almuerzo', label: 'Almuerzo', icon: <Utensils size={20} />, color: 'blue' },
    { id: 'Lanche', label: 'Snacks', icon: <Apple size={20} />, color: 'emerald' },
    { id: 'Jantar', label: 'Cena', icon: <Flame size={20} />, color: 'indigo' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32 selection:bg-blue-500/30">
      {/* Toast de Confirmación */}
      {showConfirmation && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Volume2 className="w-5 h-5 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">Alarmas Activadas</span>
        </div>
      )}

      <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 px-6 py-4 sticky top-0 z-40 touch-none">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
               <Zap className="text-white w-6 h-6 fill-current" />
             </div>
             <div>
                <h1 className="text-lg font-black tracking-tight text-white leading-none">FITLIFE 12</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    S{currentDay.weekNum} • D{currentDay.dayIndex}
                  </p>
                  <span className="text-[10px] text-blue-500 font-black px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                    {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
             </div>
          </div>
          <button 
            onClick={toggleNotifications}
            className={`p-2.5 rounded-xl border transition-all active:scale-95 flex items-center gap-2 ${notificationsEnabled ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'bg-slate-800/80 text-slate-500 border-white/10'}`}
          >
            {notificationsEnabled ? (
              <>
                <Bell className="w-5 h-5 animate-[ring_2s_infinite]" />
                <span className="text-[10px] font-black uppercase hidden sm:block">ON</span>
              </>
            ) : (
              <>
                <BellOff className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase hidden sm:block">OFF</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {(activeTab === 'today' || activeTab === 'calendar') && (
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
        )}

        {activeTab === 'today' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
              currentDay.type === 'A' ? 'bg-blue-600/10 border-blue-500/30 shadow-blue-500/5' : 
              currentDay.type === 'B' ? 'bg-emerald-600/10 border-emerald-500/30 shadow-emerald-500/5' : 
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
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Agenda del Día</h3>
                {notificationsEnabled ? (
                  <span className="text-[9px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border border-emerald-500/20">
                    <Timer size={10} /> Sistema Vigilante
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <BellOff size={10} /> Notificaciones Off
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {getTasks(currentDay.type).map((item) => {
                  const dateKey = selectedDate.toISOString().split('T')[0];
                  const isDone = completedTasks[dateKey]?.[item.id];
                  const isMeal = ['lunch', 'dinner', 'snack'].includes(item.id);
                  const showAlt = mealAlternatives[item.id];
                  const isLoadingAlt = loadingAlternatives[item.id];
                  const isIncoming = item.time === currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                  return (
                    <div key={item.id} className={`rounded-2xl border transition-all ${
                      isDone ? 'bg-slate-900/20 border-emerald-500/10 opacity-60' : isIncoming ? 'bg-blue-600/10 border-blue-500/50 shadow-blue-500/20 scale-[1.02]' : 'bg-slate-900 border-white/5 shadow-md'
                    }`}>
                      <div onClick={() => toggleTask(item.id)} className="flex items-center gap-4 p-4 cursor-pointer active:bg-slate-800/50 rounded-2xl">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                          isDone ? 'bg-emerald-600 border-emerald-500 text-white' : isIncoming ? 'bg-blue-600 border-blue-400 text-white animate-pulse' : 'bg-slate-800 border-white/10 text-slate-400'
                        }`}>
                          {isDone ? <CheckCircle2 size={20} /> : item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[9px] font-black uppercase ${isDone ? 'text-emerald-500' : isIncoming ? 'text-white' : 'text-blue-500'}`}>{item.time}</span>
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

        {activeTab === 'diet' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-gradient-to-br from-blue-600/20 to-indigo-900/10 p-6 rounded-3xl border border-blue-500/20">
               <div className="flex items-center gap-3 mb-2">
                 <ChefHat className="text-blue-400 w-6 h-6" />
                 <h2 className="text-xl font-black text-white">Chef AI: Ideas de Comida</h2>
               </div>
               <p className="text-xs text-slate-400 leading-relaxed">Genera variaciones de recetas basadas en tu rutina <span className="text-blue-400 font-bold">{currentDay.type}</span> de hoy.</p>
             </div>

             <div className="grid grid-cols-2 gap-3">
               {mealCategories.map((cat) => (
                 <button 
                   key={cat.id} 
                   onClick={() => handleGenerateRecipes(cat.id)}
                   className={`flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 ${
                     selectedMealCategory === cat.id ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-slate-900 border-white/5 text-slate-400'
                   }`}
                 >
                   <div className={`p-2 rounded-xl ${selectedMealCategory === cat.id ? 'bg-blue-500' : 'bg-slate-800'}`}>
                     {cat.icon}
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                 </button>
               ))}
             </div>

             {isGeneratingRecipes ? (
               <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center gap-4">
                  <ChefHat className="w-10 h-10 text-blue-500 animate-bounce" />
                  <p className="text-sm font-bold text-white uppercase">Cocinando ideas...</p>
               </div>
             ) : dietRecipes ? (
               <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase">
                      <Timer size={14} /> Sugerencias Listas
                    </div>
                    <button onClick={() => setDietRecipes(null)} className="text-slate-600"><X size={16} /></button>
                  </div>
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {dietRecipes}
                  </div>
                  <button onClick={() => handleGenerateRecipes(selectedMealCategory!)} className="w-full py-3 bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-300">
                    Ver más opciones
                  </button>
               </div>
             ) : (
               <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-3xl space-y-3">
                 <p className="text-sm font-bold text-slate-500">Selecciona una categoría para ver recetas personalizadas.</p>
               </div>
             )}
          </div>
        )}

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
                <button onClick={() => window.location.reload()} className="w-full mt-6 py-3.5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl active:scale-95 transition-transform">Refrescar Análisis</button>
             </div>
             
             {/* Estado del sistema en Coach para confirmar */}
             <div className={`p-6 rounded-3xl border flex items-center justify-between ${notificationsEnabled ? 'bg-emerald-600/10 border-emerald-500/20' : 'bg-slate-900 border-white/5'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${notificationsEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase">Estado Alertas</p>
                    <p className={`text-[10px] font-bold ${notificationsEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {notificationsEnabled ? 'Vigilancia Activa' : 'Desactivado'}
                    </p>
                  </div>
                </div>
                {!notificationsEnabled && (
                  <button onClick={toggleNotifications} className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg">Activar</button>
                )}
             </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-8 animate-in fade-in duration-300 pb-10">
             <div className="px-2 text-center">
               <h2 className="text-2xl font-black text-white tracking-tight">Tu Transformación</h2>
               <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Fase actual: {currentDay.weekNum <= 4 ? 'Adaptación' : 'Quema Máxima'}</p>
             </div>
             <div className="grid grid-cols-4 gap-3">
                {Array.from({length: 12}).map((_, i) => (
                  <div key={i} className={`p-4 rounded-2xl border text-center transition-all ${
                    currentDay.weekNum === i+1 ? 'bg-blue-600 border-blue-400 shadow-xl' : currentDay.weekNum > i+1 ? 'bg-emerald-900/10 border-emerald-500/20 opacity-50' : 'bg-slate-900 border-white/5'
                  }`}>
                    <div className="text-[8px] font-black uppercase opacity-60 mb-0.5">Sem</div>
                    <div className="text-xl font-black text-white">{i + 1}</div>
                  </div>
                ))}
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

      <style>{`
        @keyframes ring {
          0% { transform: rotate(0); }
          5% { transform: rotate(15deg); }
          10% { transform: rotate(-15deg); }
          15% { transform: rotate(15deg); }
          20% { transform: rotate(-15deg); }
          25% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
        .pb-safe-area {
          padding-bottom: calc(1rem + env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
};

export default App;
