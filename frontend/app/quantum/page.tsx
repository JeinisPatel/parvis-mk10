'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TopBar } from '@/components/TopBar';
import { runQuantum, type QuantumResponse, type BlochAngles, type DiagnosticAxis } from '@/lib/api';
import { PV } from '@/lib/tokens';
import { ItalicCaption } from '@/components/atoms/ItalicCaption';
import { Glyph, ICON } from '@/components/Glyph';
import * as THREE from 'three';

/**
 * Quantum (Appendix Q) — the QBism diagnostic suite + animated Bloch sphere.
 *
 * Architecture:
 *
 *   Backend  /api/v1/quantum
 *     ↓
 *   Runs quantum_diagnostics.diagnose() + bloch_sphere.compute_bloch_angles()
 *   on the current evidence
 *     ↓
 *   Returns six diagnostic axes (prior_contamination, order_effects,
 *   contextual_interference, belief_stasis, order_stability,
 *   connection_gate_contextuality) + Bloch sphere (θ, φ, x, y, z) +
 *   superposition index + classical posteriors + overall flag
 *
 *   Frontend
 *     - Left:  Three.js Bloch sphere with mouse rotation, smooth
 *              great-circle-arc tweening on evidence change, and a
 *              dimmed "before" state vector showing the most recent move
 *     - Right: six diagnostic panels, each with a severity chip + items +
 *              doctrinal note
 *     - Bottom: superposition index + classical-vs-quantum side-by-side
 *
 * The QBism agent label (caption: "Belief state of the practitioner, not
 * the offender") sits below the sphere as a doctrinal commitment.
 */

// ── Shared demo evidence (mirrors Risk & distortions for Phase B) ───────────

const DEMO_EVIDENCE: Record<string, 0 | 1> = {
  '5':  1, '6':  1, '7':  1, '8':  1, '9':  1, '17': 1,
};

const DEMO_SHIFTS: Record<string, number> = {};


export default function QuantumPage() {
  const [connectionStrength, setConnectionStrength] =
    useState<'weak' | 'moderate' | 'strong'>('moderate');

  const quantum = useQuery({
    queryKey: ['quantum', { connectionStrength }],
    queryFn:  () => runQuantum({
      evidence:             DEMO_EVIDENCE,
      shifts:               DEMO_SHIFTS,
      connection_strength:  connectionStrength,
    }),
    staleTime: 60_000,
  });

  return (
    <>
      <TopBar breadcrumb="Quantum (Appendix Q)" />

      <div style={{ padding: '24px 36px 64px', maxWidth: 1200 }}>
        {/* Page heading */}
        <div className="mb-6">
          <h1
            className="font-serif text-ink mb-1"
            style={{ fontSize: 26, fontWeight: 500 }}
          >
            Quantum (Appendix Q)
          </h1>
          <p
            className="font-serif italic text-ink2 leading-relaxed"
            style={{ fontSize: 14, maxWidth: 720 }}
          >
            The QBism diagnostic layer. Classical Variable Elimination is
            mathematically coherent; this layer asks whether it is{' '}
            <b className="not-italic font-semibold">normatively</b> sound. The
            sphere represents the practitioner's belief state — not the
            offender's risk — over the binary outcome P(DO designation). The
            six axes below test for the epistemic pressure points the doctrine
            obliges courts to recognise.
          </p>
        </div>

        {quantum.error && (
          <ErrorPanel err={quantum.error as Error} />
        )}

        {quantum.isLoading && !quantum.data && (
          <div className="font-mono text-ink3" style={{ fontSize: 12 }}>
            running QBism diagnostics…
          </div>
        )}

        {quantum.data && (
          <QuantumBody
            data={quantum.data}
            connectionStrength={connectionStrength}
            onConnectionStrengthChange={setConnectionStrength}
          />
        )}
      </div>
    </>
  );
}


