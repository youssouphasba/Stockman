"""
AI Governance — centralised quotas, caching, observability.

Replaces the inline AI_FEATURE_LIMITS / check_ai_limit / track_ai_usage
that lived in server.py.  Every AI-related endpoint (existing *and* future)
should go through this module.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Plan ordering (used for min_plan gates)
# ---------------------------------------------------------------------------
AI_PLAN_ORDER: Dict[str, int] = {"starter": 0, "pro": 1, "enterprise": 2}

# ---------------------------------------------------------------------------
# Feature registry
#
# Fields per feature:
#   label          — human-readable name (used in error messages)
#   kind           — "algo" | "hybrid" | "ai_pure"
#   period         — "day" | "month"
#   min_plan       — lowest plan allowed (omit → starter)
#   limits         — {plan: max_calls_per_period}  (omit plan → blocked)
#   cache_ttl_s    — optional in-memory cache TTL in seconds
#   tokens_estimate— (input, output) rough per-call token estimate (for cost tracking)
# ---------------------------------------------------------------------------
AI_FEATURE_LIMITS: Dict[str, Dict[str, Any]] = {
    # ── Existing features ──────────────────────────────────────────────
    "support_chat": {
        "label": "Assistant IA",
        "kind": "ai_pure",
        "period": "month",
        "limits": {"starter": 30, "pro": 120, "enterprise": 500},
        "tokens_estimate": (2000, 500),
    },
    "scan_invoice": {
        "label": "Scan de facture",
        "kind": "ai_pure",
        "period": "month",
        "limits": {"starter": 2, "pro": 10, "enterprise": 50},
        "tokens_estimate": (3000, 1000),
    },
    "daily_summary": {
        "label": "Resume quotidien",
        "kind": "ai_pure",
        "period": "day",
        "limits": {"starter": 1, "pro": 1, "enterprise": 1},
        "tokens_estimate": (2000, 1000),
    },
    "detect_anomalies": {
        "label": "Detection d'anomalies",
        "kind": "ai_pure",
        "period": "month",
        "min_plan": "pro",
        "limits": {"pro": 12, "enterprise": 40},
        "tokens_estimate": (3000, 1000),
    },
    "replenishment_advice": {
        "label": "Conseil de reapprovisionnement",
        "kind": "ai_pure",
        "period": "month",
        "limits": {"starter": 4, "pro": 12, "enterprise": 40},
        "tokens_estimate": (2000, 800),
    },
    "suggest_price": {
        "label": "Suggestion de prix",
        "kind": "ai_pure",
        "period": "month",
        "min_plan": "enterprise",
        "limits": {"enterprise": 120},
        "tokens_estimate": (1000, 500),
    },
    "suggest_category": {
        "label": "Suggestion de categorie",
        "kind": "ai_pure",
        "period": "month",
        "limits": {"starter": 30, "pro": 100, "enterprise": 300},
        "tokens_estimate": (500, 200),
    },
    "generate_description": {
        "label": "Generation de description",
        "kind": "ai_pure",
        "period": "month",
        "min_plan": "enterprise",
        "limits": {"enterprise": 300},
        "tokens_estimate": (500, 300),
    },

    # ── Vague 1 — algo pur, zéro coût IA ──────────────────────────────
    "business_health_score": {
        "label": "Score sante business",
        "kind": "algo",
        "period": "day",
        "limits": {"starter": 20, "pro": 50, "enterprise": 100},
        "cache_ttl_s": 3600,  # 1h
    },
    "dashboard_prediction": {
        "label": "Projection dashboard",
        "kind": "algo",
        "period": "day",
        "min_plan": "pro",
        "limits": {"pro": 20, "enterprise": 50},
        "cache_ttl_s": 21600,  # 6h
    },
    "sales_forecast": {
        "label": "Prevision de ventes",
        "kind": "algo",
        "period": "day",
        "min_plan": "pro",
        "limits": {"pro": 20, "enterprise": 50},
        "cache_ttl_s": 21600,  # 6h
    },
    "deadstock_analysis": {
        "label": "Produits a destocker",
        "kind": "algo",
        "period": "day",
        "limits": {"starter": 10, "pro": 20, "enterprise": 50},
        "cache_ttl_s": 3600,
    },

    # ── Vague 2 — stock intelligence ───────────────────────────────────
    "detect_duplicates": {
        "label": "Detection de doublons",
        "kind": "algo",
        "period": "month",
        "min_plan": "pro",
        "limits": {"pro": 30, "enterprise": 100},
    },
    "shrinkage_analysis": {
        "label": "Estimation demarque",
        "kind": "algo",
        "period": "month",
        "min_plan": "pro",
        "limits": {"pro": 15, "enterprise": 50},
    },
    "seasonality_alerts": {
        "label": "Detection saisonnalite",
        "kind": "algo",
        "period": "day",
        "min_plan": "enterprise",
        "limits": {"enterprise": 20},
        "cache_ttl_s": 86400,  # 24h
    },

    # ── Vague 3 — fournisseurs ─────────────────────────────────────────
    "supplier_rating": {
        "label": "Notation fournisseur",
        "kind": "algo",
        "period": "day",
        "min_plan": "pro",
        "limits": {"pro": 30, "enterprise": 100},
        "cache_ttl_s": 3600,
    },
    "optimal_order_day": {
        "label": "Meilleur jour pour commander",
        "kind": "algo",
        "period": "day",
        "min_plan": "enterprise",
        "limits": {"enterprise": 50},
        "cache_ttl_s": 86400,
    },
    "auto_draft_orders": {
        "label": "Commandes zero clic",
        "kind": "algo",
        "period": "month",
        "min_plan": "enterprise",
        "limits": {"enterprise": 30},
    },

    # ── Vague 4 — multi-boutiques ──────────────────────────────────────
    "rebalance_suggestions": {
        "label": "Reequilibrage inter-boutiques",
        "kind": "algo",
        "period": "day",
        "min_plan": "enterprise",
        "limits": {"enterprise": 20},
        "cache_ttl_s": 3600,
    },
    "store_benchmark": {
        "label": "Benchmark boutiques",
        "kind": "algo",
        "period": "day",
        "min_plan": "enterprise",
        "limits": {"enterprise": 20},
        "cache_ttl_s": 21600,
    },

    # ── Vague 5 — analytics ───────────────────────────────────────────
    "product_correlations": {
        "label": "Correlations produits",
        "kind": "algo",
        "period": "day",
        "min_plan": "enterprise",
        "limits": {"enterprise": 10},
        "cache_ttl_s": 86400,
    },

    # ── Vague 6 — hybride ─────────────────────────────────────────────
    "categorize_expense": {
        "label": "Categorisation depenses",
        "kind": "hybrid",
        "period": "month",
        "limits": {"starter": 50, "pro": 200, "enterprise": 500},
        "tokens_estimate": (500, 200),
    },
    "contextual_tips": {
        "label": "Conseils contextuels",
        "kind": "hybrid",
        "period": "day",
        "limits": {"starter": 3, "pro": 5, "enterprise": 10},
        "cache_ttl_s": 86400,
        "tokens_estimate": (1500, 500),
    },
    "natural_query": {
        "label": "Recherche langage naturel",
        "kind": "hybrid",
        "period": "month",
        "min_plan": "enterprise",
        "limits": {"enterprise": 50},
        "tokens_estimate": (1000, 800),
    },

    # ── Vague 7 — IA pure ─────────────────────────────────────────────
    "scan_product": {
        "label": "Saisie produit par photo",
        "kind": "ai_pure",
        "period": "month",
        "min_plan": "enterprise",
        "limits": {"enterprise": 15},
        "tokens_estimate": (4000, 1000),
    },
    "voice_to_cart": {
        "label": "Caisse vocale",
        "kind": "ai_pure",
        "period": "month",
        "min_plan": "enterprise",
        "limits": {"enterprise": 40},
        "tokens_estimate": (1500, 500),
    },
    "customer_summary": {
        "label": "Resume client IA",
        "kind": "hybrid",
        "period": "month",
        "min_plan": "enterprise",
        "limits": {"enterprise": 25},
        "cache_ttl_s": 43200,  # 12h
        "tokens_estimate": (2000, 800),
    },
    "generate_customer_message": {
        "label": "Messages personnalises IA",
        "kind": "hybrid",
        "period": "month",
        "min_plan": "enterprise",
        "limits": {"enterprise": 20},
        "tokens_estimate": (1000, 500),
    },
}


# ---------------------------------------------------------------------------
# Gemini 2.5 Flash pricing (as of 2026-03)
# ---------------------------------------------------------------------------
COST_PER_INPUT_TOKEN = 0.30 / 1_000_000   # $0.30 / 1M input tokens
COST_PER_OUTPUT_TOKEN = 2.50 / 1_000_000   # $2.50 / 1M output tokens


def estimate_cost(feature: str) -> float:
    """Return estimated $ cost of a single call for *feature*."""
    rule = AI_FEATURE_LIMITS.get(feature, {})
    tokens = rule.get("tokens_estimate")
    if not tokens:
        return 0.0
    inp, out = tokens
    return inp * COST_PER_INPUT_TOKEN + out * COST_PER_OUTPUT_TOKEN


# ---------------------------------------------------------------------------
# In-memory cache  (per-user, per-feature)
# ---------------------------------------------------------------------------
_cache: Dict[str, tuple] = {}  # key → (value, expires_at)


def _cache_key(owner_id: str, feature: str, extra: str = "") -> str:
    return f"{owner_id}:{feature}:{extra}"


def cache_get(owner_id: str, feature: str, extra: str = "") -> Any:
    """Return cached value or None."""
    key = _cache_key(owner_id, feature, extra)
    entry = _cache.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.monotonic() > expires_at:
        _cache.pop(key, None)
        return None
    return value


def cache_set(owner_id: str, feature: str, value: Any, extra: str = "") -> None:
    """Store *value* in cache using the feature's configured TTL."""
    rule = AI_FEATURE_LIMITS.get(feature, {})
    ttl = rule.get("cache_ttl_s")
    if not ttl:
        return
    key = _cache_key(owner_id, feature, extra)
    _cache[key] = (value, time.monotonic() + ttl)


