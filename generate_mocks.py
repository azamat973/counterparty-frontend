"""
generate_mocks.py — деректерден public/data/*.json мок файлдарын жасайды.
Іске қосу: python3 generate_mocks.py
Алдын ала load_db.py іске қосылған болуы керек (transactions.db жасалған).
"""
import pandas as pd
import json
import sqlite3
import re
from pathlib import Path

DB_PATH  = Path('transactions.db')
CAT_PATH = Path('data/categories.json')
OUT_DIR  = Path('public/data')
OUT_DIR.mkdir(parents=True, exist_ok=True)

assert DB_PATH.exists(), "Алдымен: python3 load_db.py"

conn = sqlite3.connect(DB_PATH)
tx   = pd.read_sql("SELECT * FROM transactions", conn)
conn.close()

cats     = json.loads(CAT_PATH.read_text(encoding='utf-8'))
cat_list = [(str(float(c)), d['name'], d['keywords']) for c, d in cats.items()]

def classify_kw(desc):
    for code, name, kws in cat_list:
        for kw in kws:
            if kw.lower() in str(desc).lower():
                return code, name
    return 'OTHER', 'Прочее'

tx['cat_code'], tx['cat_name'] = zip(*tx['description'].apply(classify_kw))

# ── Топ-50 контрагентів ────────────────────────────────────────
all_vol = pd.concat([
    tx[['sender_id','amount_kzt']].rename(columns={'sender_id':'id'}),
    tx[['receiver_id','amount_kzt']].rename(columns={'receiver_id':'id'}),
]).groupby('id')['amount_kzt'].apply(lambda x: x.abs().sum()).nlargest(50).index

results = []
for cid in all_vol:
    sent = tx[tx.sender_id == cid]
    recv = tx[tx.receiver_id == cid]
    out_sum = float(sent['amount_kzt'].sum())
    in_sum  = float(recv['amount_kzt'].sum())
    n_ops   = len(sent) + len(recv)
    total   = abs(out_sum) + abs(in_sum)

    partners = pd.concat([
        sent.groupby('receiver_id')['amount_kzt'].sum().rename('amount').rename_axis('partner'),
        recv.groupby('sender_id')['amount_kzt'].sum().rename('amount').rename_axis('partner'),
    ]).groupby(level=0).sum().abs().nlargest(3).reset_index()
    top3 = [{'partner': str(r['partner']), 'amount': float(r['amount'])} for _, r in partners.iterrows()]

    all_m = pd.concat([sent.assign(sign=-1), recv.assign(sign=1)])
    monthly = []
    for m, grp in all_m.groupby('month'):
        monthly.append({
            'month': m,
            'out': float(abs(grp[grp.sign == -1]['amount_kzt'].sum())),
            'in':  float(abs(grp[grp.sign ==  1]['amount_kzt'].sum())),
        })

    results.append({'id': str(cid), 'total': total, 'total_abs': total,
                    'out_sum': out_sum, 'in_sum': in_sum,
                    'n_ops': n_ops, 'top3': top3, 'monthly': sorted(monthly, key=lambda x: x['month'])})

(OUT_DIR / 'mock_counterparties.json').write_text(
    json.dumps(results, ensure_ascii=False), encoding='utf-8')
print(f"✅ mock_counterparties.json — {len(results)} контрагент")

# ── 2000 транзакций (жеткілікті үлгі) ─────────────────────────
sample = tx.sample(min(2000, len(tx)), random_state=42).copy()
sample['id'] = sample.index.astype(str)
records = sample[['id','sender_id','receiver_id','date','amount_kzt',
                  'description','doc_type','cat_code','cat_name']].to_dict('records')
(OUT_DIR / 'mock_transactions.json').write_text(
    json.dumps(records, ensure_ascii=False), encoding='utf-8')
print(f"✅ mock_transactions.json — {len(records)} транзакция")

# ── Пустой mock_doc_dist ───────────────────────────────────────
(OUT_DIR / 'mock_doc_dist.json').write_text('{}', encoding='utf-8')
print("✅ mock_doc_dist.json")
print("\nДайын! Енді: npm run dev")
