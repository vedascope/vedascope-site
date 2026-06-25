from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.user import UserProfileRead
from app.schemas.user_settings import UserSettingsRead, UserSettingsUpdate

router = APIRouter()


@router.get("/me", response_model=UserProfileRead)
def get_account_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/settings", response_model=UserSettingsRead)
def update_account_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserSettings:
    settings = current_user.settings
    if settings is None:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings
