/**
 * reactSetup.js
 * Shared handles for the UI files: React hooks, the htm template tag (JSX without a
 * build step), Framer Motion pieces, and the short alias for the logic module.
 * All UI files are inlined into one script by build.mjs, so these are plain globals.
 */
const SL = ShelfLogic;                                    // short alias used by every UI file
const html = htm.bind(React.createElement);               // html`<div className="x"/>` makes React elements
const { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo } = React;
const { motion, animate, useMotionValue, MotionConfig } = Motion;

/**
 * Shared flag set while the swipe track is being dragged, so a finger that ends
 * on a spine after a swipe does not count as a tap on that book.
 */
const DragGuard = { dragging: false };
