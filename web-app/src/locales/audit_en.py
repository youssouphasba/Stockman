import json

with open(r'c:\Users\Utilisateur\projet_stock\frontend\locales\en.json', 'r', encoding='utf-8-sig') as f:
    en = json.load(f)
with open(r'c:\Users\Utilisateur\projet_stock\frontend\locales\fr.json', 'r', encoding='utf-8-sig') as f:
    fr = json.load(f)

def flatten(d, prefix=''):
    items = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            items.update(flatten(v, key))
        else:
            items[key] = v
    return items

fr_flat = flatten(fr)
en_flat = flatten(en)

missing = sorted(set(fr_flat.keys()) - set(en_flat.keys()))

visible_keys = [
    'dashboard.history', 'common.export', 'common.orders',
    'reminders.inventory_check_label', 'reminders.dormant_products_label',
    'reminders.late_deliveries_label', 'reminders.replenishment_label',
    'reminders.pending_invitations_label', 'reminders.debt_recovery_label',
    'reminders.debt_recovery_desc', 'reminders.client_reactivation_label',
    'reminders.birthdays_label', 'reminders.monthly_report_label',
    'reminders.expense_spike_label',
    'reminders.inventory_check_desc', 'reminders.dormant_products_desc',
    'reminders.late_deliveries_desc', 'reminders.replenishment_desc',
    'reminders.pending_invitations_desc', 'reminders.client_reactivation_desc',
    'reminders.birthdays_desc', 'reminders.monthly_report_desc',
    'reminders.expense_spike_desc', 'reminders.unit_days',
]

result = {'missing_in_en': {}, 'visible_keys': {}}
for k in missing:
    result['missing_in_en'][k] = fr_flat[k]

for k in visible_keys:
    if k in en_flat:
        is_same = k in fr_flat and en_flat[k] == fr_flat[k]
        result['visible_keys'][k] = {'en_value': en_flat[k], 'same_as_fr': is_same}
    else:
        result['visible_keys'][k] = {'en_value': None, 'missing': True}

with open(r'c:\Users\Utilisateur\projet_stock\frontend\locales\audit_result.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print('Done')