function ErrorPanel({ err }: { err: Error }) {
  return (
    <div
      className="rounded-xl px-5 py-4 mb-6"
      style={{ background: PV.riskSoft, border: `1px solid ${PV.risk}33` }}
    >
      <div className="label-caps mb-1" style={{ color: PV.risk }}>
        Quantum diagnostics failed
      </div>
      <div className="font-mono text-ink2 whitespace-pre-wrap" style={{ fontSize: 12 }}>
        {err.message}
      </div>
    </div>
  );
}


function QuantumBody({
  data,
  connectionStrength,
  onConnectionStrengthChange,
}: {
  data: QuantumResponse;
  connectionStrength: 'weak' | 'moderate' | 'strong';
  onConnectionStrengthChange: (v: 'weak' | 'moderate' | 'strong') => void;
}) {
  const overall = overallBadge(data.overall_flag);

  return (
    <>
      {/* Headline pill + summary */}
      <div
        className="rounded-xl border p-5 mb-7"
        style={{
          borderColor: overall.color + '44',
          background:  overall.color + '0A',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, background: overall.color }}
          />
          <span
            className="font-mono uppercase tracking-caps font-bold"
            style={{ fontSize: 11, color: overall.color }}
          >
            QBism overall · {overall.label}
          </span>
          <span className="flex-1" />
          <ConnectionGate
            value={connectionStrength}
            onChange={onConnectionStrengthChange}
          />
        </div>
        <p
          className="font-serif italic"
          style={{ fontSize: 14, color: PV.ink2, lineHeight: 1.55 }}
        >
          {data.summary}
        </p>
      </div>

      {/* Sphere + Superposition */}
      <div
        className="grid mb-9"
        style={{ gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'start' }}
      >
        <BlochSphereCanvas angles={data.angles} doRisk={data.do_risk} />
        <SuperpositionPanel
          index={data.superposition_index}
          note={data.superposition_note}
          doRisk={data.do_risk}
        />
      </div>

      {/* Diagnostic axes */}
      <section>
        <div className="mb-3">
          <h2
            className="font-serif text-ink mb-1"
            style={{ fontSize: 19, fontWeight: 500 }}
          >
            Diagnostic axes
          </h2>
          <ItalicCaption>
            Six tests for the conditions under which classical Bayesian update
            is normatively suspect even when mathematically coherent.
          </ItalicCaption>
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}
        >
          <DiagnosticPanel
            title="Prior contamination"
            subtitle="AQ.3.3.2"
            axis={data.prior_contamination}
          />
          <DiagnosticPanel
            title="Order effects"
            subtitle="AQ.3.3.3"
            axis={data.order_effects}
          />
          <DiagnosticPanel
            title="Contextual interference"
            subtitle="AQ.3.3.4"
            axis={data.contextual_interference}
          />
          <DiagnosticPanel
            title="Belief stasis"
            subtitle="AQ.3.3.4"
            axis={data.belief_stasis}
          />
          <DiagnosticPanel
            title="Order stability"
            subtitle="AQ.3.3.5.3 · engine-bound"
            axis={data.order_stability}
          />
          <DiagnosticPanel
            title="Connection-gate contextuality"
            subtitle="AQ.3.3.5.4 · engine-bound"
            axis={data.connection_gate_contextuality}
          />
        </div>
      </section>
    </>
  );
}


// ── Bloch sphere (Three.js, animated, mouse-rotatable) ──────────────────────

