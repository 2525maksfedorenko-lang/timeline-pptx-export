export interface TimelineItem {
  id: string;
  label: string;
  start: string; // ISO date
  end: string;
  progress?: number;
  group?: string;
  color?: string;
  dependencies?: string[];
  milestone?: boolean;
  parentId?: string;
  includeInExport?: boolean;
}

export interface Timeline {
  title: string;
  items: TimelineItem[];
  scale: 'days' | 'weeks' | 'months';
}
