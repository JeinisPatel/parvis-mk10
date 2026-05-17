"""
PARVIS — Doctrinal Anchor Library
doctrine.py

Full doctrinal rules, cases, analytical tests, error patterns and key passages
for each of the 19 child nodes in the PARVIS Bayesian network.

This module is the primary reference used by document_analyzer.py when Claude
analyses uploaded legal documents against the PARVIS node schema.

HOW TO UPDATE:
  This file is designed to be maintained as a standalone legal reference.
  When new cases are decided, add them to the relevant node's
  AUTHORITIES or DEVELOPMENTS entries. No changes to any other module
  are required — document_analyzer.py reads this module dynamically.

  Each node entry follows this structure:
    NODE_DOCTRINE[node_id] = {
        "node_name":        str,
        "function":         str,   — what the node represents architecturally
        "primary_auth":     list,  — [{"citation", "para", "principle", "quote"}]
        "analytical_test":  str,   — the legal test the node applies
        "error_patterns":   list,  — recurring judicial errors
        "ewert_caveat":     str,   — Ewert-specific qualification (where applicable)
        "key_principle":    str,   — the core normative principle in one sentence
        "recent_dev":       list,  — recent developments (add as law evolves)
        "update_note":      str,   — flag for areas where law is actively evolving
    }

AUTHORS:  J.S. Patel, PhD Candidate and Barrister
          University of London (QMUL & LSE)
          Ethical AI Initiative
LAST UPDATED: April 2026
"""

# ── NODE 1: Burden of proof — global constraint ────────────────────────────────
# Node 1 is a structural control node, not a child node.
# Doctrinal content included for completeness.

