from datetime import date, datetime, time, timedelta, timezone


def resolve_analytics_period(
    now: datetime, days: int, start_date: date | None, end_date: date | None
) -> tuple[datetime, datetime, datetime, int]:
    if start_date is None and end_date is None:
        start = now - timedelta(days=days)
        return start - timedelta(days=days), start, now, days
    if start_date is None or end_date is None or start_date > end_date:
        raise ValueError("Sélectionnez une date de début et une date de fin dans le bon ordre.")
    duration = (end_date - start_date).days + 1
    if duration > 365:
        raise ValueError("La période ne peut pas dépasser 365 jours.")
    start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    try:
        end = datetime.combine(end_date, time.max, tzinfo=timezone.utc) + timedelta(microseconds=1)
        previous = start - timedelta(days=duration)
    except OverflowError as exc:
        raise ValueError("Les dates sélectionnées ne sont pas prises en charge.") from exc
    return previous, start, end, duration
