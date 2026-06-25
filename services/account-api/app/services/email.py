from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import settings


class EmailDeliveryError(RuntimeError):
    pass


def build_login_code_body(code: str) -> str:
    return (
        "Здравствуйте.\n\n"
        f"Ваш код входа в vedascope: {code}\n\n"
        "Код действует 10 минут.\n\n"
        "Если вы не запрашивали вход, просто проигнорируйте это письмо.\n\n"
        "vedascope"
    )


def send_login_code_email(email: str, code: str) -> None:
    if not settings.smtp_host or not settings.smtp_from_email:
        raise EmailDeliveryError("SMTP host and sender must be configured.")

    message = EmailMessage()
    message["Subject"] = settings.auth_code_email_subject
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = email
    message.set_content(build_login_code_body(code))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception as exc:
        raise EmailDeliveryError("SMTP delivery failed.") from exc
