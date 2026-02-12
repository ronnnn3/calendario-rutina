
import React from 'react';

export type RoutineType = 'A' | 'B' | 'C';

export interface Task {
  id: string;
  time: string;
  task: string;
  icon: React.ReactNode;
}

export interface DayDetails {
  type: RoutineType;
  title: string;
  weekNum: number;
  dayIndex: number;
}

export interface CompletedTasks {
  [dateKey: string]: {
    [taskId: string]: boolean;
  };
}

export type TabType = 'today' | 'diet' | 'calendar' | 'coach';