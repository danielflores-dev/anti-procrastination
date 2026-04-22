import { createContext, useContext, useState } from 'react';

export type Task = {
  id: string;
  assignmentName: string;
  className: string;
  dueDate: string;
  dueDateRaw: string;       // ISO date string for calculations
  estimatedHours: number;
  hoursPerDay: number;      // user-adjustable daily commitment
};

type TaskContextType = {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id'>) => void;
  updateHoursPerDay: (id: string, hours: number) => void;
  updateEstimatedHours: (id: string, hours: number) => void;
};

const TaskContext = createContext<TaskContextType>({
  tasks: [],
  addTask: () => {},
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

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks(prev => [...prev, { ...task, id: Date.now().toString() }]);
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
    <TaskContext.Provider value={{ tasks, addTask, updateHoursPerDay, updateEstimatedHours }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  return useContext(TaskContext);
}

export { computeHoursPerDay };