# ── NODE DOCTRINE LIBRARY ──────────────────────────────────────────────────────
NODE_DOCTRINE = {

    # ── NODE 2: Serious violence / violent history ────────────────────────────
    2: {
        "node_name": "Serious violence / violent history",
        "function": "Primary aggravating factor for DO pattern designation under s.753 Criminal Code. "
                    "Subject to Node 1 beyond-reasonable-doubt threshold and temporal attenuation (Node 14).",
        "primary_auth": [
            {
                "citation": "Criminal Code RSC 1985 c C-46, s 753(1)(a)(i)",
                "para": "s.753(1)(a)(i)",
                "principle": "Designation requires a pattern of repetitive behaviour showing failure to restrain "
                             "violent or sexual impulses, and likelihood of causing death or severe harm.",
                "quote": "the offender has shown a pattern of repetitive behaviour, of which the offence for which "
                         "he or she has been convicted forms a part, showing a failure to restrain his or her "
                         "behaviour and a likelihood of causing death or injury to other persons."
            },
            {
                "citation": "R v Boutilier [2017] SCC 64",
                "para": "paras 27-40",
                "principle": "Pattern of behaviour distinguished from pattern of offences. Courts must assess "
                             "the underlying behavioural pattern, not merely convictions. Gladue applies at "
                             "all stages of DO proceedings including pattern analysis.",
                "quote": "the pattern is one of behaviour, not of offences... the offender need not have "
                         "been convicted of the behaviour in order for it to form part of the pattern."
            },
            {
                "citation": "R v Lyons [1987] 2 SCR 309",
                "para": "paras 34-45",
                "principle": "Foundational authority on constitutional validity of DO regime. "
                             "Risk assessment must be individualized, not actuarial alone.",
                "quote": None
            },
            {
                "citation": "R v Ipeelee [2012] SCC 13",
                "para": "para 84",
                "principle": "Gladue applies at ALL stages of DO proceedings. Systemic factors may "
                             "contextualise pattern of violence without negating it.",
                "quote": "Gladue principles apply at the dangerous offender stage of the proceedings."
            },
        ],
        "analytical_test": "Three-part test: (1) pattern of repetitive behaviour; (2) failure to restrain "
                           "violent/sexual impulses; (3) likelihood of causing death/severe harm OR (s.753(1)(b)) "
                           "pattern of persistent aggressive behaviour with indifference to consequences. "
                           "Pattern = behaviour, not convictions. Temporal attenuation mandatory for older records.",
        "error_patterns": [
            "Treating pattern of offences as equivalent to pattern of behaviour without behavioural analysis",
            "Failing to apply Gladue at the designation stage — treating violent history as context-free",
            "Treating temporally remote convictions as equivalent to recent ones without attenuation",
            "Relying on uncontested actuarial risk scores without independent behavioural analysis",
            "Failing to assess whether pattern reflects systemic over-criminalisation (over-policing, Node 17)",
        ],
        "ewert_caveat": "Where violent history is assessed through actuarial tools (VRAG, Static-99R), "
                        "Ewert requires cultural validation before those tools carry evidentiary weight.",
        "key_principle": "Pattern of violence is a behavioural not a convictions-based assessment, "
                         "and must be contextualised by Gladue/Morris factors at all stages.",
        "recent_dev": [
            "R v Natomagan 2022 ABCA 48 — Alberta CA overturned DO designation; failure to integrate "
            "Gladue into violence risk analysis constitutes error",
        ],
        "update_note": "Watch for new appellate decisions applying Boutilier's behavioural pattern test "
                       "in post-Natomagan and post-Bourdon jurisprudence.",
    },

    # ── NODE 3: Psychopathy assessment (PCL-R) ────────────────────────────────
    3: {
        "node_name": "Validated psychopathy assessment (PCL-R)",
        "function": "Encodes PCL-R-assessed psychopathy as a risk factor. Adversarial allegiance effects "
                    "and cultural invalidity for Indigenous/racialized populations require qualification.",
        "primary_auth": [
            {
                "citation": "Ewert v Canada [2018] SCC 30",
                "para": "paras 52-68",
                "principle": "PCL-R is among the instruments lacking established cultural validity for "
                             "Indigenous populations. Correctional Service of Canada breached duty of accuracy "
                             "by relying on it without cultural validation.",
                "quote": "the absence of evidence that these tools are valid for Indigenous people means "
                         "that their accuracy for Indigenous people is unknown."
            },
            {
                "citation": "R v Mohan [1994] 2 SCR 9",
                "para": "paras 17-25",
                "principle": "Expert evidence must be relevant, necessary, from a properly qualified expert, "
                             "and not excluded by policy. PCL-R evidence subject to Mohan threshold — "
                             "adversarial allegiance effects may undermine reliability.",
                "quote": None
            },
            {
                "citation": "Larsen et al (2024) Psychology Public Policy and Law",
                "para": "full study",
                "principle": "Review of 3,315 Canadian court decisions 1980-2023. Statistically significant "
                             "adversarial allegiance effects (d=1.08) — Crown-retained experts score "
                             "materially higher than defence-retained experts. Raises Mohan reliability concerns.",
                "quote": "prosecution-retained experts assigned materially higher psychopathy scores than "
                         "defence-retained experts... an effect size of 1.08 represents a large statistical difference."
            },
            {
                "citation": "R v Gracie 2019 ONCA 658",
                "para": "para 51",
                "principle": "Post-Ewert: courts characterised Ewert as establishing susceptibility to cultural "
                             "bias rather than categorical invalidity. Illustrates judicial absorption of Ewert "
                             "without transformative effect.",
                "quote": None
            },
        ],
        "analytical_test": "When PCL-R evidence is tendered: (1) Has the expert addressed Ewert cultural validity "
                           "concerns for Indigenous/racialized offender? (2) Is the retaining party disclosed and "
                           "allegiance effects acknowledged? (3) Does the score constitute evidence of "
                           "untreatability or merely a risk indicator? (4) Has the score been cross-referenced "
                           "against behavioural evidence independent of the instrument?",
        "error_patterns": [
            "Treating PCL-R score as quasi-determinative of future dangerousness — compressing uncertainty into label",
            "Accepting PCL-R without addressing Ewert cultural validity for Indigenous/racialized offender",
            "Failing to disclose adversarial allegiance — expert retained by Crown scoring higher than baseline",
            "Conflating psychopathy diagnosis with treatability determination (Boutilier: separate inquiries)",
            "Using PCL-R to override contextual mitigation from Gladue/Morris evidence",
        ],
        "ewert_caveat": "PCL-R has no established cultural validation for Indigenous populations. "
                        "Application without qualification is legally problematic per Ewert. "
                        "For Black and racialized offenders, similar concerns apply under Morris framework.",
        "key_principle": "PCL-R evidence is conditionally probative, not self-validating. "
                         "Adversarial allegiance effects and cultural invalidity require explicit acknowledgment "
                         "before the score can carry dispositive weight.",
        "recent_dev": [
            "Larsen (2025) — further empirical work on PCL-R in Canadian courts",
            "Growing jurisprudence on Mohan threshold applied to forensic risk tools post-Ewert",
        ],
        "update_note": "Highly active area. Watch for new Mohan-based challenges to PCL-R admissibility "
                       "and for appellate treatment of Larsen adversarial allegiance findings.",
    },

    # ── NODE 4: Sexual offence profile / Static-99R ───────────────────────────
    4: {
        "node_name": "Sexual offence profile (Static-99R)",
        "function": "Encodes sexual offence history and Static-99R actuarial score. Must not be applied "
                    "to Indigenous offenders without cultural qualification per Ewert v Canada [2018].",
        "primary_auth": [
            {
                "citation": "Ewert v Canada [2018] SCC 30",
                "para": "paras 52-75",
                "principle": "Static-99 (and Static-99R) is among the instruments lacking established cultural "
                             "validity for Indigenous populations. Reliance constitutes breach of s.24(1) CCRA.",
                "quote": "tools such as the Static-99... have not been shown to be accurate when applied "
                         "to Indigenous offenders."
            },
            {
                "citation": "Criminal Code RSC 1985 c C-46, s 753(1)(a)(ii)",
                "para": "s.753(1)(a)(ii)",
                "principle": "Sexual DO designation: pattern showing failure to restrain sexual impulses "
                             "and likelihood of causing injury, pain or other evil through future sexual offences.",
                "quote": None
            },
            {
                "citation": "Lee Hanson and Blais (2020) Canadian Psychology 61(1)",
                "para": "full study",
                "principle": "Static-99R predictive accuracy for Indigenous and White individuals — "
                             "study found differences in predictive validity across groups, supporting "
                             "Ewert concerns about cultural generalisability.",
                "quote": None
            },
        ],
        "analytical_test": "When Static-99R is tendered: (1) Has cultural validity been established for "
                           "this offender's population group per Ewert? (2) Are the static variables "
                           "(prior convictions, age at offence, victim characteristics) free from "
                           "systemic distortion (over-policing, coercive pleas)? (3) Has the expert "
                           "contextualised the score against Gladue/Morris factors?",
        "error_patterns": [
            "Applying Static-99R to Indigenous offender without addressing Ewert cultural validity",
            "Treating Static-99R score as independent evidence when inputs derived from distorted record",
            "Failing to cross-reference static score against dynamic factors and contextual evidence",
            "Using elevated Static-99R to override treatability evidence",
        ],
        "ewert_caveat": "Direct Ewert application — Static-99R is specifically named. "
                        "Any reliance on Static-99R for Indigenous offenders without demonstrated "
                        "cultural validation is legally problematic.",
        "key_principle": "Static-99R is not culturally neutral. Its probative force is conditional "
                         "on demonstrated validity for the population to which it is applied.",
        "recent_dev": [],
        "update_note": "Watch for post-Ewert decisions requiring explicit cultural validation evidence "
                       "before Static-99R is admitted in DO proceedings.",
    },

    # ── NODE 5: Culturally invalid risk tools ─────────────────────────────────
    5: {
        "node_name": "Culturally invalid risk tools",
        "function": "Flags that actuarial tools have been applied without cultural qualification. "
                    "HIGH = distortion present → REDUCES effective DO risk by flagging evidentiary contamination. "
                    "This node does not increase dangerousness — it reduces the weight of upstream risk signals.",
        "primary_auth": [
            {
                "citation": "Ewert v Canada [2018] SCC 30",
                "para": "paras 40-80",
                "principle": "Actuarial tools including PCL-R, VRAG, SORAG, Static-99, LSI-R lack established "
                             "cultural validity for Indigenous populations. Correctional Service of Canada "
                             "breached s.24(1) CCRA by relying on unvalidated instruments. "
                             "Accuracy for Indigenous people is unknown in absence of validation evidence.",
                "quote": "The CCRA imposes a positive obligation on CSC to ensure the accuracy of information "
                         "it uses in making decisions that affect offenders... where CSC uses risk assessment "
                         "tools whose accuracy for Indigenous offenders is unproven, it fails this obligation."
            },
            {
                "citation": "Venner et al (2021) International Journal of Forensic Mental Health 20(3)",
                "para": "full study",
                "principle": "Even without individual rater bias, Western-normed risk instruments inflate "
                             "scores for Indigenous and racialized offenders through variable structure.",
                "quote": None
            },
            {
                "citation": "Liell Fisher and Jones (2023) Routledge — Challenging Bias in Forensic Assessment",
                "para": "Chapter on cultural bias",
                "principle": "Forensic risk tools exhibit elevated false positive rates for marginalised "
                             "populations — instruments conflate systemic exposure with individual pathology.",
                "quote": None
            },
            {
                "citation": "R v Natomagan 2022 ABCA 48",
                "para": "paras 45-60",
                "principle": "Alberta CA applied Ewert reasoning at sentencing stage. Trial judge failed to "
                             "interrogate cultural validity of actuarial tools. DO designation overturned.",
                "quote": None
            },
        ],
        "analytical_test": "Has cultural validity been demonstrated for the specific population to which the "
                           "tool is applied? If not: (1) Flag Ewert non-compliance; (2) Reduce evidentiary "
                           "weight of tool output; (3) Assess whether static variables in tool reflect "
                           "structural disadvantage rather than individual propensity; "
                           "(4) Require independent behavioural evidence.",
        "error_patterns": [
            "Accepting actuarial tools as presumptively reliable absent cultural validation — reversing Ewert burden",
            "Treating post-Ewert expert reassurance of 'moderate predictive accuracy' as sufficient validation",
            "Allowing actuarial output to override or suppress Gladue/Morris contextual evidence",
            "Failing to interrogate whether tool inputs (criminal history) are themselves distorted",
            "Circular reasoning: using actuarial score derived from distorted record to validate distorted record",
        ],
        "ewert_caveat": "This node IS the Ewert node. Every instance of unvalidated actuarial tool "
                        "application for Indigenous or racialized offenders engages this node.",
        "key_principle": "Actuarial neutrality is often illusory — bias is embedded in design assumptions "
                         "and validation samples, not merely in individual scoring. High distortion here "
                         "reduces the probative weight of all upstream actuarial risk evidence.",
        "recent_dev": [
            "Growing body of empirical work corroborating Ewert — false positive rates for marginalised populations",
            "No actuarial tool used in Canadian DO proceedings has yet demonstrated cultural validation "
            "to a clearly articulated threshold as of April 2026",
        ],
        "update_note": "HIGHLY ACTIVE AREA. Monitor for: (1) any tool achieving demonstrated cultural "
                       "validation; (2) appellate decisions setting cultural validation thresholds; "
                       "(3) new Larsen-type empirical studies on tool performance.",
    },

    # ── NODE 6: Ineffective assistance of counsel ─────────────────────────────
    6: {
        "node_name": "Ineffective assistance of counsel",
        "function": "Failure to investigate Gladue/SCE factors, retain cultural experts, or challenge "
                    "culturally invalid risk assessments. Constitutional error contaminating evidentiary record.",
        "primary_auth": [
            {
                "citation": "R v GDB [2000] 1 SCR 520",
                "para": "paras 26-34",
                "principle": "Two-part ineffective assistance test: (1) deficient performance — falling below "
                             "standard of reasonable professional judgment; (2) prejudice — reasonable "
                             "probability that but for the errors the result would have been different.",
                "quote": "counsel's acts or omissions that are alleged to constitute incompetence must be "
                         "assessed against a standard of reasonable professional judgment."
            },
            {
                "citation": "R v Gladue [1999] 1 SCR 688",
                "para": "paras 80-93",
                "principle": "Failure to investigate and present Gladue factors is a distinct category "
                             "of counsel deficiency in Indigenous offender cases. Gladue investigation "
                             "is not optional — it is part of the constitutional obligation of counsel.",
                "quote": None
            },
            {
                "citation": "Tolppanen Report (2018) Federal-Provincial-Territorial Heads of Prosecutions",
                "para": "full report",
                "principle": "Structural pressures — high caseloads, limited disclosure access, "
                             "constrained client-lawyer communication — produce plea advice driven by "
                             "systemic constraint rather than evidentiary assessment. "
                             "Disproportionately affects Indigenous, Black and socially marginalised accused.",
                "quote": None
            },
            {
                "citation": "R v EB Ontario Superior Court",
                "para": "paras 15-22",
                "principle": "Gladue considerations at bail limited to informing bail planning and "
                             "contextualising prior record. May not be used as tacit admission or "
                             "predictor of reoffending. Counsel must police this boundary.",
                "quote": None
            },
        ],
        "analytical_test": "Did counsel: (1) identify Indigenous/racialized status and trigger Gladue/Morris "
                           "obligations? (2) obtain or request Gladue/IRCA report? (3) retain cultural expert "
                           "where actuarial tools applied? (4) challenge PCL-R/Static-99R cultural validity "
                           "per Ewert? (5) advise accurately on plea consequences including s.12 Canada "
                           "Evidence Act credibility exposure? If any answer is No — assess prejudice.",
        "error_patterns": [
            "Failing to identify Indigenous status and trigger Gladue investigation",
            "Failing to request Gladue report or retain cultural expert",
            "Failing to challenge culturally invalid actuarial evidence per Ewert",
            "Providing inaccurate plea advice driven by systemic pressure rather than evidentiary assessment",
            "Failing to advise on s.12 Canada Evidence Act credibility impeachment risk",
            "Omitting FASD assessment where neurodevelopmental indicators present",
        ],
        "ewert_caveat": "Failure to challenge culturally invalid actuarial tools per Ewert is a distinct "
                        "head of potential ineffective assistance. Counsel must know and apply Ewert.",
        "key_principle": "Effective assistance in Indigenous/racialized offender cases requires culturally "
                         "competent representation — not merely formal compliance with procedural steps.",
        "recent_dev": [
            "Growing recognition that cultural competence is part of the standard of professional judgment",
        ],
        # Mark 8 push two — GDB analytical scaffold for document analyser.
        # When IAC-relevant documents (transcripts, sentencing reasons,
        # post-conviction review materials) are uploaded, the analyser uses
        # this scaffold to systematically extract evidence and produce
        # structured GDB findings.
        "gdb_analytical_scaffold": {
            "purpose": "Map document evidence onto the four sub-threshold IAC "
                       "indicators and the GDB constitutional threshold. The "
                       "user retains final discretion; the analyser proposes.",
            "stage_one_deficient_performance": {
                "test": "R v GDB 2000 SCC 22 paras 26-27: counsel's conduct fell "
                        "below the standard of competent representation in the "
                        "circumstances, considering the difficulty of the case "
                        "and the resources available.",
                "indicators_to_extract": [
                    {
                        "name": "n6_no_sce",
                        "label": "SCE not submitted",
                        "evidence_to_look_for": [
                            "Sentencing reasons silent on Indigenous status, "
                            "racialised background, or social context",
                            "No Gladue or IRCA report referenced in the record",
                            "Defence submissions on sentence omit systemic factors "
                            "(s.718.2(e), Gladue, Ipeelee, Morris)",
                            "Court notes counsel provided no contextual material",
                        ],
                        "evidentiary_threshold": "Set true where the record "
                            "affirmatively shows SCE was not advanced. Do not "
                            "set true merely because the document does not mention "
                            "SCE — absence of evidence is not evidence of absence.",
                    },
                    {
                        "name": "n6_inadequate_counsel",
                        "label": "Counsel culturally inadequate",
                        "evidence_to_look_for": [
                            "Counsel's submissions reveal unfamiliarity with "
                            "applicable doctrine (Gladue/Ipeelee/Morris/Ewert)",
                            "Counsel fails to challenge culturally invalid "
                            "actuarial evidence per Ewert paras 47, 67",
                            "Counsel fails to advise on plea consequences for "
                            "Indigenous accused (s.12 Canada Evidence Act)",
                            "Counsel submissions misstate the legal standard "
                            "for systemic factor consideration",
                        ],
                        "evidentiary_threshold": "Set true where the document "
                            "shows specific instances of counsel falling below "
                            "the culturally competent representation standard.",
                    },
                ],
            },
            "stage_one_two_mixed": {
                "test": "Judicial criticism on the record evidences both "
                        "deficient performance (stage 1) and likely prejudice "
                        "(stage 2).",
                "indicators_to_extract": [
                    {
                        "name": "n6_judicial_criticism",
                        "label": "Judicial criticism of representation",
                        "evidence_to_look_for": [
                            "Sentencing judge expresses concern about quality "
                            "of advocacy on the record",
                            "Appellate court notes deficient representation in "
                            "reasons",
                            "Trial judge raises competence concerns sua sponte",
                            "Judicial comments on counsel's failure to make "
                            "obvious available arguments",
                        ],
                        "evidentiary_threshold": "Set true where the document "
                            "contains explicit judicial expression of concern "
                            "about counsel's representation. Implicit criticism "
                            "does not meet this threshold.",
                    },
                ],
            },
            "stage_two_prejudice": {
                "test": "R v GDB 2000 SCC 22 para 28: there is a reasonable "
                        "probability that, but for counsel's deficient "
                        "performance, the result of the proceeding would have "
                        "been different. Prejudice can be procedural (the "
                        "trial process was unfair) or outcome-based.",
                "indicators_to_extract": [
                    {
                        "name": "n6_disproportionate",
                        "label": "Procedural outcome disproportionate",
                        "evidence_to_look_for": [
                            "Sentence imposed markedly outside the range for "
                            "comparable cases (consult sentencing-range "
                            "jurisprudence in the relevant jurisdiction)",
                            "Disposition appears inconsistent with offence "
                            "gravity once mitigation is properly weighted",
                            "Plea terms suggest the accused did not understand "
                            "the consequences",
                            "Outcome inconsistent with what competent counsel "
                            "would have likely achieved",
                        ],
                        "evidentiary_threshold": "Set true where the document "
                            "permits a comparator-based assessment that the "
                            "outcome falls materially outside the expected "
                            "range. Speculative disproportion does not meet "
                            "this threshold.",
                    },
                ],
            },
            "constitutional_threshold": {
                "test": "R v GDB 2000 SCC 22 paras 26-29: BOTH stages must be "
                        "made out — deficient performance AND prejudice — for "
                        "constitutional IAC to be established. The analyser "
                        "proposes; the user makes the constitutional finding.",
                "flag_name": "n6_gdb_threshold_met",
                "label": "GDB IAC threshold made out",
                "decision_rule": "Set true ONLY where (a) the document evidence "
                    "supports at least one stage 1 indicator (deficient "
                    "performance), AND (b) the document evidence supports the "
                    "stage 2 indicator (prejudice) OR the judicial-criticism "
                    "mixed-evidence indicator captures both stages, AND (c) "
                    "the totality of the deficient performance is grave enough "
                    "to support a constitutional finding rather than merely "
                    "sub-threshold inadequacy. When in doubt, leave unset and "
                    "let the user decide.",
                "user_discretion_note": "The constitutional finding belongs to "
                    "the user. If the analyser sets this true and the user "
                    "disagrees, the user unticks. If the analyser leaves it "
                    "unset and the user assesses the evidence supports a "
                    "stronger finding, the user ticks.",
            },
            "narrative_summary_format": "Produce a 2-3 sentence summary in the "
                "doc_analysis prose output describing what GDB-relevant evidence "
                "was found and which indicators are supported. Format: "
                "'GDB analysis: [evidence summary]. Indicators recommended: "
                "[list]. Constitutional threshold: [recommended/not recommended].'",
        },
        "update_note": "Monitor for appellate decisions specifically addressing Ewert challenges as a "
                       "required component of effective assistance.",
    },

    # ── NODE 7: Bail-denial / wrongful guilty plea cascade ────────────────────
    7: {
        "node_name": "Bail-denial → wrongful guilty plea cascade",
        "function": "Pre-trial detention generates coercive incentives to plead guilty. "
                    "Resulting criminal record cannot reliably be treated as evidence of guilt, "
                    "future risk, or absence of rehabilitation.",
        "primary_auth": [
            {
                "citation": "R v Antic [2017] SCC 27",
                "para": "paras 1-5, 67-69",
                "principle": "Presumption of release is fundamental. Ladder principle: each rung must be "
                             "considered before detention. Detention should be exceptional not routine.",
                "quote": "The right not to be denied reasonable bail without just cause is a fundamental "
                         "right. Release is the default; detention the exception."
            },
            {
                "citation": "R v Zora [2020] SCC 14",
                "para": "paras 3-8, 83-90",
                "principle": "Bail conditions must be justified, minimally restrictive, and not set up "
                             "to fail. Conditions that predictably generate breaches inflate criminal records.",
                "quote": None
            },
            {
                "citation": "Criminal Code RSC 1985 c C-46, s 493.2",
                "para": "s.493.2",
                "principle": "Justice of the peace must give particular attention to the circumstances "
                             "of accused who is Indigenous or belonging to a vulnerable population. "
                             "Mandatory consideration at bail.",
                "quote": "give particular attention to the circumstances of accused persons who belong "
                         "to a vulnerable population, including those who are Indigenous."
            },
            {
                "citation": "Feeley M (1979) The Process Is the Punishment",
                "para": "full monograph",
                "principle": "Most significant burdens of criminal process — detention, delay, legal expense — "
                             "are imposed prior to adjudication and often outweigh the formal sentence. "
                             "Process functions as punishment generating coercive plea incentives.",
                "quote": None
            },
            {
                "citation": "Iacobucci F (2013) First Nations Representation on Ontario Juries",
                "para": "relevant sections",
                "principle": "Indigenous accused may plead guilty based on reasonable belief they will "
                             "not receive impartial treatment — rational response to systemic conditions "
                             "not evidence of guilt.",
                "quote": None
            },
        ],
        "analytical_test": "Was pre-trial detention: (1) longer than 30 days? (2) longer than 90 days "
                           "(coercive plea threshold per thesis CPT)? (3) accompanied by onerous release "
                           "conditions that predictably generated breaches? Did detention generate "
                           "administrative charges that inflated the criminal record? "
                           "Did accused plead guilty while detained without realistic bail prospect?",
        "error_patterns": [
            "Treating guilty plea as reliable admission of guilt where entered under coercive detention",
            "Using plea-generated criminal record to assess risk without examining bail conditions",
            "Failing to apply s.493.2 direction to consider Indigenous status at bail",
            "Treating bail breach convictions as evidence of persistent criminality without examining "
            "whether conditions were structurally set to fail (Zora)",
        ],
        "ewert_caveat": None,
        "key_principle": "A guilty plea entered under conditions of pre-trial coercion is evidentially "
                         "unreliable as an indicator of culpability, persistence, or risk. "
                         "The process is the punishment — detention inflates the record independently "
                         "of underlying criminal propensity.",
        "recent_dev": [
            "Growing recognition in appellate courts that bail denial for Black and Indigenous accused "
            "is disproportionate and generates record distortion",
        ],
        "update_note": "Monitor for s.493.2 applications in bail proceedings and appellate treatment "
                       "of coercive plea records in DO designation analysis.",
    },

    # ── NODE 9: FASD — dual factor ────────────────────────────────────────────
    9: {
        "node_name": "FASD — dual factor node",
        "function": "FASD operates simultaneously as: (1) mitigation reducing moral blameworthiness; "
                    "(2) risk modulator affecting treatment responsivity and plea reliability. "
                    "Treating FASD as pure risk factor is doctrinal error.",
        "primary_auth": [
            {
                "citation": "R v Ipeelee [2012] SCC 13",
                "para": "paras 73-75",
                "principle": "FASD as reducing moral culpability — offender less responsible for "
                             "conduct shaped by neurodevelopmental condition. Must be considered in "
                             "Gladue analysis for Indigenous offenders.",
                "quote": None
            },
            {
                "citation": "R v Parranto [2021] SCC 46",
                "para": "paras 55-62",
                "principle": "Neurodevelopmental conditions including FASD engage proportionality under "
                             "s.718.1 — degree of responsibility reduced where cognitive capacity "
                             "constrained offender's autonomous choice.",
                "quote": None
            },
            {
                "citation": "Ralston BA (2021) The Gladue Principles BC First Nations Justice Council",
                "para": "FASD section",
                "principle": "FASD as a Gladue factor — disproportionate prevalence in Indigenous "
                             "population; diagnostic barriers; treatment responsivity implications.",
                "quote": None
            },
        ],
        "analytical_test": "Has FASD been formally assessed? If diagnosed: (1) Does it reduce moral "
                           "culpability by constraining autonomous choice? (2) Does it affect treatment "
                           "responsivity — and if so, has treatment been designed accordingly? "
                           "(3) Was FASD present at time of plea — affecting voluntariness? "
                           "If suspected but undiagnosed: (4) Were there indicators counsel should "
                           "have investigated? (5) Is absence of diagnosis a systemic access failure?",
        "error_patterns": [
            "Treating FASD as aggravating by inferring intractability from neurodevelopmental persistence",
            "Using FASD to justify DO designation (untreatable) without addressing treatment availability",
            "Failing to obtain FASD assessment where indicators present — counsel deficiency",
            "Treating FASD-linked cognitive vulnerability as choice-based criminal propensity",
            "Ignoring FASD as a plea reliability factor where guilty plea entered",
        ],
        "ewert_caveat": "Actuarial tools that treat FASD-related behavioural markers as risk indicators "
                        "without recognising their neurodevelopmental origin compound Ewert concerns.",
        "key_principle": "FASD is simultaneously mitigating (reducing moral blameworthiness) and a "
                         "structural factor requiring specialised treatment — not evidence of "
                         "untreatability or intractability.",
        "recent_dev": [
            "Increased judicial recognition of FASD as Gladue factor",
            "Growing clinical literature on FASD-specific treatment responsivity",
        ],
        "update_note": "Monitor for decisions addressing FASD + plea reliability and FASD + "
                       "treatability in DO proceedings.",
    },

    # ── NODE 10: Intergenerational trauma ─────────────────────────────────────
    10: {
        "node_name": "Intergenerational trauma",
        "function": "Residential school legacy, forced displacement, cultural genocide and intergenerational "
                    "impacts. Mandatory Gladue factor. Failure to document is reversible error.",
        "primary_auth": [
            {
                "citation": "R v Gladue [1999] 1 SCR 688",
                "para": "paras 67-68, 90",
                "principle": "Courts must consider: (a) unique systemic or background factors that may "
                             "have played a part in bringing the Indigenous offender before the courts; "
                             "(b) types of sentencing procedures and sanctions which may be appropriate "
                             "in the circumstances for the offender because of his or her particular "
                             "Indigenous heritage or connection.",
                "quote": "the court must consider: (a) the unique systemic or background factors which "
                         "may have played a part in bringing the particular aboriginal offender before "
                         "the courts; and (b) the types of sentencing procedures and sanctions which "
                         "may be appropriate in the circumstances."
            },
            {
                "citation": "R v Ipeelee [2012] SCC 13",
                "para": "paras 59-83",
                "principle": "Sentencing judges MUST take judicial notice of systemic and background "
                             "factors affecting Indigenous peoples. No offender-specific proof of causation "
                             "required. Failure to engage is legal error not discretion.",
                "quote": "Judges must take judicial notice of such matters as the history of colonialism, "
                         "displacement, and residential schools and how that history continues to "
                         "translate into lower educational attainment, lower incomes, higher "
                         "unemployment, higher rates of substance abuse and suicide, and of course, "
                         "higher levels of incarceration for Aboriginal peoples."
            },
            {
                "citation": "National Inquiry into MMIWG Final Report (2019)",
                "para": "Vol 1a, pp 113, 53",
                "principle": "Links over-incarceration to ongoing colonial violence. Sentencing that "
                             "foregrounds vulnerability without contextual recalibration risks transforming "
                             "structural awareness into heightened denunciation.",
                "quote": None
            },
            {
                "citation": "Milward D (2018) 66:3 Crim LQ 254",
                "para": "full article",
                "principle": "Residential School Syndrome in sentencing of Indigenous offenders — "
                             "intergenerational trauma must inform culpability, not merely accompany it.",
                "quote": None
            },
            {
                "citation": "Denis-Boileau MA (2021) 54:3 UBC Law Review 537",
                "para": "statistical findings",
                "principle": "In over 50% of cases reviewed, judges ignored or downplayed s.718.2(e) "
                             "due to offence seriousness. In 15% courts explicitly refused to consider "
                             "Indigenous background on grounds that offence gravity overrode those considerations.",
                "quote": None
            },
        ],
        "analytical_test": "Are any of the following documented: residential school attendance (direct "
                           "or familial); Sixties Scoop/child welfare removal; forced community "
                           "displacement; chronic poverty; housing instability; disrupted education; "
                           "family violence; cultural disconnection; substance abuse linked to trauma; "
                           "loss of language or cultural identity? "
                           "If yes: was this documented in Gladue report? Was it meaningfully integrated "
                           "into culpability assessment (not merely acknowledged)?",
        "error_patterns": [
            "Acknowledging intergenerational trauma without revising culpability assessment",
            "Treating offence seriousness as Gladue override (Gladue/Ipeelee directly contrary)",
            "Requiring proof of causation between trauma and offence (Gladue: causation not required)",
            "Symbolic compliance — citing Gladue report without integrating its findings",
            "Applying parity principle to erase individualized contextual assessment",
            "Treating cultural disconnection as reducing entitlement to Gladue analysis (Bourdon error)",
        ],
        "ewert_caveat": "Actuarial tools that encode intergenerational disadvantage as risk markers "
                        "(employment, education, prior contact) without recognising structural origins "
                        "convert Gladue factors into risk signals — directly contrary to Ipeelee.",
        "key_principle": "Intergenerational trauma is not mitigating context — it is a mandatory "
                         "inferential lens through which culpability and risk must be assessed. "
                         "Acknowledgment without recalibration is doctrinal error.",
        "recent_dev": [
            "R v Bourdon 2024 ONCA 8 — ONCA upheld DO despite Gladue report, citing limited "
            "cultural engagement. Illustrates limits of Gladue where court requires cultural "
            "authenticity performance. Contested decision.",
            "R v Natomagan 2022 ABCA 48 — contrast: ABCA overturned DO designation for failure "
            "to integrate Gladue into risk analysis.",
        ],
        "update_note": "CRITICAL SPLIT emerging between ONCA (Bourdon) and ABCA (Natomagan) on "
                       "depth of Gladue integration required at DO stage. Monitor for SCC leave "
                       "or further appellate development.",
    },

    # ── NODE 11: Absence of culturally grounded treatment ────────────────────
    11: {
        "node_name": "Absence of culturally grounded treatment",
        "function": "Unavailability of Indigenous-specific rehabilitative programming. "
                    "Absence is systemic failure, not offender characteristic. "
                    "Cannot be used as evidence of untreatable risk per Natomagan.",
        "primary_auth": [
            {
                "citation": "R v Natomagan 2022 ABCA 48",
                "para": "paras 55-75",
                "principle": "Absence of culturally appropriate rehabilitative and treatment programming "
                             "cannot be weighed against the accused where such programming is structurally "
                             "unavailable. Structural scarcity cannot be leveraged against accused. "
                             "Actuarial certainty cannot displace contextual legal obligations.",
                "quote": "the absence of culturally appropriate rehabilitative and treatment programming "
                         "could not be weighed against the accused where such programming is "
                         "structurally unavailable."
            },
            {
                "citation": "R v Boutilier [2017] SCC 64",
                "para": "paras 72-85",
                "principle": "Treatability inquiry is part of the designation analysis — not merely "
                             "the disposition stage. Gladue applies to treatability. "
                             "Where treatment is unavailable, courts must not infer untreatability.",
                "quote": None
            },
            {
                "citation": "R v Ipeelee [2012] SCC 13",
                "para": "para 84",
                "principle": "Courts cannot treat absence of Indigenous-appropriate treatment as "
                             "evidence of poor rehabilitation prospects where the system has failed "
                             "to provide appropriate programs.",
                "quote": None
            },
        ],
        "analytical_test": "Was culturally appropriate programming: (1) available in the institution? "
                           "(2) offered to the offender? (3) refused by the offender? "
                           "If programming was unavailable: absence must not be characterised as "
                           "refusal or evidence of untreatability. "
                           "If offered and refused: genuine refusal must be distinguished from "
                           "culturally inappropriate program design.",
        "error_patterns": [
            "Treating programming absence as evidence of unwillingness to rehabilitate (direct Natomagan error)",
            "Characterising failure to engage with Western-model programming as resistance to treatment",
            "Using absence of rehabilitation progress as DO designation anchor without assessing "
            "whether programs were available, culturally appropriate, or structurally accessible",
            "Failing to distinguish genuine treatment refusal from structural unavailability",
        ],
        "ewert_caveat": "Culturally inappropriate programming designed for non-Indigenous populations "
                        "compounds Ewert concerns — failing to engage such programs is not evidence "
                        "of untreatability any more than failing to score well on culturally "
                        "invalid actuarial tools.",
        "key_principle": "Treatability must be assessed against availability, not assumed from absence "
                         "of engagement. The system's failure to provide culturally appropriate "
                         "programming cannot be imputed to the offender as evidence of dangerousness.",
        "recent_dev": [
            "Natomagan 2022 ABCA 48 is the leading authority — closely watch subsequent applications",
        ],
        "update_note": "Monitor for decisions citing Natomagan to challenge DO designations based "
                       "on rehabilitation failure where programming was unavailable.",
    },

    # ── NODE 12: Judicial misapplication of the Gladue tetrad ─────────────────
    12: {
        "node_name": "Judicial misapplication of the Gladue tetrad",
        "function": "Failure to apply Gladue, Morris, Ellis, or Ewert — treating systemic factors as "
                    "aggravating, failing to commission a report, or importing Morris causation "
                    "threshold into Gladue contexts. Directly inflates DO designation risk.",
        "primary_auth": [
            {
                "citation": "R v Gladue [1999] 1 SCR 688",
                "para": "paras 80-93",
                "principle": "Positive legal obligation on sentencing courts to consider systemic and "
                             "background factors. Not discretionary. Applies in all sentencing contexts.",
                "quote": None
            },
            {
                "citation": "R v Morris 2021 ONCA 680",
                "para": "para 97",
                "principle": "Para 97 connection requirement: SCE for racialized offenders must bear "
                             "a discernible connection to offence or moral culpability. "
                             "NOT a causation requirement — an evidentiary linkage threshold. "
                             "Misapplication: importing causation test where connection test governs.",
                "quote": "There must, however, be some connection between the overt and systemic racism "
                         "identified in the community and the circumstances or events that are said to "
                         "explain or mitigate the criminal conduct in issue."
            },
            {
                "citation": "R v Ellis 2022 BCCA 278",
                "para": "paras 30-55",
                "principle": "Extends contextual reasoning to non-racialized socially disadvantaged "
                             "offenders. Does not create new doctrinal category — extends existing logic.",
                "quote": None
            },
            {
                "citation": "R v Bourdon 2024 ONCA 8",
                "para": "paras 40-65",
                "principle": "ONCA upheld DO designation despite Gladue report — limited cultural "
                             "engagement cited. Illustrates risk of cultural authenticity threshold "
                             "being imposed contrary to Ipeelee.",
                "quote": None
            },
            {
                "citation": "Ewing B and Kerr L (2023) 74 University of Toronto Law Journal",
                "para": "full article",
                "principle": "Reconstructing Gladue — courts reduce Gladue to demographic lever "
                             "rather than moral and normative recalibration of blameworthiness. "
                             "Three failure modes: (1) demographic lever not moral recalibration; "
                             "(2) background confined to periphery; (3) doctrinal confusion "
                             "re serious offences.",
                "quote": None
            },
        ],
        "analytical_test": "Six error categories per thesis Chapter 1 typology: "
                           "(1) Did court treat offence seriousness as Gladue override? "
                           "(2) Did court require causal nexus where connection test governs (Morris error)? "
                           "(3) Tokenistic/formalistic application — cited but not integrated? "
                           "(4) Parity principle misapplied to erase contextual differentiation? "
                           "(5) Sequencing error — SCE considered only after seriousness fixed? "
                           "(6) Burden-shifting — required accused to prove relevance of systemic factors? "
                           "Each Yes = Gladue misapplication present.",
        "error_patterns": [
            "Seriousness as Gladue override — most common error (Denis-Boileau: 50%+ of cases)",
            "Importing Morris causation threshold into Gladue context (Morris Audit: 180 cases)",
            "Acknowledging SCE report without revising culpability assessment (belief stasis)",
            "Treating cultural authenticity as threshold for Gladue entitlement (Bourdon concern)",
            "Applying parity principle identically to differently situated offenders",
            "Deferring Gladue to disposition stage only — not integrating at designation stage",
        ],
        "ewert_caveat": "Gladue misapplication and Ewert non-compliance frequently co-occur — "
                        "courts that apply culturally invalid tools without qualification are "
                        "also likely failing to integrate Gladue factors meaningfully.",
        "key_principle": "Gladue imposes a mandatory obligation of belief revision — not merely "
                         "acknowledgment. Any gap between formal recognition and substantive "
                         "integration constitutes legal error.",
        "recent_dev": [
            "Morris Audit (Appendix A of thesis): 180 cases — systematic misapplication of para 97 "
            "as causation test rather than connection threshold",
            "Bourdon 2024 ONCA 8 — contested decision on cultural authenticity",
            "Natomagan 2022 ABCA 48 — successful challenge based on Gladue misapplication",
        ],
        "update_note": "MOST ACTIVE DOCTRINAL NODE. Monitor Morris para 97 applications weekly. "
                       "The causation/connection distinction is the central doctrinal controversy "
                       "in contemporary Canadian sentencing law.",
    },

    # ── NODE 13: Gaming risk detector ─────────────────────────────────────────
    13: {
        "node_name": "Gaming risk detector",
        "function": "Causal node detecting strategic manipulation of rehabilitation signals. "
                    "Applies inverse prior when rehabilitation evidence is anomalously positive "
                    "relative to institutional context and PCL-R profile.",
        "primary_auth": [
            {
                "citation": "R v Boutilier [2017] SCC 64",
                "para": "paras 50-65",
                "principle": "Treatability and rehabilitation evidence must be assessed for authenticity. "
                             "Courts may consider whether rehabilitation progress is genuine or "
                             "strategically manufactured for DO proceedings.",
                "quote": None
            },
        ],
        "analytical_test": "Is rehabilitation evidence: (1) anomalously positive relative to PCL-R score "
                           "and institutional behaviour record? (2) temporally concentrated in the period "
                           "immediately preceding DO application? (3) inconsistent with institutional "
                           "behaviour outside formal rehabilitation programming? "
                           "If yes to multiple: gaming risk elevated. Caveat — Natomagan: "
                           "must distinguish strategic gaming from genuine engagement where "
                           "culturally appropriate programs recently became available.",
        "error_patterns": [
            "Treating all rehabilitation evidence as strategic without individualized assessment",
            "Applying gaming suspicion disproportionately to Indigenous offenders whose "
            "engagement with Western programming may legitimately differ",
        ],
        "ewert_caveat": None,
        "key_principle": "Gaming detection must be applied with caution and must not become a "
                         "vehicle for discounting all rehabilitation evidence for high-PCL-R offenders.",
        "recent_dev": [],
        "update_note": "Low doctrinal development — primarily a clinical/expert evidence question.",
    },

    # ── NODE 14: Over-policing / epistemic contamination ──────────────────────
    14: {
        "node_name": "Over-policing & epistemic contamination",
        "function": "Inflated criminal record as artefact of systemic over-surveillance. "
                    "Record length reflects policing intensity, not intrinsic criminality. "
                    "Structural feedback loop: prior contact → elevated surveillance → denser record.",
        "primary_auth": [
            {
                "citation": "R v Le [2019] SCC 34",
                "para": "paras 2-10, 84-100",
                "principle": "SCC recognised racial profiling and carding as unconstitutional state conduct. "
                             "Police contact driven by race rather than conduct — contact-generated records "
                             "cannot be treated as neutral indicators of criminality.",
                "quote": "anti-Black racism... has profound effects on the interaction between police "
                         "and Black Canadians."
            },
            {
                "citation": "R v Morris 2021 ONCA 680",
                "para": "paras 75-83",
                "principle": "ONCA recognised that anti-Black racism in policing and criminal justice "
                             "system generates criminal records that reflect systemic racism rather "
                             "than individual propensity. SCE must address this structural reality.",
                "quote": None
            },
            {
                "citation": "Ontario Human Rights Commission — A Collective Impact (2020)",
                "para": "full report",
                "principle": "Documented anti-Black racial bias in Toronto policing — Black individuals "
                             "3x more likely to be stopped and carded than white individuals. "
                             "Enforcement intensity varies by community demographic.",
                "quote": None
            },
        ],
        "analytical_test": "Is the offender from an over-policed community? Is the criminal record "
                           "disproportionately dense relative to offence severity? Do record entries "
                           "reflect enforcement-intensive policing (possession charges, street-level "
                           "offences) rather than serious violent conduct? Has Le/Morris been applied "
                           "to contextualise the record?",
        "error_patterns": [
            "Treating record density as evidence of persistent criminality without examining policing context",
            "Using criminal history volume from over-policed community as actuarial risk input without qualification",
            "Failing to apply Le and Morris to contextualise anti-Black/Indigenous policing patterns",
            "Allowing actuarial tools to convert enforcement-generated record into dangerousness indicator",
        ],
        "ewert_caveat": "Actuarial tools that use criminal history length as a static variable "
                        "embed over-policing effects directly into risk scores — compounding Ewert concerns.",
        "key_principle": "Record length reflects detection probability, not criminal propensity. "
                         "Over-policed communities generate artificially dense records that "
                         "systematically inflate actuarial risk scores.",
        "recent_dev": [
            "Growing Morris applications addressing anti-Black policing as SCE",
            "OHRC and other institutional reports providing evidentiary foundation for Le arguments",
        ],
        "update_note": "Monitor for decisions applying Le in sentencing context and Morris para 97 "
                       "applications where over-policing is the documented systemic harm.",
    },

    # ── NODE 15: Temporal distortion ──────────────────────────────────────────
    15: {
        "node_name": "Temporal distortion",
        "function": "Age-related burnout effect and temporal contingency of prior convictions. "
                    "Long-term violent recidivism decreases substantially after age 40-45. "
                    "Prior convictions under now-repudiated mandatory minimums carry reduced evidentiary weight.",
        "primary_auth": [
            {
                "citation": "R v Nur [2015] SCC 15",
                "para": "full decision",
                "principle": "Mandatory minimum for firearms offences struck as unconstitutional. "
                             "Convictions imposed under Nur-type mandatory minimums reflect "
                             "then-operative regime, not current proportionality standards.",
                "quote": None
            },
            {
                "citation": "R v Lloyd [2016] SCC 13",
                "para": "full decision",
                "principle": "Mandatory minimum for drug trafficking struck as unconstitutional. "
                             "Same principle: historically punitive convictions carry reduced "
                             "contemporary probative weight.",
                "quote": None
            },
            {
                "citation": "Hanson RK (2018) research on age and recidivism",
                "para": "relevant findings",
                "principle": "Long-term violent and sexual recidivism risk decreases substantially "
                             "after age 40-45. Age is a significant actuarial attenuator that "
                             "must be applied to older offenders in DO proceedings.",
                "quote": None
            },
        ],
        "analytical_test": "How old are the prior convictions? Were they imposed under mandatory "
                           "minimums since struck as unconstitutional? Does offender's current age "
                           "engage burnout attenuation (40+ significant; 45+ substantial; 55+ very "
                           "high attenuation)? Are actuarial tools applying age-attenuation correctly?",
        "error_patterns": [
            "Treating convictions under now-struck mandatory minimums as equivalent to current-law convictions",
            "Failing to apply age-related burnout attenuation for older offenders in risk assessment",
            "Using historical conviction density as current risk indicator without temporal calibration",
            "Allowing actuarial tools to flatten temporal differences into undifferentiated risk score",
        ],
        "ewert_caveat": "Temporally distorted records compound Ewert concerns — actuarial tools "
                        "that ingest historically inflated records without temporal calibration "
                        "produce doubly distorted risk scores.",
        "key_principle": "Criminal records are temporally contingent artifacts, not timeless "
                         "indicators of dangerousness. Convictions from repudiated legal regimes "
                         "and age-related attenuation must be applied before records are used "
                         "as actuarial inputs.",
        "recent_dev": [],
        "update_note": "Monitor for new mandatory minimum challenges generating additional "
                       "historically distorted convictions requiring temporal recalibration.",
    },

    # ── NODE 16: Interjurisdictional tariff effects ───────────────────────────
    16: {
        "node_name": "Interjurisdictional tariff effects",
        "function": "Variance in provincial sentencing norms generates systemic disparity in DO "
                    "designation rates independent of individual offender risk.",
        "primary_auth": [
            {
                "citation": "R v Lacasse [2015] SCC 64",
                "para": "para 66",
                "principle": "SCC acknowledged provincial variation in sentencing ranges as legitimate "
                             "within proportionality constraints. Variation creates structural inequality "
                             "for identically situated offenders across provinces.",
                "quote": None
            },
            {
                "citation": "Lampron E (2022) Overrepresentation of Indigenous People in DO Designations",
                "para": "full thesis University of Ottawa",
                "principle": "DO designation rates vary significantly by province. Geographic accident "
                             "of prosecution inflates designation probability independently of "
                             "offender characteristics.",
                "quote": None
            },
        ],
        "analytical_test": "In which province was the offender prosecuted? Is that province a "
                           "high-designation jurisdiction? Would the same offender profile receive "
                           "different treatment in a different jurisdiction?",
        "error_patterns": [
            "Treating DO designation as an offender-specific determination without accounting for "
            "jurisdictional baseline designation rates",
        ],
        "ewert_caveat": None,
        "key_principle": "DO designation probability is partly a function of geography — "
                         "an artifact of provincial legal culture rather than individual risk.",
        "recent_dev": [],
        "update_note": "Monitor for comparative interprovincial designation rate data.",
    },

    # ── NODE 17: Collider bias ────────────────────────────────────────────────
    17: {
        "node_name": "Collider bias",
        "function": "Conditioning on incarceration (a collider variable) induces spurious correlations "
                    "between upstream risk factors. Failure to control produces misleading inferences.",
        "primary_auth": [
            {
                "citation": "Pearl J (2009) Causality — Models, Reasoning, Inference (2nd ed)",
                "para": "Chapter 3 — collider variables",
                "principle": "Conditioning on a collider variable (one caused by both the exposure "
                             "and the outcome) induces a spurious correlation between its causes. "
                             "Incarceration is caused by both criminal conduct AND systemic factors "
                             "(over-policing, bail denial, coercive pleas). Conditioning on "
                             "incarceration distorts inferences about each cause independently.",
                "quote": None
            },
        ],
        "analytical_test": "Does the analysis condition on incarceration history as if it were a "
                           "neutral indicator? Does it fail to account for the non-criminal pathways "
                           "to incarceration (systemic disadvantage, coercive pleas, over-policing)? "
                           "Do actuarial tools use institutional history variables without collider correction?",
        "error_patterns": [
            "Treating incarceration history as direct evidence of criminal propensity without "
            "acknowledging non-criminal pathways to incarceration",
            "Actuarial tools using institutional behaviour as risk variable without collider correction",
        ],
        "ewert_caveat": "Collider bias compounds Ewert concerns — tools using institutional history "
                        "as risk variables are conditioning on a collider, producing structurally "
                        "distorted risk estimates for over-policed populations.",
        "key_principle": "Incarceration is a collider: caused by conduct AND systemic factors. "
                         "Conditioning on it creates spurious correlations that inflate apparent risk.",
        "recent_dev": [],
        "update_note": "Primarily a statistical/methodological concern. Monitor for expert evidence "
                       "addressing collider bias in DO proceedings.",
    },

    # ── NODE 18: Dynamic risk factors ─────────────────────────────────────────
    18: {
        "node_name": "Dynamic risk factors",
        "function": "Time-varying criminogenic needs. Subject to temporal corrections (Node 14), "
                    "treatment availability (Node 9), and gaming detector (Node 11). "
                    "Must be assessed against structural conditions per Ipeelee.",
        "primary_auth": [
            {
                "citation": "R v Ipeelee [2012] SCC 13",
                "para": "paras 59-75",
                "principle": "Dynamic factors — employment, housing, substance use, peer associations — "
                             "must be interpreted against colonial and socio-economic context. "
                             "Employment instability may reflect discrimination, not criminogenic disposition. "
                             "Expressions of mistrust toward legal authorities may be rational responses "
                             "to historically grounded institutional harm, not antisocial attitudes.",
                "quote": "Some of the Gladue factors will also bear on the risk posed by an offender... "
                         "the significance of those factors must be understood in their broader context."
            },
            {
                "citation": "R v Gladue [1999] 1 SCR 688",
                "para": "para 93",
                "principle": "The two-stage Gladue analysis applies to dynamic risk assessment: "
                             "(1) how do systemic factors contextualise the dynamic risk indicator? "
                             "(2) what culturally appropriate intervention addresses it?",
                "quote": None
            },
        ],
        "analytical_test": "For each dynamic risk factor: (1) Does it reflect individual criminogenic "
                           "disposition or structural condition (poverty, discrimination, housing market)? "
                           "(2) Has it been assessed against availability of appropriate intervention? "
                           "(3) Has improvement been recognised where structural conditions have improved? "
                           "(4) Is 'antisocial attitude' coding rational response to institutional harm?",
        "error_patterns": [
            "Treating employment instability as criminogenic without examining discrimination or "
            "structural barriers in labour market",
            "Coding mistrust of authorities as antisocial attitude rather than rational response to over-policing",
            "Failing to distinguish dynamic factor driven by individual choice from one driven by "
            "structural constraint",
            "Using dynamic risk elevation to override static temporal attenuation for older offenders",
        ],
        "ewert_caveat": "LSI-R and similar dynamic risk tools may embed structural disadvantage "
                        "as risk markers — directly contrary to Ipeelee's requirement that "
                        "such factors be contextualised rather than pathologised.",
        "key_principle": "Dynamic risk factors must be interpreted in structural context — "
                         "what appears criminogenic may reflect systemic harm rather than "
                         "individual disposition.",
        "recent_dev": [],
        "update_note": "Monitor for decisions applying Ipeelee to challenge dynamic risk "
                       "assessments that fail to contextualise structural factors.",
    },

    # ── NODE 19: Absence of rehabilitative progress ───────────────────────────
    19: {
        "node_name": "Absence of rehabilitative progress",
        "function": "Apparent rehabilitation failure must be assessed against availability of programming. "
                    "P(no progress | no programs) ≠ P(no progress | programs + refusal). "
                    "Critical diagnostic distinction per Natomagan.",
        "primary_auth": [
            {
                "citation": "R v Natomagan 2022 ABCA 48",
                "para": "paras 55-75",
                "principle": "Absence of culturally appropriate programming cannot be treated as "
                             "evidence of rehabilitation failure. Structural unavailability ≠ "
                             "unwillingness. Core Natomagan principle.",
                "quote": None
            },
            {
                "citation": "R v Boutilier [2017] SCC 64",
                "para": "paras 72-90",
                "principle": "Treatability is part of designation inquiry. Where treatment has not "
                             "been provided, courts must not infer untreatability from absence "
                             "of response to non-existent treatment.",
                "quote": None
            },
            {
                "citation": "R v Ipeelee [2012] SCC 13",
                "para": "para 84",
                "principle": "System failure to provide appropriate programs cannot be attributed "
                             "to offender as rehabilitation deficit.",
                "quote": None
            },
        ],
        "analytical_test": "Was programming: (1) available? (2) culturally appropriate? "
                           "(3) offered to offender? (4) refused by offender with awareness of purpose? "
                           "Only genuine refusal of available appropriate programming constitutes "
                           "rehabilitation failure. All other scenarios = systemic failure, not "
                           "offender characteristic.",
        "error_patterns": [
            "Treating programming absence as offender rehabilitation failure — direct Natomagan error",
            "Characterising non-engagement with culturally inappropriate programs as treatment resistance",
            "Using rehabilitation absence to anchor DO designation without Natomagan analysis",
            "Failing to distinguish genuine refusal from structural unavailability in institutional records",
        ],
        "ewert_caveat": "Western-model rehabilitation programming that lacks cultural appropriateness "
                        "compounds Ewert concerns — non-engagement with such programming is "
                        "not evidence of untreatability.",
        "key_principle": "Rehabilitation failure requires proof that appropriate programming was "
                         "available, offered, and refused. Structural absence of programming "
                         "cannot be imputed as offender deficit.",
        "recent_dev": [
            "Natomagan 2022 ABCA 48 is the most important recent authority — closely watch subsequent "
            "applications in other provinces",
        ],
        "update_note": "Monitor for courts applying Natomagan to distinguish genuine refusal from "
                       "structural unavailability in DO designation analysis.",
    },

}  # end NODE_DOCTRINE


