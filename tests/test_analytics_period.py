import unittest
from datetime import date, datetime, timedelta, timezone

from backend.analytics_period import resolve_analytics_period


class AnalyticsPeriodTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 14, 12, tzinfo=timezone.utc)

    def test_rolling_window_keeps_existing_bounds(self):
        self.assertEqual(resolve_analytics_period(self.now, 30, None, None), (
            self.now - timedelta(days=60),
            self.now - timedelta(days=30),
            self.now,
            30,
        ))

    def test_custom_range_includes_the_entire_last_day(self):
        previous, start, end, days = resolve_analytics_period(self.now, 30, date(2026, 10, 1), date(2026, 10, 3))
        self.assertEqual(days, 3)
        self.assertEqual(start.date(), date(2026, 10, 1))
        self.assertEqual(end.date(), date(2026, 10, 4))
        self.assertEqual(start - previous, end - start)
        self.assertLess(end - timedelta(microseconds=1), end)

    def test_single_day_is_allowed(self):
        day = date(2026, 11, 14)
        _, start, end, days = resolve_analytics_period(self.now, 30, day, day)
        self.assertEqual(days, 1)
        self.assertEqual(end - start, timedelta(days=1))

    def test_partial_reversed_and_excessive_ranges_are_rejected(self):
        for start, end in (
            (date(2026, 11, 14), None),
            (date(2026, 11, 14), date(2026, 11, 13)),
            (date(2025, 11, 14), date(2026, 11, 14)),
        ):
            with self.subTest(start=start, end=end), self.assertRaises(ValueError):
                resolve_analytics_period(self.now, 30, start, end)
