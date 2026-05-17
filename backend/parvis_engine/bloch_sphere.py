"""
PARVIS — Bloch Sphere Visualization
Appendix Q: Quantum Bayesianism diagnostic layer

Renders a Bloch sphere representation of the pre-decisional belief state,
juxtaposed with the classical Bayesian posterior from Variable Elimination.

The mapping to PARVIS:
  North pole (+Z): P(High) = 1 — fully collapsed to DO designation
  South pole (-Z): P(High) = 0 — fully collapsed to no designation
  Equator:         P(High) = 0.5 — maximum superposition (pre-decisional ambiguity)

  Polar angle θ: arccos(1 - 2·P(High))
    θ = 0    → north pole → P = 1.0
    θ = π/2  → equator   → P = 0.5 (maximum superposition)
    θ = π    → south pole → P = 0.0

  Azimuthal angle φ: encodes balance of risk vs mitigation narrative
    φ = 0    → pure risk narrative dominant
    φ = π/2  → balanced
    φ = π    → pure mitigation narrative dominant

Reference: Busemeyer & Bruza (2012); Wojciechowski (2023); Appendix Q §AQ.3.3.5.1–2
"""

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d import art3d


TYPE_COLORS = {
    "constraint": "#BA7517",
    "risk":       "#A32D2D",
    "distortion": "#185FA5",
    "mitigation": "#3B6D11",
    "dual":       "#534AB7",
    "special":    "#0F6E56",
    "output":     "#993C1D",
}


def compute_bloch_angles(p_high: float, risk_weight: float, mitigation_weight: float):
    """
    Convert classical posterior + risk/mitigation balance to Bloch sphere angles.

    Parameters
    ----------
    p_high : P(High) from Variable Elimination — DO designation risk
    risk_weight : sum of risk factor posteriors (normalised 0–1)
    mitigation_weight : sum of distortion/mitigation corrections (normalised 0–1)

    Returns
    -------
    theta : polar angle (0 = north, π = south)
    phi   : azimuthal angle (0 = risk-dominant, π = mitigation-dominant)
    x, y, z : Cartesian coordinates on unit sphere
    """
    # Polar angle: maps P(High) → θ
    # P=1 → θ=0 (north), P=0.5 → θ=π/2 (equator), P=0 → θ=π (south)
    theta = np.arccos(np.clip(1.0 - 2.0 * p_high, -1, 1))

    # Azimuthal: encodes narrative balance
    # High mitigation weight → pushes toward φ=π (mitigation-dominant)
    total = risk_weight + mitigation_weight + 1e-9
    phi = np.pi * (mitigation_weight / total)

    x = np.sin(theta) * np.cos(phi)
    y = np.sin(theta) * np.sin(phi)
    z = np.cos(theta)

    return theta, phi, x, y, z