# ── CITATION METADATA REGISTRY ────────────────────────────────────────────────
# Stare decisis layer. For every authority cited in NODE_DOCTRINE, this
# registry records the minimum metadata needed to compute binding force
# relative to a document under analysis:
#
#   court_level  — 'scc' | 'ca' | 'sc' | 'pc' | 'statute' | 'secondary'
#   jurisdiction — 'federal' | 'on' | 'bc' | 'ab' | 'qc' | 'sk' | 'mb'
#                  | 'ns' | 'nb' | 'nl' | 'pe' | 'yt' | 'nt' | 'nu' | 'none'
#   year         — integer (useful for temporal ordering and currency)
#   status       — 'good_law' | 'under_appeal' | 'overruled' | 'distinguished'
#                  | 'inter_provincial_split' | 'unknown'
#   notes        — free text (e.g. known splits, leave applications, caveats)
#
# HOW TO UPDATE: when an authority's status changes (SCC grants leave, a case
# is overruled or distinguished, an inter-provincial split emerges), update
# the 'status' and 'notes' fields here — no change to NODE_DOCTRINE needed.
# The analyzer reads this registry via stare_decisis.py.
#
# DESIGN NOTE: the registry is keyed by the exact citation string used in
# NODE_DOCTRINE. stare_decisis.normalize_citation() handles minor variations
# ("R v X 2022 ABCA 48" vs "X 2022 ABCA 48"). To add a new authority, add
# an entry here AND cite it in a NODE_DOCTRINE primary_auth list.

