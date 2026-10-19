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
 * Uses scale3d, not scale: plain scale() leaves depth unscaled, which would make a shrunken book look too deep.
 * @param {{x: number, y: number, scale: number, rotateX: number, rotateY: number, rotateZ?: number}} pose - Position (px), scale, turns (degrees)
 * @returns {string} transform value
 */
function poseTransform(pose) {
  return `translate3d(${pose.x}px, ${pose.y}px, 0px) scale3d(${pose.scale}, ${pose.scale}, ${pose.scale}) rotateZ(${pose.rotateZ || 0}deg) rotateX(${pose.rotateX}deg) rotateY(${pose.rotateY}deg)`;
}

/**
 * A pose part of the way from one pose to another, with the position and the size/turn given separate fractions.
 * @param {Object} from - Starting pose (x, y, scale, rotateX, rotateY, rotateZ)
 * @param {Object} to - End pose
 * @param {number} place - How far along the position (x, y) is, 0 to 1
 * @param {number} shape - How far along the scale and turns are, 0 to 1
 * @returns {Object} The blended pose
 */
function blendPose(from, to, place, shape) {
  const mix = (a, b, t) => a + (b - a) * t;
  return {
    x: mix(from.x, to.x, place), y: mix(from.y, to.y, place), scale: mix(from.scale, to.scale, shape),
    rotateX: mix(from.rotateX, to.rotateX, shape), rotateY: mix(from.rotateY, to.rotateY, shape), rotateZ: mix(from.rotateZ || 0, to.rotateZ || 0, shape),
  };
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
 * @param {Object[]} frames - Keyframes; each may have transform, opacity, perspectiveOrigin, offset, easing
 * @param {{duration: number, easing?: string, delay?: number}} options - Timing in milliseconds
 * @returns {Promise<boolean>} Resolves true when it finished, false when something interrupted it
 */
function playMotion(element, frames, { duration, easing = EASE_OUT, delay = 0 }) {
  const last = frames[frames.length - 1];
  const applyFinal = () => {
    for (const [key, value] of Object.entries(last)) if (key !== 'offset' && key !== 'easing') element.style[key] = String(value);   // keep the end state (transform, perspectiveOrigin, ...)
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
 * @param {{transform?: string, opacity?: number, perspectiveOrigin?: string}} to - End values
 * @param {{duration: number, easing?: string, delay?: number, from?: Object, via?: Object}} options - Timing, a known start when the element is at rest, and an optional middle keyframe (end-value keys plus offset)
 * @returns {Promise<boolean>} Resolves true when it finished, false when interrupted
 */
function playMotionTo(element, to, { from, via, ...timing }) {
  const interrupted = !!element.__motion;
  settleMotion(element);
  const style = getComputedStyle(element);                // what is on screen right now
  const known = interrupted ? undefined : from;           // a given start is only trusted when the element was at rest
  const startFrame = {};
  for (const key of Object.keys(to)) {
    startFrame[key] = known && known[key] !== undefined ? known[key] : (key === 'opacity' ? Number(style.opacity) : style[key]);
  }
  return playMotion(element, via ? [startFrame, via, to] : [startFrame, to], timing);
}

export { EASE_OUT, EASE_IN_OUT, EASE_OPEN, REDUCED_MOTION_MS, prefersReducedMotion, poseTransform, blendPose, settleMotion, playMotion, playMotionTo };