function BlochSphereCanvas({
  angles, doRisk,
}: {
  angles: BlochAngles;
  doRisk: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Keep the previous state vector so we can render a dimmed "before" arrow.
  const prevAnglesRef = useRef<BlochAngles | null>(null);
  const animatedRef   = useRef<BlochAngles>({ ...angles });

  useEffect(() => {
    prevAnglesRef.current = animatedRef.current;
    // animatedRef will tween toward `angles` inside the render loop.
  }, [angles.x, angles.y, angles.z]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Scene setup ────────────────────────────────────────────────────────
    const width  = mount.clientWidth;
    const height = 380;
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(2.2, 1.8, 2.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // ── The sphere (translucent shell) ─────────────────────────────────────
    const sphereGeo = new THREE.SphereGeometry(1, 64, 48);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xcfc9bc,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // ── Axes ───────────────────────────────────────────────────────────────
    const axis = (from: THREE.Vector3, to: THREE.Vector3, color: number) => {
      const g = new THREE.BufferGeometry().setFromPoints([from, to]);
      const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });
      return new THREE.Line(g, m);
    };
    scene.add(axis(new THREE.Vector3(-1.25, 0, 0), new THREE.Vector3(1.25, 0, 0), 0xa32d2d));
    scene.add(axis(new THREE.Vector3(0, -1.25, 0), new THREE.Vector3(0, 1.25, 0), 0x534ab7));
    scene.add(axis(new THREE.Vector3(0, 0, -1.25), new THREE.Vector3(0, 0, 1.25), 0x3b6d11));

    // Equator (superposition ring).
    const eqPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      eqPts.push(new THREE.Vector3(Math.cos(t), 0, Math.sin(t)));
    }
    const eq = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(eqPts),
      new THREE.LineDashedMaterial({
        color: 0xba7517, dashSize: 0.12, gapSize: 0.06, transparent: true, opacity: 0.55,
      }),
    );
    eq.computeLineDistances();
    scene.add(eq);

    // ── Helpers for arrows ─────────────────────────────────────────────────
    const makeArrow = (color: number, opacity = 1) => {
      const group = new THREE.Group();
      // Shaft (line)
      const shaftGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const shaftMat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity, linewidth: 2,
      });
      const shaft = new THREE.Line(shaftGeo, shaftMat);
      group.add(shaft);

      // Tip (cone)
      const coneGeo = new THREE.ConeGeometry(0.04, 0.12, 12);
      const coneMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      group.add(cone);

      // Endpoint dot
      const dotGeo = new THREE.SphereGeometry(0.025, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      group.add(dot);

      scene.add(group);
      return { group, shaft, cone, dot };
    };

    const currentArrow = makeArrow(0x1a1a18, 0.95);
    const previousArrow = makeArrow(0x1a1a18, 0.18);  // dimmed "before"

    // ── Mouse rotation ─────────────────────────────────────────────────────
    let yaw   = 0;
    let pitch = 0.2;
    let dragging = false;
    let lastX = 0, lastY = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      mount.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      yaw   += dx * 0.007;
      pitch += dy * 0.007;
      pitch = Math.max(-1.2, Math.min(1.2, pitch));
    };
    const onUp = () => {
      dragging = false;
      mount.style.cursor = 'grab';
    };

    mount.style.cursor = 'grab';
    mount.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.clientWidth;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // ── Render loop ─────────────────────────────────────────────────────────
    let raf = 0;
    let auto = 0;
    const placeArrow = (
      a: ReturnType<typeof makeArrow>,
      x: number, y: number, z: number,
    ) => {
      const tip = new THREE.Vector3(x, z, -y);  // Three uses Y-up; our math uses Z-up
      const dir = tip.clone().normalize();
      // Shaft
      const pts = [new THREE.Vector3(0, 0, 0), tip];
      a.shaft.geometry.setFromPoints(pts);
      // Cone
      a.cone.position.copy(tip.clone().multiplyScalar(0.94));
      a.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      // Dot
      a.dot.position.copy(tip);
    };

    const renderFrame = () => {
      // Tween animated angles toward the target (eased)
      const target = angles;
      const cur = animatedRef.current;
      const k = 0.08;  // ease factor
      cur.x += (target.x - cur.x) * k;
      cur.y += (target.y - cur.y) * k;
      cur.z += (target.z - cur.z) * k;
      cur.theta += (target.theta - cur.theta) * k;
      cur.phi   += (target.phi - cur.phi)   * k;

      // Re-orient scene from yaw/pitch (only when not auto-rotating).
if (!dragging) auto += 0.006;
// Rotate the entire scene — yaw is user-driven, auto is the gentle drift.
// The auto term also gets a small sinusoidal x-axis nutation so the
// rotation reads as motion rather than a frozen pose.
scene.rotation.y = yaw + auto;
scene.rotation.x = pitch + Math.sin(auto * 1.3) * 0.08;

      // Position the arrows in scene-local coords.
      placeArrow(currentArrow, cur.x, cur.y, cur.z);
      if (prevAnglesRef.current) {
        placeArrow(
          previousArrow,
          prevAnglesRef.current.x,
          prevAnglesRef.current.y,
          prevAnglesRef.current.z,
        );
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderFrame);
    };
    renderFrame();

    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [angles]);

  return (
    <div
      className="rounded-xl border bg-paper2 p-5"
      style={{ borderColor: PV.border }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2
          className="font-serif text-ink"
          style={{ fontSize: 17, fontWeight: 500 }}
        >
          Belief state |ψ⟩
        </h2>
        <span
          className="font-mono tabular-nums text-ink3"
          style={{ fontSize: 11 }}
        >
          θ={(angles.theta * 180 / Math.PI).toFixed(1)}°
          {' · '}
          φ={(angles.phi * 180 / Math.PI).toFixed(1)}°
        </span>
      </div>

      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: 380,
          touchAction: 'none',
        }}
      />

      <div className="mt-3 grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, background: '#A32D2D', borderRadius: 4 }} />
          <span className="text-ink3">x · risk ↔ mitigation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, background: '#534AB7', borderRadius: 4 }} />
          <span className="text-ink3">y · azimuth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, background: '#3B6D11', borderRadius: 4 }} />
          <span className="text-ink3">z · P(DO=1) ↑</span>
        </div>
      </div>

      <div
        className="mt-3 pt-3 border-t"
        style={{ borderColor: PV.border }}
      >
        <ItalicCaption size={11.5}>
          Belief state of the <b className="not-italic font-semibold">practitioner</b>,
          not the offender — per the QBism commitment of Appendix Q. The dimmed
          arrow shows the most recent prior state. Drag to rotate.
        </ItalicCaption>
      </div>
    </div>
  );
}


