import { db } from '../database/db.js';

type ExpenseInput = {
  expenseDate?: string;
  categoryId?: number;
  description?: string;
  amount?: number;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  status?: string;
};

const now = () => new Date().toISOString();

function validate(input: ExpenseInput) {
  const expenseDate = String(input.expenseDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) || Number.isNaN(Date.parse(`${expenseDate}T00:00:00`))) throw new Error('INVALID_EXPENSE_DATE');
  const category = db.prepare("SELECT id, name FROM expense_categories WHERE id = ? AND status = 'ACTIVE'").get(Number(input.categoryId)) as { id: number; name: string } | undefined;
  if (!category) throw new Error('INVALID_EXPENSE_CATEGORY');
  const description = String(input.description || '').trim();
  if (!description) throw new Error('INVALID_EXPENSE_DESCRIPTION');
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('INVALID_EXPENSE_AMOUNT');
  const paymentMethod = String(input.paymentMethod || '').toUpperCase();
  if (!['CASH', 'UPI', 'BANK', 'CARD', 'OTHER'].includes(paymentMethod)) throw new Error('INVALID_EXPENSE_PAYMENT_METHOD');
  const status = String(input.status || 'PAID').toUpperCase();
  if (!['PAID', 'PENDING'].includes(status)) throw new Error('INVALID_EXPENSE_STATUS');
  return { expenseDate, category, description, amount: Math.round((amount + Number.EPSILON) * 100) / 100, paymentMethod, reference: String(input.reference || '').trim(), notes: String(input.notes || '').trim(), status };
}

function nextExpenseNumber(date: string) {
  const year = new Date(`${date}T00:00:00`).getFullYear();
  const prefix = `EXP-${year}-`;
  const latest = db.prepare('SELECT expense_number FROM expenses WHERE expense_number LIKE ? ORDER BY id DESC LIMIT 1').get(`${prefix}%`) as { expense_number: string } | undefined;
  return `${prefix}${String(latest ? Number(latest.expense_number.slice(-6)) + 1 : 1).padStart(6, '0')}`;
}

export function listExpenseCategories() {
  return db.prepare('SELECT * FROM expense_categories ORDER BY status DESC, name COLLATE NOCASE').all();
}

export function createExpenseCategory(nameValue: string) {
  const name = String(nameValue || '').trim();
  if (!name) throw new Error('INVALID_EXPENSE_CATEGORY_NAME');
  const existing = db.prepare('SELECT * FROM expense_categories WHERE lower(name) = lower(?)').get(name);
  if (existing) return existing;
  const timestamp = now();
  const result = db.prepare('INSERT INTO expense_categories (name, status, created_at, updated_at) VALUES (?, ?, ?, ?)').run(name, 'ACTIVE', timestamp, timestamp);
  return db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(result.lastInsertRowid);
}

export function listExpenses(query: { search?: string; categoryId?: string; status?: string; dateFrom?: string; dateTo?: string } = {}) {
  const terms: string[] = [];
  const values: Array<string | number> = [];
  if (query.search?.trim()) {
    const term = `%${query.search.trim()}%`;
    terms.push('(e.expense_number LIKE ? OR e.description LIKE ? OR e.reference LIKE ? OR e.created_by LIKE ? OR c.name LIKE ?)');
    values.push(term, term, term, term, term);
  }
  if (query.categoryId) { terms.push('e.category_id = ?'); values.push(Number(query.categoryId)); }
  if (query.status && query.status !== 'ALL') { terms.push('e.status = ?'); values.push(query.status); }
  if (query.dateFrom) { terms.push('e.expense_date >= ?'); values.push(query.dateFrom); }
  if (query.dateTo) { terms.push('e.expense_date <= ?'); values.push(query.dateTo); }
  const where = terms.length ? `WHERE ${terms.join(' AND ')}` : '';
  return db.prepare(`
    SELECT e.*, c.name AS category_name
    FROM expenses e JOIN expense_categories c ON c.id = e.category_id
    ${where} ORDER BY e.expense_date DESC, e.id DESC LIMIT 1000
  `).all(...values);
}

export function getExpense(id: number) {
  return db.prepare('SELECT e.*, c.name AS category_name FROM expenses e JOIN expense_categories c ON c.id = e.category_id WHERE e.id = ?').get(id);
}

export function expenseSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  return db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN expense_date = ? THEN amount ELSE 0 END), 0) AS today_total,
      COALESCE(SUM(CASE WHEN substr(expense_date, 1, 7) = ? THEN amount ELSE 0 END), 0) AS month_total,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending_total,
      COALESCE(SUM(amount), 0) AS total_expenses
    FROM expenses
  `).get(today, month);
}

export function createExpense(input: ExpenseInput, createdBy: string) {
  const expense = validate(input);
  const timestamp = now();
  const result = db.prepare(`
    INSERT INTO expenses (expense_number, expense_date, category_id, category_name_snapshot, description, amount, payment_method, reference, notes, created_by, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nextExpenseNumber(expense.expenseDate), expense.expenseDate, expense.category.id, expense.category.name, expense.description, expense.amount, expense.paymentMethod, expense.reference, expense.notes, createdBy || 'Owner', expense.status, timestamp, timestamp);
  return getExpense(Number(result.lastInsertRowid));
}

export function updateExpense(id: number, input: ExpenseInput) {
  if (!db.prepare('SELECT id FROM expenses WHERE id = ?').get(id)) return undefined;
  const expense = validate(input);
  db.prepare(`
    UPDATE expenses SET expense_date = ?, category_id = ?, category_name_snapshot = ?, description = ?, amount = ?,
      payment_method = ?, reference = ?, notes = ?, status = ?, updated_at = ? WHERE id = ?
  `).run(expense.expenseDate, expense.category.id, expense.category.name, expense.description, expense.amount, expense.paymentMethod, expense.reference, expense.notes, expense.status, now(), id);
  return getExpense(id);
}

export function deleteExpense(id: number) {
  const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return result.changes > 0;
}