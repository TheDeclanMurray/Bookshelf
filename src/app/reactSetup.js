/**
 * reactSetup.js
 * Shared handles for the UI files: React hooks, the htm template tag (JSX without a
 * build step), Framer Motion pieces, and the short alias for the logic module.
 */
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useContext, memo } from 'react';
import htm from 'htm';
import * as Motion from 'framer-motion';
import { ShelfLogic } from './shelfLogic';

const SL = ShelfLogic;                                    // short alias used by every UI file
const html = htm.bind(React.createElement);               // html`<div className="x"/>` makes React elements
const { motion, animate, useMotionValue, MotionConfig } = Motion;

/**
 * Shared flag set while the swipe track is being dragged, so a finger that ends
 * on a spine after a swipe does not count as a tap on that book.
 */
const DragGuard = { dragging: false };

/** Sticker styles per series name (built once from the whole library in app.js). */
const SeriesStyleContext = React.createContext({});


const TAP_SLOP_PX = 10;                                   // a finger that moves further than this between down and up is a swipe, not a tap
const TapTracker = { x: 0, y: 0 };                        // where the latest press started

/**
 * Remembers where a press began; call from onPointerDown.
 * @param {PointerEvent} event - The pointer-down event
 */
function noteTapStart(event) {
  TapTracker.x = event.clientX;
  TapTracker.y = event.clientY;
}

/**
 * Tells a real tap from the end of a swipe; call from onClick.
 * @param {MouseEvent} event - The click event
 * @returns {boolean} True when the press barely moved and no drag is in progress
 */
function isRealTap(event) {
  return !DragGuard.dragging && Math.hypot(event.clientX - TapTracker.x, event.clientY - TapTracker.y) <= TAP_SLOP_PX;
}

export { TAP_SLOP_PX, TapTracker, noteTapStart, isRealTap, React, SL, html, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useContext, memo, motion, animate, useMotionValue, MotionConfig, DragGuard, SeriesStyleContext };
