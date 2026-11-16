import os
from urllib.parse import urlparse


def _env_value(env, *names, default=""):
    for name in names:
        value = str(env.get(name) or "").strip()
        if value:
            return value
    return default


def default_app_update_settings(env=None):
    env = env or os.environ
    android_package = str(env.get("ANDROID_PACKAGE_NAME") or "com.youssouphasba.stockman").strip()
    ios_app_store_id = _env_value(env, "IOS_APP_STORE_ID", default="6760587628")
    return {
        "enabled": True,
        "message": _env_value(
            env,
            "APP_UPDATE_MESSAGE",
            "STOCKMAN_UPDATE_MESSAGE",
        ),
        "android_min_version": _env_value(
            env, "APP_ANDROID_MIN_VERSION", "STOCKMAN_ANDROID_MIN_VERSION"
        ),
        # Version annoncée depuis l'administration : toute application plus ancienne propose la mise à jour.
        # Vide par défaut, aucune version n'est inventée.
        "android_latest_version": _env_value(
            env, "APP_ANDROID_LATEST_VERSION", "STOCKMAN_ANDROID_LATEST_VERSION"
        ),
        "android_store_url": _env_value(
            env,
            "APP_ANDROID_UPDATE_URL",
            "STOCKMAN_ANDROID_UPDATE_URL",
            default=f"https://play.google.com/store/apps/details?id={android_package}",
        ),
        "ios_min_version": _env_value(
            env, "APP_IOS_MIN_VERSION", "STOCKMAN_IOS_MIN_VERSION"
        ),
        "ios_latest_version": _env_value(
            env, "APP_IOS_LATEST_VERSION", "STOCKMAN_IOS_LATEST_VERSION"
        ),
        "ios_store_url": _env_value(
            env,
            "APP_IOS_UPDATE_URL",
            "STOCKMAN_IOS_UPDATE_URL",
            default=f"https://apps.apple.com/app/id{ios_app_store_id}",
        ),
    }


def resolve_app_update_settings(settings_doc=None, env=None):
    defaults = default_app_update_settings(env)
    stored = (settings_doc or {}).get("app_update") or {}
    result = dict(defaults)
    for key in result:
        if key in stored:
            result[key] = stored[key]
    result["enabled"] = result["enabled"] is not False
    result["message"] = str(result.get("message") or "").strip()
    for key in result:
        if key.endswith("_version") or key.endswith("_url"):
            result[key] = str(result.get(key) or "").strip()
    return result


def _validate_store_url(value, platform):
    url = str(value or "").strip()
    parsed = urlparse(url)
    allowed_hosts = {
        "android": {"play.google.com", "stockman.pro", "www.stockman.pro", "app.stockman.pro"},
        "ios": {"apps.apple.com", "stockman.pro", "www.stockman.pro", "app.stockman.pro"},
    }[platform]
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.hostname.lower() not in allowed_hosts
    ):
        raise ValueError(f"Le lien {platform.upper()} doit être une adresse HTTPS officielle du store ou de Stockman.")
    return url

