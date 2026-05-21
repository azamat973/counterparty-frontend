
-- Запрос 1: Топ-10 пар контрагентов по сумме оборота
SELECT
    sender_id,
    receiver_id,
    SUM(ABS(amount_kzt))   AS total_turnover,
    COUNT(*)               AS n_ops
FROM transactions
GROUP BY sender_id, receiver_id
ORDER BY total_turnover DESC
LIMIT 10;

-- ──────────────────────────────────────────────────────────────
-- Запрос 2: Месячный rolling-sum оборота по каждому отправителю
--           (window function — 3-месячное скользящее окно)
SELECT
    sender_id,
    month,
    SUM(amount_kzt)                               AS monthly_sum,
    SUM(SUM(amount_kzt)) OVER (
        PARTITION BY sender_id
        ORDER BY month
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    )                                             AS rolling_3m
FROM transactions
GROUP BY sender_id, month
ORDER BY sender_id, month;

-- ──────────────────────────────────────────────────────────────
-- Запрос 3: Контрагенты, у которых >70% входящих платежей
--           приходит от одного источника (признак аномальной концентрации)
WITH incoming AS (
    SELECT
        receiver_id,
        sender_id,
        SUM(amount_kzt)   AS from_sender
    FROM transactions
    WHERE amount_kzt > 0
    GROUP BY receiver_id, sender_id
),
totals AS (
    SELECT receiver_id, SUM(from_sender) AS total_in
    FROM incoming
    GROUP BY receiver_id
),
max_from AS (
    SELECT receiver_id, MAX(from_sender) AS max_single
    FROM incoming
    GROUP BY receiver_id
)
SELECT
    m.receiver_id,
    t.total_in,
    m.max_single,
    ROUND(m.max_single * 100.0 / t.total_in, 1) AS concentration_pct
FROM max_from m
JOIN totals t ON m.receiver_id = t.receiver_id
WHERE m.max_single * 1.0 / t.total_in > 0.70
ORDER BY concentration_pct DESC;