def cache_invalidate(owner_id: str, feature: str = "", extra: str = "") -> None:
    """Invalidate cache entries for an owner (optionally scoped to a feature)."""
    prefix = f"{owner_id}:{feature}" if feature else f"{owner_id}:"
    keys_to_remove = [k for k in _cache if k.startswith(prefix)]
    for k in keys_to_remove:
        _cache.pop(k, None)


def cache_clear_expired() -> int:
    """Prune expired entries. Returns count removed."""
    now = time.monotonic()
    expired = [k for k, (_, exp) in _cache.items() if now > exp]
    for k in expired:
        _cache.pop(k, None)
    return len(expired)


# ---------------------------------------------------------------------------
# Period helpers
# ---------------------------------------------------------------------------
def _period_start(period: str, now: Optional[datetime] = None) -> datetime:
    current = now or datetime.now(timezone.utc)
    if period == "day":
        return current.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "month":
        return current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return current.replace(hour=0, minute=0, second=0, microsecond=0)


# ---------------------------------------------------------------------------
# Quota checking  (raises 403 or 429)
# ---------------------------------------------------------------------------
def _build_limit_detail(label: str, limit: int, period: str, plan: str) -> str:
    if period == "day":
        return (
            f"La limite quotidienne est atteinte pour {label}. "
            f"Votre plan {plan} autorise {limit} utilisation(s) par jour."
        )
    return (
        f"La limite mensuelle est atteinte pour {label}. "
        f"Votre plan {plan} autorise {limit} utilisation(s) par mois."
    )


