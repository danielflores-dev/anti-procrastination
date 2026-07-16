import { cancelTaskReminders, scheduleTaskReminders } from '@/components/reminders';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const TASKS_KEY = 'antiprocrastination.tasks.v1';
const SESSIONS_KEY = 'antiprocrastination.sessions.v1';
const CITY_KEY = 'antiprocrastination.city.v1';

export type TaskProgress = 'Not started' | 'Working' | 'Almost done' | 'Done';

export type TaskStep = {
  id: string;
  title: string;
  done: boolean;
};

export type StudyPlanItem = {
  id: string;
  dateLabel: string;
  focus: string;
  minutes: number;
};

export type Task = {
  id: string;
  assignmentName: string;
  className: string;
  description: string;
  dueDate: string;
  dueDateRaw: string;       // ISO date string for calculations
  estimatedHours: number;
  hoursPerDay: number;      // user-adjustable daily commitment
  progress?: TaskProgress;
  steps?: TaskStep[];
  studyPlan?: StudyPlanItem[];
  notificationIds?: string[];
  /** Exam prep: focus sessions become a boss battle. */
  isExam?: boolean;
};

// A building earned by finishing an assignment. Never removed.
export type CityBuilding = {
  id: string;          // the task that earned it
  name: string;
  className: string;
  finishedAt: string;  // ISO date
  size: 1 | 2 | 3;     // height class from estimated hours
  seed: number;        // deterministic style variety
};

export type StudySession = {
  id: string;
  taskId?: string;
  assignmentName: string;
  className: string;
  focusedSeconds: number;
  coinsEarned: number;
  goalHours: number;
  progressPercent: number;
  coinMultiplier: number;
  partyRoom?: string;
  /** True when the user never left the app during the session. */
  flawless?: boolean;
  createdAt: string;
};

type TaskContextType = {
  tasks: Task[];
  sessions: StudySession[];
  city: CityBuilding[];
  addTask: (task: Omit<Task, 'id'>) => string;
  updateTask: (id: string, updates: Partial<Pick<Task, 'assignmentName' | 'className' | 'dueDate' | 'dueDateRaw' | 'estimatedHours' | 'isExam'>>) => void;
  deleteTask: (id: string) => void;
  addStudySession: (session: Omit<StudySession, 'id' | 'createdAt'>) => void;
  updateProgress: (id: string, progress: TaskProgress) => void;
  toggleTaskStep: (taskId: string, stepId: string) => void;
  updateHoursPerDay: (id: string, hours: number) => void;
  updateEstimatedHours: (id: string, hours: number) => void;
};

const TaskContext = createContext<TaskContextType>({
  tasks: [],
  sessions: [],
  city: [],
  addTask: () => '',
  updateTask: () => {},
  deleteTask: () => {},
  addStudySession: () => {},
  updateProgress: () => {},
  toggleTaskStep: () => {},
  updateHoursPerDay: () => {},
  updateEstimatedHours: () => {},
});

