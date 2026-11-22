import { BookOpen, ClipboardList, HandHelping, type LucideIcon } from 'lucide-react';

export type WorkspaceView = 'catalog' | 'lend' | 'history';

export interface WorkspaceNavConfig {
  id: WorkspaceView;
  icon: LucideIcon;
}

export const WORKSPACE_NAV_ITEMS: readonly WorkspaceNavConfig[] = [
  { id: 'catalog', icon: BookOpen },
  { id: 'lend', icon: HandHelping },
  { id: 'history', icon: ClipboardList },
] as const;