async def check_ai_limit(db, user_id: str, plan: str, feature: str) -> None:
    """
    Enforce plan gate + quota for *feature*.

    Raises:
        HTTPException 403  — plan not allowed
        HTTPException 429  — quota exceeded
    """
    rule = AI_FEATURE_LIMITS.get(feature)
    if not rule:
        return  # unknown feature → no limit

    # -- Plan gate --
    min_plan = rule.get("min_plan")
    if min_plan and AI_PLAN_ORDER.get(plan, 0) < AI_PLAN_ORDER.get(min_plan, 0):
        raise HTTPException(
            status_code=403,
            detail=f"{rule['label']} est reserve a partir du plan {min_plan.title()}.",
        )

    # -- Quota --
    limit = rule.get("limits", {}).get(plan)
    if limit is None:
        raise HTTPException(
            status_code=403,
            detail=f"{rule['label']} n'est pas disponible avec votre plan actuel.",
        )

    period = rule.get("period", "month")
    period_start = _period_start(period)
    usage_count = await db.ai_usage.count_documents(
        {
            "user_id": user_id,
            "feature": feature,
            "success": True,  # count only successful calls
            "created_at": {"$gte": period_start},
        }
    )
    if usage_count >= limit:
        raise HTTPException(
            status_code=429,
            detail=_build_limit_detail(rule["label"], limit, period, plan),
        )


