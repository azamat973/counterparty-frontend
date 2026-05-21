"""
load_db.py — очищает transactions.csv и загружает в SQLite.
Запуск: python load_db.py
"""
import pandas as pd
import sqlite3
import re
import json
from pathlib import Path

TX_PATH  = Path('data/transactions.csv')
CAT_PATH = Path('data/categories.json')
DB_PATH  = Path('transactions.db')

WEIGHTS = [1,2,3,4,5,6,7,8,9,10,11,1,2,3,4,5,6,7,8,9,10,11]

def iin_checksum(iin: str) -> bool:
    if not re.fullmatch(r'\d{12}', str(iin)):
        return False
    digits = [int(c) for c in str(iin)]
    s = sum(w * d for w, d in zip(WEIGHTS[:11], digits[:11]))
    ctrl = s % 11
    if ctrl == 10:
        s2 = sum(w * d for w, d in zip(WEIGHTS[11:], digits[:11]))
        ctrl = s2 % 11
    return ctrl == digits[11]

def parse_date(d):
    for fmt in ['%Y-%m-%d','%Y/%m/%d','%d/%m/%Y','%d.%m.%Y','%d-%m-%Y','%m/%d/%Y']:
        try:
            return pd.to_datetime(str(d).strip(), format=fmt)
        except Exception:
            pass
    try:
        return pd.to_datetime(str(d).strip(), dayfirst=True)
    except Exception:
        return pd.NaT

def classify_kw(desc, cat_list):
    for code, name, keywords in cat_list:
        for kw in keywords:
            if kw.lower() in str(desc).lower():
                return code, name
    return 'OTHER', 'Прочее'

def main():
    print("Загрузка данных...")
    tx = pd.read_csv(TX_PATH)
    n_raw = len(tx)

    tx['sender_id']   = tx['sender_id'].apply(lambda x: re.sub(r'\D','', str(x)))
    tx['receiver_id'] = tx['receiver_id'].apply(lambda x: re.sub(r'\D','', str(x)))

    pct_s = tx['sender_id'].apply(iin_checksum).mean() * 100
    pct_r = tx['receiver_id'].apply(iin_checksum).mean() * 100
    print(f"  Валидных отправителей: {pct_s:.1f}%")
    print(f"  Валидных получателей:  {pct_r:.1f}%")

    tx['date_parsed'] = tx['date'].apply(parse_date)
    tx = tx.dropna(subset=['date_parsed'])

    dup_cols = ['sender_id','receiver_id','date_parsed','amount_kzt','description']
    n_before = len(tx)
    tx = tx.drop_duplicates(subset=dup_cols)
    print(f"  Удалено дубликатов: {n_before - len(tx)}")

    tx['description'] = tx['description'].fillna('Нет описания')
    tx['date_iso']    = tx['date_parsed'].dt.strftime('%Y-%m-%d')
    tx['month']       = tx['date_parsed'].dt.to_period('M').astype(str)

    cats = json.loads(CAT_PATH.read_text(encoding='utf-8'))
    cat_list = [(str(float(c)), d['name'], d['keywords']) for c, d in cats.items()]
    tx['cat_code'], tx['cat_name'] = zip(*tx['description'].apply(lambda d: classify_kw(d, cat_list)))

    tx_db = tx[['sender_id','receiver_id','date_iso','amount_kzt',
                'description','doc_type','cat_code','cat_name','month']].copy()
    tx_db.columns = ['sender_id','receiver_id','date','amount_kzt',
                     'description','doc_type','cat_code','cat_name','month']

    conn = sqlite3.connect(DB_PATH)
    tx_db.to_sql('transactions', conn, if_exists='replace', index=False)
    conn.close()

    print(f"\n=== Готово ===")
    print(f"  Строк в БД: {len(tx_db):,} (из {n_raw:,} исходных)")
    print(f"  Файл: {DB_PATH.absolute()}")

if __name__ == '__main__':
    main()
