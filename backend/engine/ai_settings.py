"""
NAWI TestFlow — AI Settings Store.

Controls WHEN Gemini may be used:

- Rule-based explanations ALWAYS work (no key, zero cost) via
  engine/rule_explainer.py.
- Gemini is used ONLY on explicit user request ("Enhance with AI") AND
  only when an API key has been configured in Settings (by the user for
  themselves, or by an admin globally) AND the feature is enabled.

Admins can view/change all AI settings (global key, enabled flag, model).
Regular users can supply their own personal key, which is sent per-request
and never stored server-side (it overrides the global key for that call).
"""

import os
from dataclasses import dataclass, field
from typing import Optional


ALLOWED_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-3.8-flash",
]


def _looks_like_key(key: Optional[str]) -> bool:
    return bool(key and isinstance(key, str) and len(key.strip()) >= 8)


@dataclass
class AISettings:
    enabled: bool = True
    model: str = "gemini-3.8-flash"
    # Global key configured by admin (server-side). Never returned in full.
    global_api_key: Optional[str] = None

    def public_status(self) -> dict:
        has_key = _looks_like_key(self.global_api_key) or _looks_like_key(
            os.environ.get("GEMINI_API_KEY")
        )
        return {
            "rule_based_available": True,  # always
            "ai_enabled": self.enabled,
            "ai_configured": has_key and self.enabled,
            "ai_available": has_key and self.enabled,
            "setup_required": not has_key or not self.enabled,
            "model": self.model if (has_key and self.enabled) else None,
            "model_options": ALLOWED_MODELS,
            "has_global_key": _looks_like_key(self.global_api_key)
            or _looks_like_key(os.environ.get("GEMINI_API_KEY")),
            "usage_policy": (
                "Rule-based explanations are shown by default (no AI cost). "
                "Gemini is called ONLY when you explicitly click 'Enhance with AI' "
                "and an API key is configured in Settings."
            ),
        }

    def masked_key(self) -> Optional[str]:
        key = self.global_api_key or os.environ.get("GEMINI_API_KEY") or ""
        if not _looks_like_key(key):
            return None
        return "…" + key.strip()[-4:]

    def resolve_key(self, per_request_key: Optional[str] = None) -> Optional[str]:
        """Personal (per-request) key takes precedence over the global key."""
        if _looks_like_key(per_request_key):
            return per_request_key.strip()
        if _looks_like_key(self.global_api_key):
            return self.global_api_key.strip()
        env_key = os.environ.get("GEMINI_API_KEY")
        if _looks_like_key(env_key):
            return env_key.strip()
        return None

    def is_usable(self, per_request_key: Optional[str] = None) -> bool:
        return self.enabled and self.resolve_key(per_request_key) is not None


_settings = AISettings(
    enabled=os.environ.get("AI_ASSISTANCE_ENABLED", "true").lower() not in ("0", "false", "no"),
    model=os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"),
    global_api_key=os.environ.get("GEMINI_API_KEY") or None,
)


def get_ai_settings() -> AISettings:
    return _settings


def update_ai_settings(
    enabled: Optional[bool] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    clear_key: bool = False,
) -> AISettings:
    """Admin-only mutation of global AI settings."""
    global _settings
    if enabled is not None:
        _settings.enabled = bool(enabled)
    if model is not None:
        if model not in ALLOWED_MODELS:
            raise ValueError(f"Unsupported model '{model}'. Allowed: {ALLOWED_MODELS}")
        _settings.model = model
    if clear_key:
        _settings.global_api_key = None
    elif api_key is not None:
        # Empty string clears; otherwise validate lightly
        if api_key == "":
            _settings.global_api_key = None
        elif not _looks_like_key(api_key):
            raise ValueError("API key looks too short to be valid (min 8 chars).")
        else:
            _settings.global_api_key = api_key.strip()
    return _settings


def reset_ai_settings() -> None:
    """Reset to environment defaults (used in tests)."""
    global _settings
    _settings = AISettings(
        enabled=os.environ.get("AI_ASSISTANCE_ENABLED", "true").lower()
        not in ("0", "false", "no"),
        model=os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"),
        global_api_key=os.environ.get("GEMINI_API_KEY") or None,
    )