# ---------------------------------------------------------------------------
# Usage tracking  (called AFTER successful execution)
# ---------------------------------------------------------------------------
async def track_ai_usage(
    db,
    *,
    user_id: str,
    owner_id: str,
    plan: str,
    feature: str,
    platform: str = "unknown",
    success: bool = True,
    latency_ms: Optional[int] = None,
    tokens_input: Optional[int] = None,
    tokens_output: Optional[int] = None,
    cost_estimated: Optional[float] = None,
    ai_enhanced: bool = False,
) -> None:
    """
    Record one AI feature usage event.

    *cost_estimated* is auto-computed from the feature registry when omitted.
    """
    rule = AI_FEATURE_LIMITS.get(feature, {})
    kind = rule.get("kind", "unknown")

    if cost_estimated is None and success:
        cost_estimated = estimate_cost(feature)

    doc = {
        "user_id": user_id,
        "owner_id": owner_id,
        "plan": plan,
        "feature": feature,
        "kind": kind,
        "platform": platform,
        "success": success,
        "ai_enhanced": ai_enhanced,
        "latency_ms": latency_ms,
        "tokens_input": tokens_input,
        "tokens_output": tokens_output,
        "cost_estimated": cost_estimated if success else 0.0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.ai_usage.insert_one(doc)


# ---------------------------------------------------------------------------
# Admin analytics helpers
# ---------------------------------------------------------------------------
async def get_ai_usage_stats(db, days: int = 30) -> Dict[str, Any]:
    """
    Aggregate AI usage data for admin dashboard.
    Returns global stats, per-feature, per-plan, top accounts.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    pipeline_global = [
        {"$match": {"created_at": {"$gte": since}}},
        {
            "$group": {
                "_id": None,
                "total_calls": {"$sum": 1},
                "total_success": {"$sum": {"$cond": ["$success", 1, 0]}},
                "total_failures": {"$sum": {"$cond": ["$success", 0, 1]}},
                "total_cost": {"$sum": {"$ifNull": ["$cost_estimated", 0]}},
                "avg_latency": {"$avg": "$latency_ms"},
            }
        },
    ]

    pipeline_by_feature = [
        {"$match": {"created_at": {"$gte": since}}},
        {
            "$group": {
                "_id": "$feature",
                "calls": {"$sum": 1},
                "successes": {"$sum": {"$cond": ["$success", 1, 0]}},
                "failures": {"$sum": {"$cond": ["$success", 0, 1]}},
                "cost": {"$sum": {"$ifNull": ["$cost_estimated", 0]}},
                "avg_latency": {"$avg": "$latency_ms"},
            }
        },
        {"$sort": {"calls": -1}},
    ]

    pipeline_by_plan = [
        {"$match": {"created_at": {"$gte": since}}},
        {
            "$group": {
                "_id": "$plan",
                "calls": {"$sum": 1},
                "cost": {"$sum": {"$ifNull": ["$cost_estimated", 0]}},
            }
        },
        {"$sort": {"calls": -1}},
    ]

    pipeline_top_accounts = [
        {"$match": {"created_at": {"$gte": since}}},
        {
            "$group": {
                "_id": "$owner_id",
                "calls": {"$sum": 1},
                "cost": {"$sum": {"$ifNull": ["$cost_estimated", 0]}},
            }
        },
        {"$sort": {"cost": -1}},
        {"$limit": 20},
    ]

    pipeline_daily = [
        {"$match": {"created_at": {"$gte": since}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "calls": {"$sum": 1},
                "cost": {"$sum": {"$ifNull": ["$cost_estimated", 0]}},
                "failures": {"$sum": {"$cond": ["$success", 0, 1]}},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    pipeline_quota_blocked = [
        {"$match": {"created_at": {"$gte": since}, "success": False}},
        {
            "$group": {
                "_id": {"feature": "$feature", "plan": "$plan"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]

    global_stats = await db.ai_usage.aggregate(pipeline_global).to_list(1)
    by_feature = await db.ai_usage.aggregate(pipeline_by_feature).to_list(50)
    by_plan = await db.ai_usage.aggregate(pipeline_by_plan).to_list(10)
    top_accounts = await db.ai_usage.aggregate(pipeline_top_accounts).to_list(20)
    daily = await db.ai_usage.aggregate(pipeline_daily).to_list(days + 1)
    quota_blocked = await db.ai_usage.aggregate(pipeline_quota_blocked).to_list(20)

    g = global_stats[0] if global_stats else {}

    return {
        "period_days": days,
        "total_calls": g.get("total_calls", 0),
        "total_success": g.get("total_success", 0),
        "total_failures": g.get("total_failures", 0),
        "failure_rate": round(
            g.get("total_failures", 0) / max(g.get("total_calls", 1), 1) * 100, 1
        ),
        "total_cost_usd": round(g.get("total_cost", 0), 4),
        "avg_latency_ms": round(g.get("avg_latency") or 0, 0),
        "by_feature": [
            {
                "feature": r["_id"],
                "label": AI_FEATURE_LIMITS.get(r["_id"], {}).get("label", r["_id"]),
                "kind": AI_FEATURE_LIMITS.get(r["_id"], {}).get("kind", "unknown"),
                "calls": r["calls"],
                "successes": r["successes"],
                "failures": r["failures"],
                "cost_usd": round(r["cost"], 4),
                "avg_latency_ms": round(r.get("avg_latency") or 0, 0),
            }
            for r in by_feature
        ],
        "by_plan": [
            {"plan": r["_id"], "calls": r["calls"], "cost_usd": round(r["cost"], 4)}
            for r in by_plan
        ],
        "top_accounts": [
            {
                "owner_id": r["_id"],
                "calls": r["calls"],
                "cost_usd": round(r["cost"], 4),
            }
            for r in top_accounts
        ],
        "daily": [
            {
                "date": r["_id"],
                "calls": r["calls"],
                "cost_usd": round(r["cost"], 4),
                "failures": r["failures"],
            }
            for r in daily
        ],
        "quota_blocked": [
            {
                "feature": r["_id"]["feature"],
                "plan": r["_id"]["plan"],
                "count": r["count"],
            }
            for r in quota_blocked
        ],
        "feature_registry": {
            k: {
                "label": v["label"],
                "kind": v.get("kind", "unknown"),
                "period": v.get("period", "month"),
                "min_plan": v.get("min_plan"),
                "limits": v.get("limits", {}),
                "cache_ttl_s": v.get("cache_ttl_s"),
            }
            for k, v in AI_FEATURE_LIMITS.items()
        },
    }


async def get_ai_usage_detail(
    db,
    days: int = 7,
    feature: Optional[str] = None,
    plan: Optional[str] = None,
    owner_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Dict[str, Any]:
    """
    Return paginated AI usage log with optional filters.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    match: Dict[str, Any] = {"created_at": {"$gte": since}}
    if feature:
        match["feature"] = feature
    if plan:
        match["plan"] = plan
    if owner_id:
        match["owner_id"] = owner_id

    total = await db.ai_usage.count_documents(match)
    rows = (
        await db.ai_usage.find(match, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    # Serialize datetimes
    for r in rows:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "rows": rows,
    }


# ---------------------------------------------------------------------------
# DB index helper  (call once at startup)
# ---------------------------------------------------------------------------
async def ensure_ai_indexes(db) -> None:
    """Create indexes on ai_usage collection for efficient queries."""
    coll = db.ai_usage
    await coll.create_index([("user_id", 1), ("feature", 1), ("created_at", -1)])
    await coll.create_index([("owner_id", 1), ("created_at", -1)])
    await coll.create_index([("feature", 1), ("created_at", -1)])
    await coll.create_index([("created_at", -1)])