def draw_bloch_sphere(
    p_high: float,
    risk_weight: float = 0.5,
    mitigation_weight: float = 0.5,
    classical_p: float = None,
    title: str = "Belief state — Bloch sphere",
    do_risk_label: str = None,
):
    """
    Draw a Bloch sphere showing the quantum belief state alongside
    the classical Bayesian posterior.

    Returns matplotlib Figure.
    """
    fig = plt.figure(figsize=(9, 7), facecolor='#fafafa')
    ax = fig.add_subplot(111, projection='3d', facecolor='#fafafa')

    # ── Sphere wireframe ──────────────────────────────────────────────────────
    u = np.linspace(0, 2 * np.pi, 40)
    v = np.linspace(0, np.pi, 30)
    xs = np.outer(np.cos(u), np.sin(v))
    ys = np.outer(np.sin(u), np.sin(v))
    zs = np.outer(np.ones(np.size(u)), np.cos(v))
    ax.plot_wireframe(xs, ys, zs, color='#dddddd', linewidth=0.3, alpha=0.4)

    # ── Axes ──────────────────────────────────────────────────────────────────
    ax.plot([-1.3, 1.3], [0, 0], [0, 0], color='#cccccc', linewidth=0.8, alpha=0.5)
    ax.plot([0, 0], [-1.3, 1.3], [0, 0], color='#cccccc', linewidth=0.8, alpha=0.5)
    ax.plot([0, 0], [0, 0], [-1.3, 1.3], color='#555555', linewidth=1.2, alpha=0.7)

    # ── Pole labels ───────────────────────────────────────────────────────────
    ax.text(0, 0, 1.45, '|DO⟩\nP=1.0', ha='center', va='bottom',
            fontsize=9, color='#A32D2D', fontweight='bold')
    ax.text(0, 0, -1.45, '|No DO⟩\nP=0.0', ha='center', va='top',
            fontsize=9, color='#3B6D11', fontweight='bold')
    ax.text(1.45, 0, 0, 'Risk\nnarrative', ha='left', va='center',
            fontsize=8, color='#A32D2D', alpha=0.7)
    ax.text(-1.45, 0, 0, 'Mitigation\nnarrative', ha='right', va='center',
            fontsize=8, color='#3B6D11', alpha=0.7)
    ax.text(0, 0, 0.05, 'Superposition\nzone (P≈0.5)', ha='center', va='bottom',
            fontsize=7, color='#888888', alpha=0.6)

    # ── Equator ring (superposition zone) ────────────────────────────────────
    eq = np.linspace(0, 2 * np.pi, 100)
    ax.plot(np.cos(eq), np.sin(eq), np.zeros(100),
            color='#BA7517', linewidth=1.5, alpha=0.5, linestyle='--')

    # ── Quantum state vector ──────────────────────────────────────────────────
    theta, phi, qx, qy, qz = compute_bloch_angles(p_high, risk_weight, mitigation_weight)

    # State vector arrow
    ax.quiver(0, 0, 0, qx, qy, qz,
              color='#1a1a1a', linewidth=2.5, arrow_length_ratio=0.15, alpha=0.95)

    # State point on sphere
    ax.scatter([qx], [qy], [qz], color='#1a1a1a', s=80, zorder=10)

    # Projection down to equatorial plane (shows azimuthal component)
    ax.plot([qx, qx], [qy, qy], [qz, 0],
            color='#888888', linewidth=1, linestyle=':', alpha=0.5)
    ax.plot([0, qx], [0, qy], [0, 0],
            color='#888888', linewidth=1, linestyle=':', alpha=0.5)

    # ── Classical probability comparison line ─────────────────────────────────
    if classical_p is not None:
        # Map classical probability to sphere z-axis position
        cl_z = 1.0 - 2.0 * classical_p
        ax.plot([-1.1, 1.1], [0, 0], [cl_z, cl_z],
                color='#534AB7', linewidth=1.5, linestyle='--', alpha=0.6)
        ax.text(1.15, 0, cl_z,
                f'Classical\nVE: {classical_p*100:.1f}%',
                ha='left', va='center', fontsize=8, color='#534AB7')

    # ── State vector annotation ───────────────────────────────────────────────
    label = do_risk_label or f'|ψ⟩ P(DO)={p_high*100:.1f}%'
    ax.text(qx * 1.15, qy * 1.15, qz * 1.15 + 0.1, label,
            ha='center', va='bottom', fontsize=9, color='#1a1a1a', fontweight='bold')

    # ── Superposition index arc ───────────────────────────────────────────────
    # Show how far from equator the state is
    si = 1.0 - abs(p_high - 0.5) * 2
    si_color = '#BA7517' if si > 0.6 else '#3B6D11' if si < 0.3 else '#888888'

    # ── Formatting ────────────────────────────────────────────────────────────
    ax.set_xlim([-1.5, 1.5])
    ax.set_ylim([-1.5, 1.5])
    ax.set_zlim([-1.5, 1.5])
    ax.set_xlabel('Risk ↔ Mitigation', fontsize=8, color='#888888', labelpad=8)
    ax.set_ylabel('', fontsize=8)
    ax.set_zlabel('P(DO High) ↑ / P(DO Low) ↓', fontsize=8, color='#888888', labelpad=8)
    ax.tick_params(colors='#cccccc', labelsize=7)
    ax.xaxis.pane.fill = False
    ax.yaxis.pane.fill = False
    ax.zaxis.pane.fill = False
    ax.xaxis.pane.set_edgecolor('#eeeeee')
    ax.yaxis.pane.set_edgecolor('#eeeeee')
    ax.zaxis.pane.set_edgecolor('#eeeeee')
    ax.set_zticks([-1, -0.5, 0, 0.5, 1])
    ax.set_zticklabels(['P=0\n(Low)', 'P=0.25', 'P=0.5\n(Equator)', 'P=0.75', 'P=1\n(High)'],
                       fontsize=7, color='#888888')
    ax.set_xticks([])
    ax.set_yticks([])

    # Title
    ax.set_title(
        f'Bloch sphere — belief state |ψ⟩\n'
        f'θ={np.degrees(theta):.1f}° (polar)  φ={np.degrees(phi):.1f}° (azimuthal)  '
        f'Superposition index: {si:.2f}',
        fontsize=10, pad=12, color='#333333'
    )

    ax.view_init(elev=20, azim=45)
    plt.tight_layout()
    return fig


