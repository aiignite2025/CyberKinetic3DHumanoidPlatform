/**
 * Humanoid Robot Motion Smoothing & Damping Control Engine
 * 
 * Implements specialized robotics algorithms for natural, jerk-free, physically compliant motion:
 * 1. Critically Damped Spring-Damper (二阶临界阻尼弹簧动力学 - 无超调快速平稳收敛)
 * 2. Ruckig S-Curve Jerk-Constrained Trajectory Limiter (加加速度 Jerk 三阶物理限幅)
 * 3. Virtual Motor Impedance & Compliance Control (虚拟电机阻抗与柔顺控制)
 * 4. Adaptive One-Euro Velocity-Adaptive Low-Pass Filter (自适应 1€ 滤波)
 */

import { ProcessedJoints, RobotArmParams, MotionControlAlgorithm } from '../types/robot';

export interface JointKinematicState {
  position: number;    // Current angle in degrees
  velocity: number;    // Current angular speed in deg/s
  acceleration: number;// Current angular acceleration in deg/s^2
}

/**
 * Single-DOF physical actuator damper & trajectory filter
 */
export class PhysicalJointDamper {
  public state: JointKinematicState;
  private prevTarget: number = 0;
  private oneEuroDxPrev: number = 0;

  constructor(initialPosition: number = 0) {
    this.state = {
      position: initialPosition,
      velocity: 0,
      acceleration: 0,
    };
    this.prevTarget = initialPosition;
  }

  public reset(position: number) {
    this.state.position = position;
    this.state.velocity = 0;
    this.state.acceleration = 0;
    this.prevTarget = position;
    this.oneEuroDxPrev = 0;
  }

  /**
   * Updates state towards targetAngle given physical constraints and selected algorithm
   */
  public step(
    targetAngle: number,
    dt: number,
    params: RobotArmParams
  ): number {
    const safeDt = Math.max(0.001, Math.min(0.08, dt));
    const algorithm: MotionControlAlgorithm = params.controlAlgorithm ?? 'critically_damped';

    const maxSpeed = params.maxAngularSpeed ?? 180; // deg/s
    const maxAccel = params.maxAcceleration ?? 360; // deg/s^2
    const dampingRatio = params.dampingFactor ?? 1.0; // zeta (1.0 = critical damping)
    const naturalFreq = params.springStiffness ?? 9.0; // omega_n in rad/s

    switch (algorithm) {
      case 'critically_damped': {
        // Unconditionally stable implicit spring-damper integration
        // m*x'' + c*x' + k*(x - target) = 0
        // c = 2 * zeta * omega_n
        const omega = naturalFreq;
        const zeta = Math.max(0.2, dampingRatio);

        const f = 1.0 + 2.0 * safeDt * zeta * omega;
        const oo = omega * omega;
        const hoo = safeDt * oo;
        const hhoo = safeDt * hoo;
        const detInv = 1.0 / (f + hhoo);

        let newPos = (f * this.state.position + safeDt * this.state.velocity + hhoo * targetAngle) * detInv;
        let newVel = (this.state.velocity + hoo * (targetAngle - this.state.position)) * detInv;

        // Apply physical velocity clamping
        if (Math.abs(newVel) > maxSpeed) {
          const clampedVel = Math.sign(newVel) * maxSpeed;
          newPos = this.state.position + clampedVel * safeDt;
          newVel = clampedVel;
        }

        const rawAccel = (newVel - this.state.velocity) / safeDt;
        const clampedAccel = Math.max(-maxAccel, Math.min(maxAccel, rawAccel));

        this.state.acceleration = clampedAccel;
        this.state.velocity = newVel;
        this.state.position = newPos;
        return newPos;
      }

      case 's_curve_ruckig': {
        // Jerk & Acceleration Limited S-Curve Planning (Ruckig model)
        const jerkLimit = maxAccel * 4.0; // deg/s^3
        const distance = targetAngle - this.state.position;
        const sign = Math.sign(distance);
        const absDist = Math.abs(distance);

        // Maximum safe arrival speed based on constant deceleration: v = sqrt(2 * a * d)
        const safeArrivalSpeed = Math.sqrt(2.0 * maxAccel * absDist);
        let desiredVelocity = Math.min(maxSpeed, safeArrivalSpeed) * sign;

        // Acceleration slew rate limiting (Jerk limit)
        const targetAccel = Math.max(-maxAccel, Math.min(maxAccel, (desiredVelocity - this.state.velocity) / safeDt));
        const maxDeltaAccel = jerkLimit * safeDt;
        const deltaAccel = Math.max(-maxDeltaAccel, Math.min(maxDeltaAccel, targetAccel - this.state.acceleration));
        this.state.acceleration += deltaAccel;

        // Integrate velocity
        this.state.velocity += this.state.acceleration * safeDt;
        this.state.velocity = Math.max(-maxSpeed, Math.min(maxSpeed, this.state.velocity));

        // Integrate position
        this.state.position += this.state.velocity * safeDt;

        // Close convergence snap
        if (absDist < 0.05 && Math.abs(this.state.velocity) < 0.5) {
          this.state.position = targetAngle;
          this.state.velocity = 0;
          this.state.acceleration = 0;
        }
        return this.state.position;
      }

      case 'virtual_impedance': {
        // Compliant Virtual Motor Impedance:
        // Tau = Kp * error - Kd * velocity
        const Kp = naturalFreq * naturalFreq * 0.8;
        const Kd = 2.0 * dampingRatio * naturalFreq * 0.9;
        const error = targetAngle - this.state.position;

        const virtualTorque = Kp * error - Kd * this.state.velocity;
        const inertia = 1.0; // normalized unit inertia
        let accel = virtualTorque / inertia;
        accel = Math.max(-maxAccel, Math.min(maxAccel, accel));

        this.state.velocity += accel * safeDt;
        this.state.velocity = Math.max(-maxSpeed, Math.min(maxSpeed, this.state.velocity));
        this.state.position += this.state.velocity * safeDt;
        this.state.acceleration = accel;
        return this.state.position;
      }

      case 'one_euro':
      default: {
        // Speed-adaptive One-Euro Filter on joint angle
        const minCutoff = 1.0 / Math.max(0.1, dampingRatio);
        const beta = 0.04;
        const dCutoff = 1.2;

        const smoothingFactor = (tDiff: number, cutoff: number) => {
          const r = 2 * Math.PI * cutoff * tDiff;
          return r / (r + 1);
        };

        const targetSpeed = Math.abs(targetAngle - this.prevTarget) / safeDt;
        this.prevTarget = targetAngle;

        const aD = smoothingFactor(safeDt, dCutoff);
        const dxHat = aD * targetSpeed + (1 - aD) * this.oneEuroDxPrev;
        this.oneEuroDxPrev = dxHat;

        const cutoff = minCutoff + beta * dxHat;
        const a = smoothingFactor(safeDt, cutoff);
        let newPos = a * targetAngle + (1 - a) * this.state.position;

        // Slew rate max speed clamp
        const maxStep = maxSpeed * safeDt;
        newPos = Math.max(this.state.position - maxStep, Math.min(this.state.position + maxStep, newPos));

        this.state.velocity = (newPos - this.state.position) / safeDt;
        this.state.position = newPos;
        return newPos;
      }
    }
  }
}

/**
 * Robot-wide Multi-DOF Joint Motion Smoother
 * Synchronously filters and damps all 26 actuated joints across arms, torso, neck, and legs.
 */
export class RobotJointMotionSmoother {
  private dampers: Map<string, PhysicalJointDamper> = new Map();
  private currentJoints: ProcessedJoints;
  private targetJoints: ProcessedJoints;

  constructor(initialJoints: ProcessedJoints) {
    this.currentJoints = JSON.parse(JSON.stringify(initialJoints));
    this.targetJoints = JSON.parse(JSON.stringify(initialJoints));
    this.initDampers(initialJoints);
  }

  private initDampers(joints: ProcessedJoints) {
    const register = (key: string, val: number) => {
      this.dampers.set(key, new PhysicalJointDamper(val));
    };

    register('leftShoulder.pitch', joints.leftShoulder.pitch);
    register('leftShoulder.roll', joints.leftShoulder.roll);
    register('leftShoulder.yaw', joints.leftShoulder.yaw);
    register('leftElbow', joints.leftElbow);
    register('leftWrist.pitch', joints.leftWrist.pitch);
    register('leftWrist.roll', joints.leftWrist.roll);
    register('leftWrist.yaw', joints.leftWrist.yaw);

    register('rightShoulder.pitch', joints.rightShoulder.pitch);
    register('rightShoulder.roll', joints.rightShoulder.roll);
    register('rightShoulder.yaw', joints.rightShoulder.yaw);
    register('rightElbow', joints.rightElbow);
    register('rightWrist.pitch', joints.rightWrist.pitch);
    register('rightWrist.roll', joints.rightWrist.roll);
    register('rightWrist.yaw', joints.rightWrist.yaw);

    register('spineTilt', joints.spineTilt);
    register('spinePitch', joints.spinePitch);
    register('spineYaw', joints.spineYaw);
    register('neckPitch', joints.neckPitch);
    register('neckYaw', joints.neckYaw);
    register('neckRoll', joints.neckRoll);

    register('leftHip.pitch', joints.leftHip.pitch);
    register('leftHip.roll', joints.leftHip.roll);
    register('leftKnee', joints.leftKnee);
    register('leftAnkle', joints.leftAnkle);

    register('rightHip.pitch', joints.rightHip.pitch);
    register('rightHip.roll', joints.rightHip.roll);
    register('rightKnee', joints.rightKnee);
    register('rightAnkle', joints.rightAnkle);
  }

  public setTargetJoints(targets: ProcessedJoints) {
    this.targetJoints = targets;
  }

