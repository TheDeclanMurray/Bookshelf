/**
 * stageMotion.js
 * Small helpers that play the book's movements with the Web Animations API. Unlike
 * per-frame JavaScript animation, transform and opacity animations run on the browser's
 * compositor, so they stay smooth even while the page is busy doing other work.
 * Every pose uses the same list of transform functions in the same order, so the browser
 * can blend between poses one number at a time.
 */

// ----------------------------------------------------------------- constants
const EASE_OUT = 'cubic-bezier(0.22, 0.85, 0.25, 1)';     // quick start, long soft landing (pull-out)
const EASE_IN_OUT = 'cubic-bezier(0.45, 0, 0.2, 1)';      // gentle both ends (put-back, cover close)
const EASE_OPEN = 'cubic-bezier(0.3, 0.7, 0.2, 1)';       // cover swing and recentering
const REDUCED_MOTION_MS = 1;                              // people who ask for less motion get instant changes

/**
 * Whether the viewer asked for reduced motion.
 * @returns {boolean} True when reduced motion is requested
 */
function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * CSS transform text for a book pose. Always the same functions in the same order.
 * @param {{x: number, y: number, scale: number, rotateX: number, rotateY: number}} pose - Position (px), scale, turns (degrees)
 * @returns {string} transform value
 */
function poseTransform(pose) {
  return `translate3d(${pose.x}px, ${pose.y}px, 0px) scale(${pose.scale}) rotateX(${pose.rotateX}deg) rotateY(${pose.rotateY}deg)`;
}

/**
 * Stops a running animation on an element but keeps what is on screen right now.
 * @param {HTMLElement} element - Element that may be animating
 */
function settleMotion(element) {
  const running = element.__motion;
  if (!running) return;
  try { running.commitStyles(); } catch (error) { /* element not rendered: nothing to keep */ }
  running.cancel();
  element.__motion = null;
}

/**
 * Plays keyframes on an element, then writes the final values into its style.
 * A new call on the same element first settles the previous one, so interruptions are smooth.
 * @param {HTMLElement} element - Element to animate
 * @param {Object[]} frames - Keyframes; each may have transform, opacity, offset, easing
 * @param {{duration: number, easing?: string, delay?: number}} options - Timing in milliseconds
 * @returns {Promise<boolean>} Resolves true when it finished, false when something interrupted it
 */
function playMotion(element, frames, { duration, easing = EASE_OUT, delay = 0 }) {
  const last = frames[frames.length - 1];
  const applyFinal = () => {
    if (last.transform !== undefined) element.style.transform = last.transform;
    if (last.opacity !== undefined) element.style.opacity = String(last.opacity);
  };
  settleMotion(element);
  if (typeof element.animate !== 'function') { applyFinal(); return Promise.resolve(true); }   // very old browser: jump to the end
  const animation = element.animate(frames, { duration: prefersReducedMotion() ? REDUCED_MOTION_MS : duration, easing, delay, fill: 'both' });
  element.__motion = animation;
  return animation.finished.then(() => {
    applyFinal();                                          // keep the end state once the animation object is gone
    animation.cancel();
    if (element.__motion === animation) element.__motion = null;
    return true;
  }, () => false);                                         // cancelled by a newer motion
}

/**
 * Moves an element from where it is (or from a known pose) to a target.
 * @param {HTMLElement} element - Element to animate
 * @param {{transform?: string, opacity?: number}} to - End values
 * @param {{duration: number, easing?: string, delay?: number, from?: Object}} options - Timing, and a known start when the element is at rest
 * @returns {Promise<boolean>} Resolves true when it finished, false when interrupted
 */
function playMotionTo(element, to, { from, ...timing }) {
  const interrupted = !!element.__motion;
  settleMotion(element);
  const style = getComputedStyle(element);                // what is on screen right now
  const known = interrupted ? undefined : from;           // a given start is only trusted when the element was at rest
  const startFrame = {};
  for (const key of Object.keys(to)) {
    startFrame[key] = known && known[key] !== undefined ? known[key] : (key === 'opacity' ? Number(style.opacity) : style.transform);
  }
  return playMotion(element, [startFrame, to], timing);
}
