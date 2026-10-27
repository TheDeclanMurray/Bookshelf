/**
 * types.ts
 * Shared types: the data model (Book, Room, Placed) and the props of the components that take them.
 */
import type { ReactNode, RefObject } from 'react';

export type Status = 'reading' | 'read' | 'dnf' | 'tbr';
export type Age = 'adult' | 'ya' | 'kids';

export interface Book {
  id: string;
  title: string;
  author: string;
  series: string;
  seriesNumber: number;
  seriesTotal: number;
  pages: number;
  genre: string;
  age: Age | string;
  status: Status | string;
  hue: number;
  spineSaturation?: number;  // 0-100, default 55
  spineLightness?: number;   // 0-100, default 42
  spineTextColor?: string;
  coverUrl?: string;
  summary: string;
  notes: string;
  rating: number;
  startedAt: string;
  finishedAt: string;
}

/** A book placed on a shelf, with its drawn size. */
export interface Placed { book: Book; thickness: number; height: number }

/** One screen of the swipe track: a bookcase or the reading room. */
export interface Room {
  id: string;
  kind: 'case' | 'reading' | string;
  title: string;
  theme: string;
  groupKey?: string;
  shelves?: Placed[][];
  bookCount?: number;
  caseIndex?: number;
  caseCount?: number;
  sortMode?: string;
  book?: Book | null;
}

export interface Viewport { w: number; h: number }

/** Where a tapped spine or stand book is on screen, so the stage can start the book there. */
export interface Launch {
  kind: 'shelf' | 'stand' | string;
  corners: number[][];
  rect: { cx: number; cy: number; w: number; h: number };
  rotateX?: number;
  rotateY?: number;
  thicknessPx?: number;
  designScale?: number;
  designW?: number;
  depthRatio?: number;
}

export type PickHandler = (book: Book, element: Element) => void;

export interface ScreenFrameProps { vp: Viewport; children?: ReactNode }
export interface SwipeTrackProps { count: number; index: number; onIndex: (i: number) => void; vp: Viewport; renderScreen: (i: number) => ReactNode }
export interface PagerProps { rooms: Room[]; index: number; onIndex: (i: number) => void; showHint: boolean }
export interface BookBoxProps {
  book: Book; allBooks?: Book[]; today?: string; W: number; H: number; D: number; spineUnit?: number;
  hingeRef?: RefObject<HTMLDivElement | null>; onCoverClick?: (event: any) => void; withPages?: boolean; coverExtras?: ReactNode;
}
export interface SpineButtonProps { placed: Placed; onPick: PickHandler }
export interface BookcaseProps {
  room: Room; onPick: PickHandler | null; onCycleSort: ((groupKey: string) => void) | null; frame?: string; labels?: boolean;
}
export interface ReadingRoomProps { room: Room; onPickReading: PickHandler; today: string }
export interface MarbleStandProps {
  book: Book | null; W: number; H: number; D: number; onBookClick: ((event: any) => void) | null; staticOnly?: boolean;
}
