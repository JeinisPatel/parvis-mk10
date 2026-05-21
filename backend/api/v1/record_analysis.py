"""
POST /api/v1/record_analysis
============================

Takes a list of convictions and returns:
  - Boutilier pattern classification (escalating / stable / de-escalating / desistance)
  - Aggregate seriousness statistics
  - Per-node doctrinal advisories
  - Static metadata (offence categories, sentence types) so the frontend
    can render its dropdowns from a single source of truth.

The analysis runs the Mk 9 _record_analysis helper, not a Mk 8 engine module.
"""

from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class Conviction(BaseModel):
    """One conviction entry as captured by the Criminal record wizard."""

    id:                       str
    charge:                   str = Field(default="")
    category:                 str = Field(default="other")
    year:                     int | None = Field(default=None, ge=1900, le=2100)
    jurisdiction:             str = Field(default="")
    sentence_type:            str = Field(default="other")
    sentence_length_months:   int | None = Field(default=None, ge=0)

    # Reliability flags
    bail_denied:                bool = False
    counsel_inadequate:         bool = False
    overpoliced_jurisdiction:   bool = False
    brutal:                     bool = False
    plea_under_pressure:        bool = False

    notes:                    str = ""


class RecordAnalysisRequest(BaseModel):
    convictions: list[Conviction] = Field(default_factory=list)


class Implication(BaseModel):
    node:       str
    node_name:  str
    type:       str   # 'advisory' | 'strong'
    note:       str
    anchor:     str


class Aggregate(BaseModel):
    count:             int
    violent_count:     int
    sexual_count:      int
    weight_sum:        float
    weight_mean:       float
    earliest_year:     int | None
    most_recent_year:  int | None
    span_years:        int | None


class RecordAnalysisResponse(BaseModel):
    pattern:         str
    pattern_note:    str
    aggregate:       Aggregate
    implications:    list[Implication]
    categories:      dict[str, str]
    sentence_types:  list[str]


# Module-level metadata endpoint — for the frontend to populate dropdowns
# without sending an empty analyse request.

class RecordMetadataResponse(BaseModel):
    categories:      dict[str, str]
    sentence_types:  list[str]


@router.post("/record_analysis", response_model=RecordAnalysisResponse)
async def run_record_analysis(req: RecordAnalysisRequest) -> RecordAnalysisResponse:
    from parvis_engine._record_analysis import analyse_record

    convictions_data = [c.model_dump() for c in req.convictions]
    result = analyse_record(convictions_data)

    return RecordAnalysisResponse(
        pattern=result["pattern"],
        pattern_note=result["pattern_note"],
        aggregate=Aggregate(**result["aggregate"]),
        implications=[Implication(**i) for i in result["implications"]],
        categories=result["categories"],
        sentence_types=result["sentence_types"],
    )


@router.get("/record_metadata", response_model=RecordMetadataResponse)
async def get_record_metadata() -> RecordMetadataResponse:
    """Static metadata for the conviction wizard dropdowns. No body required."""
    from parvis_engine._record_analysis import OFFENCE_CATEGORIES, SENTENCE_TYPES
    return RecordMetadataResponse(
        categories={k: v["label"] for k, v in OFFENCE_CATEGORIES.items()},
        sentence_types=SENTENCE_TYPES,
    )