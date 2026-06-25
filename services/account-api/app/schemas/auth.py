from pydantic import BaseModel, ConfigDict, field_validator

from app.core.security import normalize_email


class AuthRequestCodeRequest(BaseModel):
    email: str
    captcha_token: str | None = None

    @field_validator("email")
    @classmethod
    def normalize_email_value(cls, value: str) -> str:
        email = normalize_email(value)
        if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
            raise ValueError("A valid email is required.")
        return email


class AuthRequestCodeResponse(BaseModel):
    status: str
    email: str
    dev_code: str | None = None

    model_config = ConfigDict(extra="forbid")


class AuthVerifyCodeRequest(BaseModel):
    email: str
    code: str

    @field_validator("email")
    @classmethod
    def normalize_email_value(cls, value: str) -> str:
        return normalize_email(value)

    @field_validator("code")
    @classmethod
    def validate_code_value(cls, value: str) -> str:
        code = value.strip()
        if not code.isdigit() or len(code) != 6:
            raise ValueError("A 6 digit code is required.")
        return code


class AuthLogoutResponse(BaseModel):
    status: str
