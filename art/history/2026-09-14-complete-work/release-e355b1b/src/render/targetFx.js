import { centerOf } from './layout.js';
import { colorOf } from '../core/colors.js';

// Current optical contact is separate from the permanently awakened artwork.
// Reconnecting can make one quiet arrival ring without awarding anything again.
export class TargetContactFx {
  constructor() {
    this.level = null;
    this.contacts = new Map();
    this.visualAwakened = new Map();
    this.logicalAwakened = new Map();
  }

  update(level, frame, time, satisfied, reducedMotion = false, litAt = null) {
    if (this.level !== level) {
      this.contacts.clear(); this.visualAwakened.clear(); this.logicalAwakened.clear(); this.level = level;
    }
    // resetLevel keeps the parsed level object. Missing or renewed historical
    // awards therefore clear visual memory too, without replaying it on a turn.
    if (litAt) for (const key of this.visualAwakened.keys()) {
      if (!litAt.has(key) || litAt.get(key) !== this.logicalAwakened.get(key)) {
        this.visualAwakened.delete(key); this.logicalAwakened.delete(key); this.contacts.delete(key);
      }
    }
    const next = new Map();
    for (const entry of frame?.entries || []) {
      if (!entry.target || entry.fraction < 1) continue;
      const target = entry.target, key = `${target.x},${target.y}`;
      const color = frame.plan.result.targetColors[key];
      if (entry.segment.color !== color || next.has(key)) continue;
      const previous = this.contacts.get(key);
      const correct = satisfied.has(key);
      const arrivedAt = previous?.color === color && previous.correct === correct ? previous.arrivedAt : time;
      next.set(key, { target, color, correct, arrivedAt, reducedMotion });
      if (correct && (!litAt || litAt.has(key)) && !this.visualAwakened.has(key)) {
        this.visualAwakened.set(key, time);
        this.logicalAwakened.set(key, litAt?.get(key) ?? time);
      }
    }
    this.contacts = next;
    return next;
  }

  visibleParticles(items, layout, time) {
    const origins = (this.level?.targets || []).map(target => ({ ...centerOf(layout, target.x, target.y), key: `${target.x},${target.y}` }));
    return items.filter(particle => {
      const origin = origins.find(point => Math.abs(point.cx - particle.x) < 1 && Math.abs(point.cy - particle.y) < 1);
      if (!origin) return true;
      const arrivedAt = this.visualAwakened.get(origin.key);
      // A legacy burst may be born at logical satisfaction before the initial
      // light front reaches the target. Suppress that burst instead of exposing
      // an already-expanded burst later; our arrival ring supplies the feedback.
      return arrivedAt !== undefined && time - particle.age >= arrivedAt - 1e-6;
    });
  }

  draw(ctx, layout, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.setLineDash([]);
    for (const contact of this.contacts.values()) {
      const { target, color, correct, arrivedAt, reducedMotion } = contact;
      const { cx, cy } = centerOf(layout, target.x, target.y), cell = layout.cell;
      const tint = colorOf(color), baseY = cy + cell * .24;
      // A wrong color still physically reaches the object, but it gets no
      // success halo, breathing, or arrival ring.
      ctx.fillStyle = tint;
      ctx.globalAlpha = correct ? .72 : .32;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.2, cell * .026), 0, Math.PI * 2); ctx.fill();
      if (!correct) continue;
      const breath = reducedMotion ? 1 : 1 + Math.sin((time - arrivedAt) * 1.05) * .055;
      const radius = cell * .28 * breath;
      const glow = ctx.createRadialGradient(cx, baseY, cell * .018, cx, baseY, radius);
      glow.addColorStop(0, tint); glow.addColorStop(.34, tint); glow.addColorStop(1, 'transparent');
      ctx.save();
      ctx.translate(cx, baseY); ctx.scale(1, .46); ctx.translate(-cx, -baseY);
      ctx.fillStyle = glow; ctx.globalAlpha = .17;
      ctx.beginPath(); ctx.arc(cx, baseY, radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = tint; ctx.globalAlpha = .32; ctx.lineWidth = Math.max(.65, cell * .012);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx - cell * .018, cy + cell * .12, cx, baseY); ctx.stroke();
      ctx.globalAlpha = .48;
      ctx.beginPath(); ctx.ellipse(cx, baseY, cell * .16 * breath, cell * .05, 0, 0, Math.PI * 2); ctx.stroke();
      const age = time - arrivedAt;
      if (!reducedMotion && age >= 0 && age < .9) {
        const progress = age / .9;
        ctx.globalAlpha = Math.sin(progress * Math.PI) * .26;
        ctx.lineWidth = Math.max(.65, cell * .014 * (1 - progress * .4));
        ctx.beginPath(); ctx.ellipse(cx, baseY, cell * (.12 + progress * .23), cell * (.035 + progress * .065), 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
