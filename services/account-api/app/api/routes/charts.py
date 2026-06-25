from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.birth_chart import BirthChart
from app.models.user import User
from app.schemas.birth_chart import (
    BirthChartCreate,
    BirthChartDeleteResponse,
    BirthChartRead,
    BirthChartUpdate,
)

router = APIRouter()


def get_owned_chart(db: Session, current_user: User, chart_id: UUID) -> BirthChart:
    chart = db.get(BirthChart, chart_id)
    if chart is None or chart.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Birth chart not found.",
        )
    return chart


@router.get("", response_model=list[BirthChartRead])
def list_birth_charts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BirthChart]:
    statement = (
        select(BirthChart)
        .where(BirthChart.user_id == current_user.id)
        .order_by(BirthChart.created_at.desc(), BirthChart.id.desc())
    )
    return list(db.scalars(statement).all())


@router.post("", response_model=BirthChartRead, status_code=status.HTTP_201_CREATED)
def create_birth_chart(
    payload: BirthChartCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BirthChart:
    chart = BirthChart(user_id=current_user.id, **payload.model_dump())
    db.add(chart)
    db.commit()
    db.refresh(chart)
    return chart


@router.get("/{chart_id}", response_model=BirthChartRead)
def get_birth_chart(
    chart_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BirthChart:
    return get_owned_chart(db, current_user, chart_id)


@router.patch("/{chart_id}", response_model=BirthChartRead)
def update_birth_chart(
    chart_id: UUID,
    payload: BirthChartUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BirthChart:
    chart = get_owned_chart(db, current_user, chart_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(chart, field, value)

    db.commit()
    db.refresh(chart)
    return chart


@router.delete("/{chart_id}", response_model=BirthChartDeleteResponse)
def delete_birth_chart(
    chart_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BirthChartDeleteResponse:
    chart = get_owned_chart(db, current_user, chart_id)
    db.delete(chart)
    db.commit()
    return BirthChartDeleteResponse(status="deleted", id=chart_id)