CITATION_METADATA = {

    # ── Supreme Court of Canada (binds everyone) ──────────────────────────────
    "Ewert v Canada [2018] SCC 30": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2018,
        "status": "good_law",
        "notes": "Leading authority on cultural validity of actuarial tools for "
                 "Indigenous offenders. CSC breach of duty of accuracy. Binds all "
                 "lower courts on tool-validation obligations.",
    },
    "R v Antic [2017] SCC 27": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2017,
        "status": "good_law",
        "notes": "Leading authority on bail; ladder principle. Binds all courts.",
    },
    "R v Boutilier [2017] SCC 64": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2017,
        "status": "good_law",
        "notes": "DO regime constitutional validity; pattern of behaviour (not "
                 "offences) test; Gladue applies at all stages of DO proceedings.",
    },
    "R v GDB [2000] 1 SCR 520": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2000,
        "status": "good_law",
        "notes": "Leading authority on ineffective assistance of counsel. "
                 "Two-part test: (1) incompetence; (2) miscarriage of justice.",
    },
    "R v Gladue [1999] 1 SCR 688": {
        "court_level": "scc", "jurisdiction": "federal", "year": 1999,
        "status": "good_law",
        "notes": "Foundational Indigenous sentencing authority. Reaffirmed and "
                 "strengthened by Ipeelee [2012] SCC 13. Binds all courts.",
    },
    "R v Ipeelee [2012] SCC 13": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2012,
        "status": "good_law",
        "notes": "Reaffirms Gladue; applies at all sentencing stages including "
                 "DO proceedings. Binds all courts.",
    },
    "R v Lacasse [2015] SCC 64": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2015,
        "status": "good_law",
        "notes": "Provincial sentencing ranges are starting points, not binding "
                 "rules. Deference to trial judges absent error in principle.",
    },
    "R v Le [2019] SCC 34": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2019,
        "status": "good_law",
        "notes": "Racial profiling in s.9 Charter analysis. Binds all courts on "
                 "over-policing and systemic bias in contact with police.",
    },
    "R v Lloyd [2016] SCC 13": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2016,
        "status": "good_law",
        "notes": "Mandatory minimum sentences unconstitutional under s.12 where "
                 "reasonable hypothetical produces grossly disproportionate "
                 "sentence. Binds all courts.",
    },
    "R v Lyons [1987] 2 SCR 309": {
        "court_level": "scc", "jurisdiction": "federal", "year": 1987,
        "status": "good_law",
        "notes": "Foundational DO authority; constitutional validity of regime. "
                 "Risk assessment must be individualised, not actuarial alone.",
    },
    "R v Mohan [1994] 2 SCR 9": {
        "court_level": "scc", "jurisdiction": "federal", "year": 1994,
        "status": "good_law",
        "notes": "Admissibility of expert evidence. Four-part test: relevance, "
                 "necessity, absence of exclusionary rule, qualified expert.",
    },
    "R v Nur [2015] SCC 15": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2015,
        "status": "good_law",
        "notes": "Mandatory minimums struck down for firearms offences under "
                 "s.12 Charter. Reasonable hypothetical test.",
    },
    "R v Parranto [2021] SCC 46": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2021,
        "status": "good_law",
        "notes": "Sentencing starting points; judicial comity and appellate "
                 "deference on sentence.",
    },
    "R v Zora [2020] SCC 14": {
        "court_level": "scc", "jurisdiction": "federal", "year": 2020,
        "status": "good_law",
        "notes": "Mens rea of breach of bail conditions; subjective standard. "
                 "Relevant to bail-denial cascade analysis.",
    },

    # ── Provincial Courts of Appeal ───────────────────────────────────────────
    "R v Bourdon 2024 ONCA 8": {
        "court_level": "ca", "jurisdiction": "on", "year": 2024,
        "status": "good_law",
        "notes": "Recent Ontario CA authority. Binding in Ontario; strongly "
                 "persuasive elsewhere. Watch for reception in other provinces.",
    },
    "R v Ellis 2022 BCCA 278": {
        "court_level": "ca", "jurisdiction": "bc", "year": 2022,
        "status": "good_law",
        "notes": "Extends contextual sentencing reasoning to non-racialised "
                 "socially disadvantaged offenders. Binding in BC only; "
                 "strongly persuasive elsewhere. Reception in ON, AB, other "
                 "provinces is still developing.",
    },
    "R v Gracie 2019 ONCA 658": {
        "court_level": "ca", "jurisdiction": "on", "year": 2019,
        "status": "good_law",
        "notes": "Ontario CA application of Ewert. Binding in Ontario on the "
                 "specific rule it stands for; persuasive in other provinces. "
                 "Key worked example of how a provincial CA interprets SCC "
                 "authority on tool validity.",
    },
    "R v Morris 2021 ONCA 680": {
        "court_level": "ca", "jurisdiction": "on", "year": 2021,
        "status": "good_law",
        "notes": "SCE for Black/racialised offenders; para 97 connection gate. "
                 "Binding in Ontario only. Widely cited and adopted elsewhere "
                 "(notably BC in Ellis); monitor for explicit adoption in AB, "
                 "MB, SK, and by the SCC.",
    },
    "R v Natomagan 2022 ABCA 48": {
        "court_level": "ca", "jurisdiction": "ab", "year": 2022,
        "status": "good_law",
        "notes": "Structural unavailability of culturally appropriate programming "
                 "cannot be weighed against Indigenous accused. Binding in "
                 "Alberta; strongly persuasive elsewhere on the Natomagan "
                 "principle. Closely watch subsequent applications.",
    },

    # ── Provincial superior / inferior courts ─────────────────────────────────
    "R v EB Ontario Superior Court": {
        "court_level": "sc", "jurisdiction": "on", "year": None,
        "status": "unknown",
        "notes": "Citation incomplete in doctrine.py. Canonical cite needs "
                 "verification. If an ONSC decision, binding only on OCJ; "
                 "persuasive at ONSC level (horizontal comity per Hansard "
                 "Spruce Mills).",
    },

    # ── Federal statutes (bind everyone per their terms) ──────────────────────
    "Criminal Code RSC 1985 c C-46, s 493.2": {
        "court_level": "statute", "jurisdiction": "federal", "year": 2019,
        "status": "good_law",
        "notes": "Requirement to consider circumstances of Indigenous and "
                 "vulnerable accused in bail decisions. Added by SC 2019 c.25.",
    },
    "Criminal Code RSC 1985 c C-46, s 753(1)(a)(i)": {
        "court_level": "statute", "jurisdiction": "federal", "year": 1985,
        "status": "good_law",
        "notes": "DO designation: pattern of repetitive behaviour showing "
                 "failure to restrain; likelihood of death or severe harm.",
    },
    "Criminal Code RSC 1985 c C-46, s 753(1)(a)(ii)": {
        "court_level": "statute", "jurisdiction": "federal", "year": 1985,
        "status": "good_law",
        "notes": "DO designation: pattern of persistent aggressive behaviour "
                 "with indifference to consequences.",
    },

    # ── Secondary sources (academic, reports, policy — never binding) ─────────
    "Denis-Boileau MA (2021) 54:3 UBC Law Review 537": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2021,
        "status": "good_law", "notes": "Academic article — persuasive only.",
    },
    "Ewing B and Kerr L (2023) 74 University of Toronto Law Journal": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2023,
        "status": "good_law",
        "notes": "Academic analysis of judicial misapplication of Gladue. "
                 "Persuasive only.",
    },
    "Feeley M (1979) The Process Is the Punishment": {
        "court_level": "secondary", "jurisdiction": "none", "year": 1979,
        "status": "good_law",
        "notes": "Foundational socio-legal scholarship on coercive effects of "
                 "pre-trial detention. Persuasive only.",
    },
    "Hanson RK (2018) research on age and recidivism": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2018,
        "status": "good_law",
        "notes": "Empirical research on age-crime curve and Static-99R age "
                 "adjustments. Persuasive only; basis for temporal distortion "
                 "node analysis.",
    },
    "Iacobucci F (2013) First Nations Representation on Ontario Juries": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2013,
        "status": "good_law",
        "notes": "Commissioned report. Persuasive only.",
    },
    "Lampron E (2022) Overrepresentation of Indigenous People in DO Designations": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2022,
        "status": "good_law",
        "notes": "Empirical analysis of DO designation disparities. "
                 "Persuasive only.",
    },
    "Larsen et al (2024) Psychology Public Policy and Law": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2024,
        "status": "good_law",
        "notes": "Adversarial allegiance effects in PCL-R assessments. d = 1.08. "
                 "Persuasive only; highly relevant to Node 3 analysis.",
    },
    "Lee Hanson and Blais (2020) Canadian Psychology 61(1)": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2020,
        "status": "good_law",
        "notes": "Research on Static-99R validation for Indigenous populations. "
                 "Persuasive only.",
    },
    "Liell Fisher and Jones (2023) Routledge — Challenging Bias in Forensic Assessment": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2023,
        "status": "good_law",
        "notes": "Academic text on bias in forensic psychological assessment. "
                 "Persuasive only.",
    },
    "Milward D (2018) 66:3 Crim LQ 254": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2018,
        "status": "good_law",
        "notes": "Academic analysis of Indigenous sentencing. Persuasive only.",
    },
    "National Inquiry into MMIWG Final Report (2019)": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2019,
        "status": "good_law",
        "notes": "Commissioned national inquiry report. Persuasive only.",
    },
    "Ontario Human Rights Commission — A Collective Impact (2020)": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2020,
        "status": "good_law",
        "notes": "OHRC report on systemic racism in Toronto Police Service. "
                 "Persuasive only.",
    },
    "Pearl J (2009) Causality — Models, Reasoning, Inference (2nd ed)": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2009,
        "status": "good_law",
        "notes": "Foundational text on causal inference. Basis for collider "
                 "bias analysis (Node 17). Persuasive only.",
    },
    "Ralston BA (2021) The Gladue Principles BC First Nations Justice Council": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2021,
        "status": "good_law",
        "notes": "Practitioner synthesis of Gladue jurisprudence. "
                 "Persuasive only.",
    },
    "Tolppanen Report (2018) Federal-Provincial-Territorial Heads of Prosecutions": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2018,
        "status": "good_law",
        "notes": "Government working group report on bail reform and wrongful "
                 "plea cascades. Persuasive only.",
    },
    "Venner et al (2021) International Journal of Forensic Mental Health 20(3)": {
        "court_level": "secondary", "jurisdiction": "none", "year": 2021,
        "status": "good_law",
        "notes": "Empirical research on actuarial tool performance. "
                 "Persuasive only.",
    },
}