def draw_comparison_chart(p_classical: float, p_bloch: float, superposition_index: float):
    """
    Side-by-side bar chart comparing classical Bayesian posterior
    with the Bloch sphere quantum probability estimate.
    """
    fig, axes = plt.subplots(1, 3, figsize=(10, 3.5), facecolor='#fafafa')

    # Classical probability
    ax1 = axes[0]
    colors1 = ['#3B6D11' if p_classical < 0.5 else '#A32D2D',
               '#dddddd']
    ax1.barh(['P(High)', 'P(Low)'],
             [p_classical, 1 - p_classical],
             color=['#A32D2D' if p_classical >= 0.5 else '#3B6D11', '#dddddd'],
             height=0.4)
    ax1.set_xlim(0, 1)
    ax1.set_title('Classical VE\nposterior', fontsize=10, color='#534AB7', fontweight='bold')
    ax1.axvline(x=0.5, color='#BA7517', linestyle='--', alpha=0.5, linewidth=1)
    ax1.text(p_classical + 0.02, 0, f'{p_classical*100:.1f}%',
             va='center', fontsize=11, fontweight='bold',
             color='#A32D2D' if p_classical >= 0.5 else '#3B6D11')
    ax1.set_facecolor('#fafafa')
    ax1.spines[['top', 'right']].set_visible(False)
    ax1.tick_params(labelsize=9)

    # Quantum probability (|α|² and |β|²)
    ax2 = axes[1]
    alpha_sq = p_classical          # |α|² = P(High)
    beta_sq = 1 - p_classical       # |β|² = P(Low)
    ax2.barh(['|α|² (High)', '|β|² (Low)'],
             [alpha_sq, beta_sq],
             color=['#1a1a1a', '#888888'], height=0.4, alpha=0.85)
    ax2.set_xlim(0, 1)
    ax2.set_title('QBism amplitudes\n|ψ⟩ = α|DO⟩ + β|No DO⟩', fontsize=10,
                  color='#1a1a1a', fontweight='bold')
    ax2.text(alpha_sq + 0.02, 0, f'|α|²={alpha_sq:.2f}',
             va='center', fontsize=9, color='#1a1a1a')
    ax2.text(beta_sq + 0.02, -0, f'|β|²={beta_sq:.2f}',
             va='center', fontsize=9, color='#555555')
    ax2.set_facecolor('#fafafa')
    ax2.spines[['top', 'right']].set_visible(False)
    ax2.tick_params(labelsize=9)

    # Superposition index
    ax3 = axes[2]
    si_color = '#BA7517' if superposition_index > 0.6 else '#3B6D11' if superposition_index < 0.3 else '#888888'
    ax3.barh(['Superposition\nindex'], [superposition_index],
             color=[si_color], height=0.35)
    ax3.barh(['Resolved\nstate'], [1 - superposition_index],
             color=['#dddddd'], height=0.35, left=[superposition_index])
    ax3.set_xlim(0, 1)
    ax3.set_title('Pre-decisional\nambiguity', fontsize=10, color='#BA7517', fontweight='bold')
    ax3.text(superposition_index + 0.02, 0,
             f'{superposition_index:.2f}', va='center', fontsize=11,
             fontweight='bold', color=si_color)
    si_label = 'High ambiguity' if superposition_index > 0.6 else 'Resolved' if superposition_index < 0.3 else 'Moderate'
    ax3.text(0.5, -0.6, si_label, ha='center', fontsize=9,
             color=si_color, transform=ax3.transData)
    ax3.set_facecolor('#fafafa')
    ax3.spines[['top', 'right']].set_visible(False)
    ax3.tick_params(labelsize=9)

    fig.suptitle(
        'Classical Bayesian (Variable Elimination) vs Quantum Bayesian (QBism) — Appendix Q',
        fontsize=10, color='#555555', y=1.02
    )
    plt.tight_layout()
    return fig
