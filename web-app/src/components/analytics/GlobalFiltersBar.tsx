'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAnalyticsFilters } from '../../contexts/AnalyticsFiltersContext';

const FIELD_STYLE = 'min-h-11 w-full min-w-0 rounded-lg border border-white/10 bg-[#111827] px-3 text-sm text-white focus:border-primary focus:outline-none';

export default function GlobalFiltersBar() {
    const { t, i18n } = useTranslation();
    const { filters, meta, metaLoading, metaError, setFilter, setDateRange, resetFilters, refreshMeta } = useAnalyticsFilters();
    const [expanded, setExpanded] = useState(false);
    const [custom, setCustom] = useState(filters.useCustomRange);
    const [startDate, setStartDate] = useState(filters.startDate);
    const [endDate, setEndDate] = useState(filters.endDate);
    const [dateError, setDateError] = useState(false);
    const formatDate = (date: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(date));
    const period = filters.useCustomRange
        ? `${formatDate(filters.startDate)} – ${formatDate(filters.endDate)}`
        : t('analytics_filters.days', { count: filters.days });
    const dimensions = [
        { key: 'storeId', label: 'store', options: meta.stores },
        { key: 'categoryId', label: 'category', options: meta.categories },
        { key: 'supplierId', label: 'supplier', options: meta.suppliers },
    ] as const;
    const activeLabels = dimensions.flatMap(({ key, options }) => options.find((option) => option.id === filters[key])?.label || []);

    return (
        <section className="mx-4 mt-4 rounded-lg border border-white/10 bg-white/[0.03] md:mx-6">
            <button type="button" aria-expanded={expanded} aria-controls="analytics-filter-fields"
                onClick={() => setExpanded(!expanded)}
                className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left text-sm text-white">
                <Filter size={17} className="shrink-0 text-primary" />
                <span className="shrink-0 font-semibold">{t('analytics_filters.title')}</span>
                <span className="min-w-0 flex-1 truncate text-right text-xs text-slate-300">{[period, ...activeLabels].join(' · ')}</span>
                <ChevronDown size={17} className={`shrink-0 ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <div id="analytics-filter-fields" hidden={!expanded} className="space-y-3 border-t border-white/10 p-3">
                {metaLoading ? (
                    <p role="status" className="text-sm text-slate-300">{t('analytics_filters.loading')}</p>
                ) : metaError ? (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                        <span role="status">{t('analytics_filters.error')}</span>
                        <button type="button" onClick={refreshMeta} className="min-h-11 font-semibold text-primary">{t('analytics_filters.retry')}</button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {meta.periods.map(({ days }) => (
                                <button type="button" key={days} aria-pressed={!custom && filters.days === days}
                                    onClick={() => { setFilter('days', days); setCustom(false); setDateError(false); }}
                                    className="min-h-11 rounded-lg border border-white/10 px-3 text-sm text-slate-200 aria-pressed:bg-primary/20 aria-pressed:text-primary">
                                    {t('analytics_filters.days', { count: days })}
                                </button>
                            ))}
                            <button type="button" aria-pressed={custom} onClick={() => setCustom(true)}
                                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-slate-200 aria-pressed:bg-primary/20 aria-pressed:text-primary">
                                <Calendar size={15} /> {t('analytics_filters.dates')}
                            </button>
                            <button type="button" onClick={() => { resetFilters(); setCustom(false); setStartDate(''); setEndDate(''); setDateError(false); }}
                                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-slate-300">
                                <RotateCcw size={15} /> {t('analytics_filters.reset')}
                            </button>
                        </div>
                        {custom && (
                            <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
                                event.preventDefault();
                                const duration = (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1;
                                if (!(duration >= 1 && duration <= 365)) { setDateError(true); return; }
                                setDateError(false);
                                setDateRange(startDate, endDate);
                                setExpanded(false);
                            }}>
                                <label className="min-w-0 flex-1 basis-32 space-y-1 text-sm text-slate-300">
                                    <span>{t('analytics_filters.start')}</span>
                                    <input type="date" required value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className={FIELD_STYLE} />
                                </label>
                                <label className="min-w-0 flex-1 basis-32 space-y-1 text-sm text-slate-300">
                                    <span>{t('analytics_filters.end')}</span>
                                    <input type="date" required value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className={FIELD_STYLE} />
                                </label>
                                <button type="submit" className="min-h-11 rounded-lg bg-primary/20 px-3 text-sm font-semibold text-primary">{t('analytics_filters.apply')}</button>
                                {dateError && <p role="alert" className="basis-full text-sm text-rose-300">{t('analytics_filters.date_error')}</p>}
                            </form>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {dimensions.filter(({ options }) => options.length > 0).map(({ key, label, options }) => (
                                <label key={key} className="min-w-0 space-y-1 text-sm text-slate-300">
                                    <span>{t(`analytics_filters.${label}`)}</span>
                                    <select value={filters[key]} onChange={(event) => setFilter(key, event.target.value)} className={FIELD_STYLE}>
                                        <option value="">{t(`analytics_filters.default_${label}`)}</option>
                                        {options.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                                    </select>
                                </label>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