function SuperpositionPanel({
  index, note, doRisk,
}: {
  index: number;
  note:  string;
  doRisk: number;
}) {
  const band =
    index > 0.7 ? { label: 'High',     color: PV.constraint  } :
    index > 0.4 ? { label: 'Moderate', color: '#BA9117'      } :
                  { label: 'Resolved', color: PV.mitigation  };

  return (
    <div
      className="rounded-xl border bg-paper2 p-5"
      style={{ borderColor: PV.border }}
    >
      <div className="label-caps mb-2">Superposition index</div>
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="font-serif tabular-nums"
          style={{ fontSize: 56, color: band.color, letterSpacing: '-0.02em' }}
        >
          {index.toFixed(2)}
        </span>
        <span
          className="font-serif italic"
          style={{ fontSize: 17, color: band.color }}
        >
          {band.label} ambiguity
        </span>
      </div>

      {/* Bar from 0 to 1 */}
      <div
        style={{
          height: 6, borderRadius: 3, background: PV.paper3, overflow: 'hidden', marginBottom: 14,
        }}
      >
        <div
          style={{
            width: `${index * 100}%`, height: '100%',
            background: band.color, borderRadius: 3,
            transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      <p
        className="font-serif italic text-ink2 leading-relaxed mb-3"
        style={{ fontSize: 13 }}
      >
        {note}
      </p>

      <div
        className="pt-3 border-t flex items-baseline justify-between"
        style={{ borderColor: PV.border }}
      >
        <span className="label-caps">Classical P(DO=1)</span>
        <span
          className="font-mono tabular-nums font-semibold"
          style={{ fontSize: 14, color: PV.ink }}
        >
          {(doRisk * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}


// ── Diagnostic panels ───────────────────────────────────────────────────────

function DiagnosticPanel({
  title, subtitle, axis,
}: {
  title: string;
  subtitle: string;
  axis:  DiagnosticAxis;
}) {
  const sev = severityBadge(axis.severity);

  return (
    <div
      className="rounded-lg border bg-paper p-4"
      style={{ borderColor: PV.border }}
    >
      <div className="flex items-baseline gap-2 mb-1.5">
        <span
          className="font-serif font-medium text-ink flex-1"
          style={{ fontSize: 14 }}
        >
          {title}
        </span>
        <span
          className="font-mono uppercase tracking-caps rounded-full px-2 py-0.5"
          style={{
            fontSize: 9,
            background: sev.color + '22',
            color: sev.color,
            fontWeight: 700,
          }}
        >
          {sev.label}
        </span>
      </div>

      <div className="label-caps mb-2">{subtitle}</div>

      {/* Items */}
      {axis.items && axis.items.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {axis.items.slice(0, 3).map((item: any, i: number) => {
            const text =
              typeof item === 'string'
                ? item
                : item?.note ?? JSON.stringify(item);
            return (
              <li
                key={i}
                className="text-ink2"
                style={{ fontSize: 12, lineHeight: 1.45 }}
              >
                · {text}
              </li>
            );
          })}
          {axis.items.length > 3 && (
            <li className="text-ink4" style={{ fontSize: 11 }}>
              + {axis.items.length - 3} more
            </li>
          )}
        </ul>
      )}

      {/* Note (for engine-bound axes) */}
      {axis.note && (
        <p
          className="font-serif italic text-ink3"
          style={{ fontSize: 12, lineHeight: 1.45 }}
        >
          {axis.note}
        </p>
      )}

      {/* Delta (for engine-bound axes) */}
      {axis.delta != null && Math.abs(axis.delta) > 0 && (
        <div
          className="mt-2 pt-2 border-t flex items-baseline justify-between"
          style={{ borderColor: PV.border }}
        >
          <span className="label-caps">max Δ N20</span>
          <span
            className="font-mono tabular-nums"
            style={{
              fontSize: 12,
              color: Math.abs(axis.delta) > 0.05 ? PV.risk : PV.ink3,
            }}
          >
            {(axis.delta * 100).toFixed(2)} pp
          </span>
        </div>
      )}

      {/* Doctrine */}
      {axis.doctrine && (
        <p
          className="font-serif italic mt-2 pt-2 border-t text-ink3"
          style={{ fontSize: 11.5, lineHeight: 1.45, borderColor: PV.border }}
        >
          {axis.doctrine}
        </p>
      )}
    </div>
  );
}


function ConnectionGate({
  value, onChange,
}: {
  value: 'weak' | 'moderate' | 'strong';
  onChange: (v: 'weak' | 'moderate' | 'strong') => void;
}) {
  const options: { value: 'weak' | 'moderate' | 'strong'; label: string }[] = [
    { value: 'weak',     label: 'Weak'     },
    { value: 'moderate', label: 'Moderate' },
    { value: 'strong',   label: 'Strong'   },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="label-caps">Morris ¶97 connection</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="font-mono uppercase tracking-caps rounded border transition-colors"
            style={{
              fontSize: 10,
              padding: '4px 8px',
              background: value === opt.value ? PV.ink : 'transparent',
              color:      value === opt.value ? '#fff' : PV.ink3,
              borderColor: value === opt.value ? PV.ink : PV.border,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}


// ── Badge helpers ───────────────────────────────────────────────────────────

function overallBadge(flag: 'high' | 'moderate' | 'none') {
  if (flag === 'high')      return { label: 'High pressure',    color: PV.risk        };
  if (flag === 'moderate')  return { label: 'Moderate pressure', color: PV.constraint };
  return                          { label: 'No flags',           color: PV.mitigation };
}

function severityBadge(s: DiagnosticAxis['severity']) {
  if (s === 'high')     return { label: 'flagged · high',     color: PV.risk        };
  if (s === 'moderate') return { label: 'flagged · moderate', color: PV.constraint  };
  if (s === 'not_run')  return { label: 'not run',            color: PV.ink4        };
  return                       { label: 'no flag',            color: PV.mitigation };
}