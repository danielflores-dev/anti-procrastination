import { createContext, useContext, useState } from 'react';

export type TaskProgress = 'Not started' | 'Working' | 'Almost done' | 'Done';

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
  createdAt: string;
};

type TaskContextType = {
  tasks: Task[];
  sessions: StudySession[];
  addTask: (task: Omit<Task, 'id'>) => void;
  deleteTask: (id: string) => void;
  addStudySession: (session: Omit<StudySession, 'id' | 'createdAt'>) => void;
  updateProgress: (id: string, progress: TaskProgress) => void;
  updateHoursPerDay: (id: string, hours: number) => void;
  updateEstimatedHours: (id: string, hours: number) => void;
};

const TaskContext = createContext<TaskContextType>({
  tasks: [],
  sessions: [],
  addTask: () => {},
  deleteTask: () => {},
  addStudySession: () => {},
  updateProgress: () => {},
  updateHoursPerDay: () => {},
  updateEstimatedHours: () => {},
});

function computeHoursPerDay(estimatedHours: number, dueDateRaw: string): number {
  const daysUntilDue = Math.max(1, Math.ceil(
    (new Date(dueDateRaw).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));
  return Math.max(0.5, Math.round((estimatedHours / daysUntilDue) * 2) / 2);
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks(prev => [...prev, { ...task, progress: task.progress ?? 'Not started', id: Date.now().toString() }]);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addStudySession = (session: Omit<StudySession, 'id' | 'createdAt'>) => {
    setSessions(prev => [{
      ...session,
      id: `session-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }, ...prev]);
  };

  const updateProgress = (id: string, progress: TaskProgress) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, progress } : t));
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
    <TaskContext.Provider value={{ tasks, sessions, addTask, deleteTask, addStudySession, updateProgress, updateHoursPerDay, updateEstimatedHours }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  return useContext(TaskContext);
}

export { computeHoursPerDay };
