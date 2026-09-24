import type { Database } from "bun:sqlite";
import type { Expense } from "../core/types";

export type CreateExpenseInput = Omit<Expense, "id" | "createdAt">;

type RawExpenseRow = {
  id: number;
  description: string;
  amountPence: number;
  paidBy: string;
  splitBetween: string;
  createdAt: string;
};

function mapRowToExpense(row: RawExpenseRow): Expense {
  return {
    id: row.id,
    description: row.description,
    amountPence: row.amountPence,
    paidBy: row.paidBy,
    splitBetween: JSON.parse(row.splitBetween),
    createdAt: row.createdAt,
  }
}

export function createExpenseStore(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      amountPence INTEGER NOT NULL,
      paidBy TEXT NOT NULL,
      splitBetween TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  const insertQuery = db.query<
    RawExpenseRow,
    {
      $description: string;
      $amountPence: number;
      $paidBy: string;
      $splitBetween: string;
      $createdAt: string;
    }
  >(`
    INSERT INTO expenses (description, amountPence, paidBy, splitBetween, createdAt)
    VALUES ($description, $amountPence, $paidBy, $splitBetween, $createdAt)
    RETURNING *
  `);

  const selectAllQuery = db.query<RawExpenseRow, []>(`
    SELECT * FROM expenses
    ORDER BY createdAt DESC, id DESC
  `);

  return {
    insert(input: CreateExpenseInput): Expense {
      const createdAt = new Date().toISOString();

      const rawResult = insertQuery.get({
        $description: input.description,
        $amountPence: input.amountPence,
        $paidBy: input.paidBy,
        $splitBetween: JSON.stringify(input.splitBetween),
        $createdAt: createdAt
      });

      if (!rawResult) {
        throw new Error("Failed to insert expense row into SQLite");
      }

      return mapRowToExpense(rawResult)
    },
    selectAll(): Expense[] {
      const rows = selectAllQuery.all();
      return rows.map(mapRowToExpense);
    }
  }
}