function computeHoursPerDay(estimatedHours: number, dueDateRaw: string): number {
  const daysUntilDue = Math.max(1, Math.ceil(
    (new Date(dueDateRaw).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));
  return Math.max(0.5, Math.round((estimatedHours / daysUntilDue) * 2) / 2);
}

function formatPlanDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (key(date) === key(today)) return 'Today';
  if (key(date) === key(tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function generateAssignmentSteps(task: Pick<Task, 'assignmentName' | 'description'>): TaskStep[] {
  const text = `${task.assignmentName} ${task.description}`.toLowerCase();
  const titles = text.includes('exam') || text.includes('test') || text.includes('midterm') || text.includes('final')
    ? ['Collect notes and study guide', 'Review weak topics', 'Practice questions', 'Final quick review']
    : text.includes('essay') || text.includes('paper') || text.includes('report')
      ? ['Gather sources', 'Make an outline', 'Write the draft', 'Revise and submit']
      : text.includes('project') || text.includes('presentation')
        ? ['Plan the work', 'Build the main pieces', 'Review with checklist', 'Polish and submit']
        : text.includes('read') || text.includes('chapter')
          ? ['Preview the material', 'Read and highlight', 'Take notes', 'Review key ideas']
          : ['Understand the prompt', 'Work through the main task', 'Check your answers', 'Submit or review'];

  return titles.map((title, index) => ({ id: `step-${index + 1}`, title, done: false }));
}

function generateStudyPlan(task: Pick<Task, 'assignmentName' | 'estimatedHours' | 'dueDateRaw'>): StudyPlanItem[] {
  const today = new Date();
  const due = new Date(task.dueDateRaw);
  const daysAvailable = Math.max(1, Math.ceil((due.getTime() - today.getTime()) / 86400000) + 1);
  const planDays = Math.min(5, daysAvailable);
  const totalMinutes = Math.max(30, Math.round(task.estimatedHours * 60));
  const minutes = Math.max(20, Math.ceil(totalMinutes / planDays / 5) * 5);

  return Array.from({ length: planDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const isLast = index === planDays - 1;
    return {
      id: `plan-${index + 1}`,
      dateLabel: formatPlanDate(date),
      minutes,
      focus: isLast ? `Final review for ${task.assignmentName}` : index === 0 ? 'Start with the easiest section' : 'Continue the next chunk',
    };
  });
}

/** Days until due; negative when overdue (no clamp). */
export function signedDaysUntil(dueDateRaw: string): number {
  return Math.ceil((new Date(dueDateRaw).getTime() - Date.now()) / 86400000);
}

export function sessionDateKey(dateRaw: string): string {
  const date = new Date(dateRaw);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Days in a row with at least one study session, counting shield-bridged days. */
export function getStudyStreak(sessions: StudySession[], bridgedDates: string[] = []): number {
  const studiedDays = new Set(sessions.map(session => sessionDateKey(session.createdAt)));
  bridgedDates.forEach(date => studiedDays.add(date));
  let streak = 0;
  const cursor = new Date();

  while (studiedDays.has(sessionDateKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildingFor(task: Task): CityBuilding {
  return {
    id: task.id,
    name: task.assignmentName,
    className: task.className,
    finishedAt: new Date().toISOString(),
    size: task.estimatedHours < 2 ? 1 : task.estimatedHours < 5 ? 2 : 3,
    seed: Math.floor(Math.random() * 1e9),
  };
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [city, setCity] = useState<CityBuilding[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load saved data once on startup.
  useEffect(() => {
    (async () => {
      try {
        const [savedTasks, savedSessions, savedCity] = await Promise.all([
          AsyncStorage.getItem(TASKS_KEY),
          AsyncStorage.getItem(SESSIONS_KEY),
          AsyncStorage.getItem(CITY_KEY),
        ]);
        if (savedTasks) setTasks(JSON.parse(savedTasks));
        if (savedSessions) setSessions(JSON.parse(savedSessions));
        if (savedCity) setCity(JSON.parse(savedCity));
      } catch {
        // Corrupt or unreadable storage: start fresh rather than crash.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist on every change after the initial load.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks)).catch(() => {});
  }, [tasks, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)).catch(() => {});
  }, [sessions, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CITY_KEY, JSON.stringify(city)).catch(() => {});
  }, [city, hydrated]);

  // Every task that reaches Done earns a permanent building, no matter which
  // path finished it (progress button, focus goal, steps). Deleting the task
  // later keeps the building: it was earned.
  useEffect(() => {
    if (!hydrated) return;
    const missing = tasks.filter(t => t.progress === 'Done' && !city.some(b => b.id === t.id));
    if (missing.length === 0) return;
    const additions = missing.map(buildingFor);
    setCity(prev => [...prev, ...additions.filter(a => !prev.some(b => b.id === a.id))]);
  }, [tasks, city, hydrated]);

  const addTask = (task: Omit<Task, 'id'>) => {
    const id = Date.now().toString();
    setTasks(prev => [...prev, {
      ...task,
      progress: task.progress ?? 'Not started',
      steps: task.steps ?? generateAssignmentSteps(task),
      studyPlan: task.studyPlan ?? generateStudyPlan(task),
      id,
    }]);
    // Schedule due-date reminders in the background and attach their ids.
    scheduleTaskReminders(task.assignmentName, task.className, task.dueDateRaw)
      .then(notificationIds => {
        if (notificationIds.length === 0) return;
        setTasks(prev => prev.map(t => t.id === id ? { ...t, notificationIds } : t));
      })
      .catch(() => {});
    return id;
  };

  const updateTask = (id: string, updates: Partial<Pick<Task, 'assignmentName' | 'className' | 'dueDate' | 'dueDateRaw' | 'estimatedHours' | 'isExam'>>) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;

    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = { ...t, ...updates };
      if (updates.estimatedHours !== undefined || updates.dueDateRaw !== undefined) {
        next.hoursPerDay = computeHoursPerDay(next.estimatedHours, next.dueDateRaw);
      }
      return next;
    }));

    // Old reminders point at the old name/date; replace them.
    cancelTaskReminders(target.notificationIds).catch(() => {});
    const merged = { ...target, ...updates };
    scheduleTaskReminders(merged.assignmentName, merged.className, merged.dueDateRaw)
      .then(notificationIds => {
        setTasks(prev => prev.map(t => t.id === id
          ? { ...t, notificationIds: notificationIds.length ? notificationIds : undefined }
          : t));
      })
      .catch(() => {});
  };

  const deleteTask = (id: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id);
      cancelTaskReminders(target?.notificationIds).catch(() => {});
      return prev.filter(t => t.id !== id);
    });
  };

  const addStudySession = (session: Omit<StudySession, 'id' | 'createdAt'>) => {
    setSessions(prev => [{
      ...session,
      id: `session-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }, ...prev]);
  };

  const updateProgress = (id: string, progress: TaskProgress) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      // A finished assignment no longer needs its reminders.
      if (progress === 'Done' && t.notificationIds?.length) {
        cancelTaskReminders(t.notificationIds).catch(() => {});
        return { ...t, progress, notificationIds: undefined };
      }
      return { ...t, progress };
    }));
  };

  const toggleTaskStep = (taskId: string, stepId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      const steps = (task.steps ?? generateAssignmentSteps(task)).map(step => (
        step.id === stepId ? { ...step, done: !step.done } : step
      ));
      const doneCount = steps.filter(step => step.done).length;
      const progress: TaskProgress = doneCount === steps.length
        ? 'Done'
        : doneCount >= Math.ceil(steps.length * 0.75)
          ? 'Almost done'
          : doneCount > 0
            ? 'Working'
            : 'Not started';
      return { ...task, steps, progress };
    }));
  };

  const updateHoursPerDay = (id: string, hours: number) => {
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, hoursPerDay: Math.max(0.5, hours) } : t)
    );
  };

  const updateEstimatedHours = (id: string, hours: number) => {
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, estimatedHours: Math.max(0.5, hours) } : t)
    );
  };

  return (
    <TaskContext.Provider value={{ tasks, sessions, city, addTask, updateTask, deleteTask, addStudySession, updateProgress, toggleTaskStep, updateHoursPerDay, updateEstimatedHours }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  return useContext(TaskContext);
}

export { computeHoursPerDay, generateAssignmentSteps, generateStudyPlan };
