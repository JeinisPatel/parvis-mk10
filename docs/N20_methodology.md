# PARVIS Mk 9 — Node 20 (Dangerous-Offender Designation Risk)
## Computation and doctrinal grounding

**Posture.** Node 20 is a normative-audit instrument, not a predictor. The
conditional priors and the post-inference combine encode *doctrinal*
commitments, not empirical recidivism frequencies. The output audits the
soundness of a designation inference; it does not recommend an outcome.

### Structure

- **Layer I — substantive inputs (N1–N4):** burden of proof (N1), violent
  history / pattern (N2), sexual-offence profile (N3), dynamic-risk cluster (N4).
- **Layer II — systemic distortion (N5–N19):** provenance and reasoning defects.
- **Layer III — N20:** the designation-risk posterior.

### The computation

Raw substantive risk aggregates the three Layer-I risk nodes, each discounted
by a doctrinally grounded gate:

- **N2 (pattern) × record_reliability**
- **N3 (sexual profile) × tool_validity**
- **N4 (dynamic risk) × treatment_gate × tool_validity**

**record_reliability** — discounts the pattern reading by the provenance of the
record. Each contributor carries its own authority: bail-driven wrongful pleas
(N7, *Antic*), ineffective assistance (N6, *G.D.B.*), over-policing and
surveillance (N17, *Le*), temporal distortion (N14, *Friesen*), the SCE-profile
audit (N18, *Morris / Ellis*), and judicial provenance — past or present bias and
Gladue misapplication (N12, *Gladue / Ipeelee*; *Ewert*). A floor preserves
minimum weight so no single combination zeroes the record.

**tool_validity (*Ewert*)** — discounts *both* the actuarial sexual-offence
reading (N3) and the dynamic-risk reading (N4) where the instrument is not
validated for the offender's population.

**treatment_gate (*Boutilier* §45)** — discounts dynamic risk (N4) so that
treatment failure cannot read as intractability unless culturally adequate
treatment was available. N4 is therefore *doubly* gated — Ewert validity and
Boutilier adequacy — reflecting two independent defects.

The remaining distortion nodes downweight effective risk through a combined
discount; a burnout multiplier (N14, *Friesen*) further attenuates stale
records.

**Pattern-is-not-threat clamp.** Section 753(1)(a) requires the pattern *and* a
likelihood of harm. A maximal pattern (N2) standing alone, without corroborating
dynamic or actuarial evidence, is capped below the threat band — encoding
*Steele* §§38–39 and the statutory structure so the pattern cannot, by itself,
carry a finding of threat.

**Collider discount (N19, optional).** Where over-policing and case-complexity
proxies are jointly high, the record partly measures surveillance rather than
propensity; an optional discount reflects that causal uncertainty.

### SPIO precondition (*Steele* / s. 752(a))

The computation runs at the designation stage and presumes the SPIO gate is
satisfied. SPIO is a *binary* precondition — any qualifying violence suffices —
and is not re-imported as a seriousness threshold into the pattern logic.

### Posterior to qualitative band (*Lifchus*)

The scalar posterior maps to a seven-band qualitative scale (equivocal band
0.42–0.58), grounded in *Lifchus*. Bands, not decimals, are the user-facing
output; numeric posteriors remain available but default off.

### Calibration

All weights are elicited normative priors, open to revision — not empirical
frequencies. PARVIS is a proof of concept for second-order legal audit, not a
deployable risk instrument.

---

*Revision — May 2026.* Five changes to the N20 computation: (1) the *Steele* /
SPIO precondition was documented; (2) a *Boutilier* treatment gate was added on
N4; (3) *Ewert* tool-validity was extended to N4; (4) a pattern-is-not-threat
clamp was added; (5) N12 judicial provenance was routed into record_reliability,
with N9 relocated from the distortion sum into the Boutilier gate.
