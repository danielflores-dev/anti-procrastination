import { createContext, useContext, useState } from 'react';

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
  toggleTaskStep: (taskId: string, stepId: string) => void;
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

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks(prev => [...prev, {
      ...task,
      progress: task.progress ?? 'Not started',
      steps: task.steps ?? generateAssignmentSteps(task),
      studyPlan: task.studyPlan ?? generateStudyPlan(task),
      id: Date.now().toString(),
    }]);
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
    <TaskContext.Provider value={{ tasks, sessions, addTask, deleteTask, addStudySession, updateProgress, toggleTaskStep, updateHoursPerDay, updateEstimatedHours }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  return useContext(TaskContext);
}

export { computeHoursPerDay, generateAssignmentSteps, generateStudyPlan };
