ALTER TABLE bills ADD COLUMN cashier_name_snapshot TEXT NOT NULL DEFAULT '';
ALTER TABLE bills ADD COLUMN counter_snapshot TEXT NOT NULL DEFAULT 'Counter 01';
ALTER TABLE bills ADD COLUMN cash_received REAL NOT NULL DEFAULT 0;
ALTER TABLE bills ADD COLUMN change_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE bills ADD COLUMN round_off REAL NOT NULL DEFAULT 0;

ALTER TABLE bill_items ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;

UPDATE bills
SET cash_received = grand_total,
    cashier_name_snapshot = cashier_id
WHERE cash_received = 0;