/**
 * poseSolver.js
 * Finds the stage pose (position, scale, turn) that makes the 3D book's face land exactly on
 * the on-screen quad of the real spine or stand book, so the handoff between the shelf and the
 * stage has no jump. It projects the face's four corners through the same transforms the browser
 * uses (move, scale, turn X, turn Y, then perspective) and adjusts the pose until they match
 * (Levenberg-Marquardt least squares). Pure math, no DOM: unit tested in src/tests/.
 */
const PoseSolver = (function () {
  'use strict';

  // ----------------------------------------------------------------- constants
  const STEPS = { x: 0.25, y: 0.25, scale: 0.0005, rotateX: 0.02, rotateY: 0.02, rotateZ: 0.02 };   // finite-difference steps per parameter
  const MAX_ITERATIONS = 80;
  const DONE_RMS_PX = 0.02;                               // stop when corners are within this many pixels on average
  const START_DAMPING = 0.01;

  /**
   * Degrees to radians.
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Where one 3D point lands on screen, relative to the perspective origin. Mirrors the CSS
   * transform `translate3d(x, y, 0) scale3d(s, s, s) rotateZ(rz) rotateX(rx) rotateY(ry)` inside a parent with `perspective: P`.
   * @param {number[]} point - [x, y, z] relative to the book's center (y points down, z toward the viewer)
   * @param {{x: number, y: number, scale: number, rotateX: number, rotateY: number, rotateZ?: number}} pose - Pose in px, scale, degrees (rotateZ defaults to 0)
   * @param {number} perspective - CSS perspective distance in px
   * @returns {number[]} [screenX, screenY]
   */
  function projectPoint(point, pose, perspective) {
    const [px, py, pz] = point;
    const cy = Math.cos(toRadians(pose.rotateY)), sy = Math.sin(toRadians(pose.rotateY));
    const cx = Math.cos(toRadians(pose.rotateX)), sx = Math.sin(toRadians(pose.rotateX));
    const x1 = px * cy + pz * sy;                         // turn about Y first (it is the right-most function)
    const z1 = -px * sy + pz * cy;
    const y2 = py * cx - z1 * sx;                         // then about X
    const z2 = py * sx + z1 * cx;
    const rz = toRadians(pose.rotateZ || 0);              // then roll about Z (the screen's depth axis)
    const x3 = x1 * Math.cos(rz) - y2 * Math.sin(rz);
    const y3 = x1 * Math.sin(rz) + y2 * Math.cos(rz);
    const x = x3 * pose.scale + pose.x;                   // then scale (all three axes), then move (z is not moved)
    const y = y3 * pose.scale + pose.y;
    const z = z2 * pose.scale;
    const k = perspective / (perspective - z);            // things closer to the viewer look bigger
    return [x * k, y * k];
  }

  /**
   * Projects several points.
   * @param {number[][]} corners - [x, y, z] points
   * @param {Object} pose - See projectPoint
   * @param {number} perspective - CSS perspective distance in px
   * @returns {number[]} Flat list [x0, y0, x1, y1, ...]
   */
  function projectCorners(corners, pose, perspective) {
    return corners.flatMap((corner) => projectPoint(corner, pose, perspective));
  }

  /**
   * Solves a small linear system by Gaussian elimination with pivoting.
   * @param {number[][]} matrix - n by n
   * @param {number[]} vector - length n
   * @returns {(number[]|null)} Solution, or null if the matrix is singular
   */
  function solveLinear(matrix, vector) {
    const n = vector.length;
    const a = matrix.map((row, i) => row.concat(vector[i]));   // augmented matrix
    for (let col = 0; col < n; col++) {
      let pivot = col;                                    // pick the largest entry in this column
      for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
      if (Math.abs(a[pivot][col]) < 1e-12) return null;
      [a[col], a[pivot]] = [a[pivot], a[col]];
      for (let row = col + 1; row < n; row++) {
        const factor = a[row][col] / a[col][col];
        for (let k = col; k <= n; k++) a[row][k] -= factor * a[col][k];
      }
    }
    const solution = new Array(n).fill(0);
    for (let row = n - 1; row >= 0; row--) {              // back substitution
      let sum = a[row][n];
      for (let k = row + 1; k < n; k++) sum -= a[row][k] * solution[k];
      solution[row] = sum / a[row][row];
    }
    return solution;
  }

  /**
   * Finds the pose whose projected corners best match the targets.
   * @param {{corners: number[][], targets: number[], initial: Object, free: string[], perspective: number}} input
   *   corners are the face's [x, y, z] corners; targets are the wanted screen positions as a flat list
   *   relative to the perspective origin; initial is the starting pose; free names the pose fields allowed to change
   * @returns {{pose: Object, rms: number}} Best pose and the average corner error in px
   * @throws {RangeError} If targets do not match the corners, or no field is free
   */
  function solvePose({ corners, targets, initial, free, perspective }) {
    if (targets.length !== corners.length * 2 || free.length === 0) {
      throw new RangeError('need two target numbers per corner and at least one free parameter');
    }
    const errorOf = (pose) => projectCorners(corners, pose, perspective).map((value, i) => value - targets[i]);
    const rmsOf = (residual) => Math.sqrt(residual.reduce((sum, r) => sum + r * r, 0) / residual.length);
    let pose = { ...initial };
    let residual = errorOf(pose);
    let damping = START_DAMPING;
    for (let iteration = 0; iteration < MAX_ITERATIONS && rmsOf(residual) > DONE_RMS_PX; iteration++) {
      // Jacobian by finite differences: how each corner coordinate responds to each free field
      const columns = free.map((key) => errorOf({ ...pose, [key]: pose[key] + STEPS[key] }).map((value, i) => (value - residual[i]) / STEPS[key]));
      const jtj = free.map((_, i) => free.map((__, j) => columns[i].reduce((sum, v, k) => sum + v * columns[j][k], 0)));
      const jtr = free.map((_, i) => columns[i].reduce((sum, v, k) => sum + v * residual[k], 0));
      const damped = jtj.map((row, i) => row.map((v, j) => (i === j ? v * (1 + damping) + 1e-9 : v)));
      const step = solveLinear(damped, jtr.map((v) => -v));
      if (!step) { damping *= 10; continue; }
      const candidate = { ...pose };
      free.forEach((key, i) => { candidate[key] = pose[key] + step[i]; });
      const candidateResidual = errorOf(candidate);
      if (rmsOf(candidateResidual) < rmsOf(residual)) { pose = candidate; residual = candidateResidual; damping = Math.max(1e-6, damping / 3); }
      else damping *= 5;                                  // worse: take a smaller, safer step next time
    }
    return { pose, rms: rmsOf(residual) };
  }

  return { projectPoint, projectCorners, solvePose };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PoseSolver;                            // Node (tests)
}