  public resetAll(targets: ProcessedJoints) {
    this.currentJoints = JSON.parse(JSON.stringify(targets));
    this.targetJoints = JSON.parse(JSON.stringify(targets));
    this.dampers.forEach((damper, key) => {
      const val = this.extractJointVal(targets, key);
      damper.reset(val);
    });
  }

  private extractJointVal(j: ProcessedJoints, key: string): number {
    switch (key) {
      case 'leftShoulder.pitch': return j.leftShoulder?.pitch ?? 0;
      case 'leftShoulder.roll': return j.leftShoulder?.roll ?? 0;
      case 'leftShoulder.yaw': return j.leftShoulder?.yaw ?? 0;
      case 'leftElbow': return j.leftElbow ?? 0;
      case 'leftWrist.pitch': return j.leftWrist?.pitch ?? 0;
      case 'leftWrist.roll': return j.leftWrist?.roll ?? 0;
      case 'leftWrist.yaw': return j.leftWrist?.yaw ?? 0;

      case 'rightShoulder.pitch': return j.rightShoulder?.pitch ?? 0;
      case 'rightShoulder.roll': return j.rightShoulder?.roll ?? 0;
      case 'rightShoulder.yaw': return j.rightShoulder?.yaw ?? 0;
      case 'rightElbow': return j.rightElbow ?? 0;
      case 'rightWrist.pitch': return j.rightWrist?.pitch ?? 0;
      case 'rightWrist.roll': return j.rightWrist?.roll ?? 0;
      case 'rightWrist.yaw': return j.rightWrist?.yaw ?? 0;

      case 'spineTilt': return j.spineTilt ?? 0;
      case 'spinePitch': return j.spinePitch ?? 0;
      case 'spineYaw': return j.spineYaw ?? 0;
      case 'neckPitch': return j.neckPitch ?? 0;
      case 'neckYaw': return j.neckYaw ?? 0;
      case 'neckRoll': return j.neckRoll ?? 0;

      case 'leftHip.pitch': return j.leftHip?.pitch ?? 0;
      case 'leftHip.roll': return j.leftHip?.roll ?? 0;
      case 'leftKnee': return j.leftKnee ?? 0;
      case 'leftAnkle': return j.leftAnkle ?? 0;

      case 'rightHip.pitch': return j.rightHip?.pitch ?? 0;
      case 'rightHip.roll': return j.rightHip?.roll ?? 0;
      case 'rightKnee': return j.rightKnee ?? 0;
      case 'rightAnkle': return j.rightAnkle ?? 0;
      default: return 0;
    }
  }

  /**
   * Advances the physical damper simulation by dt seconds.
   * Returns smooth, physics-compliant joint angles.
   */
  public update(dt: number, params: RobotArmParams): ProcessedJoints {
    const step = (key: string): number => {
      let damper = this.dampers.get(key);
      const target = this.extractJointVal(this.targetJoints, key);
      if (!damper) {
        damper = new PhysicalJointDamper(target);
        this.dampers.set(key, damper);
      }
      return damper.step(target, dt, params);
    };

    this.currentJoints = {
      leftShoulder: {
        pitch: step('leftShoulder.pitch'),
        roll: step('leftShoulder.roll'),
        yaw: step('leftShoulder.yaw'),
      },
      leftElbow: step('leftElbow'),
      leftWrist: {
        pitch: step('leftWrist.pitch'),
        roll: step('leftWrist.roll'),
        yaw: step('leftWrist.yaw'),
      },

      rightShoulder: {
        pitch: step('rightShoulder.pitch'),
        roll: step('rightShoulder.roll'),
        yaw: step('rightShoulder.yaw'),
      },
      rightElbow: step('rightElbow'),
      rightWrist: {
        pitch: step('rightWrist.pitch'),
        roll: step('rightWrist.roll'),
        yaw: step('rightWrist.yaw'),
      },

      spineTilt: step('spineTilt'),
      spinePitch: step('spinePitch'),
      spineYaw: step('spineYaw'),
      neckPitch: step('neckPitch'),
      neckYaw: step('neckYaw'),
      neckRoll: step('neckRoll'),

      leftHip: {
        pitch: step('leftHip.pitch'),
        roll: step('leftHip.roll'),
        yaw: 0,
      },
      leftKnee: step('leftKnee'),
      leftAnkle: step('leftAnkle'),

      rightHip: {
        pitch: step('rightHip.pitch'),
        roll: step('rightHip.roll'),
        yaw: 0,
      },
      rightKnee: step('rightKnee'),
      rightAnkle: step('rightAnkle'),
    };

    return this.currentJoints;
  }

  public getCurrentJoints(): ProcessedJoints {
    return this.currentJoints;
  }

  public getJointVelocity(key: string): number {
    return this.dampers.get(key)?.state.velocity ?? 0;
  }

  public getJointAcceleration(key: string): number {
    return this.dampers.get(key)?.state.acceleration ?? 0;
  }
}
