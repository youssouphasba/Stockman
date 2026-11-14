import re
from html import escape

from pydantic import BaseModel, Field, HttpUrl, field_validator


class AdminMessageActionLink(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    url: HttpUrl

    @field_validator("label", mode="before")
    @classmethod
    def strip_label(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("url", mode="before")
    @classmethod
    def require_explicit_url(cls, value):
        if not isinstance(value, str) or not re.fullmatch(r"https://[^\s\\/@?#]+(?:[/?#][^\s\\]*)?", value.strip(), flags=re.IGNORECASE):
            raise ValueError("An absolute HTTPS URL without credentials is required")
        return value.strip()

    @field_validator("url")
    @classmethod
    def require_safe_url(cls, value: HttpUrl) -> HttpUrl:
        if value.scheme != "https" or value.username is not None or value.password is not None:
            raise ValueError("An HTTPS URL without credentials is required")
        return value


def render_admin_message_email_actions(
    internal_url: str | None, action_link: AdminMessageActionLink | None
) -> tuple[str, str]:
    actions = []
    if internal_url:
        actions.append(("Ouvrir dans Stockman", internal_url))
    if action_link:
        actions.append((action_link.label, str(action_link.url)))
    action_html = "".join(f"""
        <p style="margin:20px 0;">
            <a href="{escape(url, quote=True)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">{escape(label)}</a>
        </p>
        """ for label, url in actions)
    action_text = "".join(f"\n\n{label} : {url}" for label, url in actions)
    return action_html, action_text