def get_citation_metadata(citation: str) -> dict:
    """Return metadata dict for a citation, or an 'unknown' placeholder."""
    if citation in CITATION_METADATA:
        return CITATION_METADATA[citation]
    return {
        "court_level": "unknown", "jurisdiction": "unknown", "year": None,
        "status": "unknown",
        "notes": f"Citation not yet registered in CITATION_METADATA: {citation}",
    }


def get_all_citations_with_metadata() -> dict:
    """Return the full {citation: metadata} registry."""
    return dict(CITATION_METADATA)


# ── Formatted system prompt builder ───────────────────────────────────────────

def build_doctrinal_prompt() -> str:
    """
    Build a comprehensive doctrinal system prompt for document_analyzer.py.
    This is read dynamically — updating NODE_DOCTRINE updates the prompt.
    """
    lines = [
        "PARVIS DOCTRINAL ANCHOR LIBRARY",
        "================================",
        "Full doctrinal rules, analytical tests, and error patterns for each node.",
        "Apply these rules when analysing uploaded documents.",
        "",
    ]
    for nid, doc in NODE_DOCTRINE.items():
        lines += [
            f"NODE {nid}: {doc['node_name'].upper()}",
            f"Function: {doc['function']}",
            f"Key principle: {doc['key_principle']}",
            f"Analytical test: {doc['analytical_test']}",
            "Primary authorities:",
        ]
        for auth in doc["primary_auth"]:
            lines.append(f"  — {auth['citation']}")
            if auth.get("para"):
                lines.append(f"    {auth['para']}: {auth['principle']}")
            if auth.get("quote"):
                lines.append(f"    Quote: \"{auth['quote']}\"")
        lines.append("Error patterns to detect:")
        for err in doc["error_patterns"]:
            lines.append(f"  ▸ {err}")
        if doc.get("ewert_caveat"):
            lines.append(f"Ewert caveat: {doc['ewert_caveat']}")
        if doc.get("recent_dev"):
            lines.append("Recent developments:")
            for dev in doc["recent_dev"]:
                lines.append(f"  → {dev}")
        # Mark 8 push two — surface GDB analytical scaffold where present
        scaffold = doc.get("gdb_analytical_scaffold")
        if scaffold:
            lines.append("")
            lines.append("══ GDB ANALYTICAL SCAFFOLD ══")
            lines.append(f"Purpose: {scaffold['purpose']}")
            lines.append("")

            # Stage one — deficient performance
            s1 = scaffold.get("stage_one_deficient_performance", {})
            if s1:
                lines.append("STAGE 1 — Deficient performance")
                lines.append(f"  Test: {s1['test']}")
                for ind in s1.get("indicators_to_extract", []):
                    lines.append(f"  Indicator: {ind['name']} ({ind['label']})")
                    lines.append(f"    Evidence to look for:")
                    for e in ind["evidence_to_look_for"]:
                        lines.append(f"      - {e}")
                    lines.append(f"    Threshold: {ind['evidentiary_threshold']}")
                lines.append("")

            # Stages 1 + 2 — mixed
            sm = scaffold.get("stage_one_two_mixed", {})
            if sm:
                lines.append("STAGES 1+2 — Mixed evidence")
                lines.append(f"  Test: {sm['test']}")
                for ind in sm.get("indicators_to_extract", []):
                    lines.append(f"  Indicator: {ind['name']} ({ind['label']})")
                    lines.append(f"    Evidence to look for:")
                    for e in ind["evidence_to_look_for"]:
                        lines.append(f"      - {e}")
                    lines.append(f"    Threshold: {ind['evidentiary_threshold']}")
                lines.append("")

            # Stage two — prejudice
            s2 = scaffold.get("stage_two_prejudice", {})
            if s2:
                lines.append("STAGE 2 — Prejudice")
                lines.append(f"  Test: {s2['test']}")
                for ind in s2.get("indicators_to_extract", []):
                    lines.append(f"  Indicator: {ind['name']} ({ind['label']})")
                    lines.append(f"    Evidence to look for:")
                    for e in ind["evidence_to_look_for"]:
                        lines.append(f"      - {e}")
                    lines.append(f"    Threshold: {ind['evidentiary_threshold']}")
                lines.append("")

            # Constitutional threshold
            ct = scaffold.get("constitutional_threshold", {})
            if ct:
                lines.append("CONSTITUTIONAL THRESHOLD")
                lines.append(f"  Test: {ct['test']}")
                lines.append(f"  Flag: {ct['flag_name']} ({ct['label']})")
                lines.append(f"  Decision rule: {ct['decision_rule']}")
                lines.append(f"  User discretion: {ct['user_discretion_note']}")
                lines.append("")

            if scaffold.get("narrative_summary_format"):
                lines.append(f"Narrative format: {scaffold['narrative_summary_format']}")

            lines.append("══ END GDB SCAFFOLD ══")

        if doc.get("update_note"):
            lines.append(f"UPDATE NOTE: {doc['update_note']}")
        lines.append("")
    return "\n".join(lines)


def get_node_doctrine(node_id: int) -> dict:
    """Return doctrinal anchor dict for a specific node."""
    return NODE_DOCTRINE.get(node_id, {})


def get_all_authorities() -> list:
    """Return flat list of all primary authorities across all nodes."""
    seen = set()
    auths = []
    for doc in NODE_DOCTRINE.values():
        for auth in doc.get("primary_auth", []):
            cit = auth["citation"]
            if cit not in seen:
                seen.add(cit)
                auths.append(auth)
    return auths


def get_update_notes() -> dict:
    """Return dict of {node_id: update_note} for nodes flagged as actively evolving."""
    return {
        nid: doc["update_note"]
        for nid, doc in NODE_DOCTRINE.items()
        if doc.get("update_note")
    }
