export interface Balance {
  person: string
  netPence: number
}

export interface Expense {
  id: number
  description: string
  amountPence: number
  paidBy: string
  splitBetween: Array<string>
  createdAt: string
}

export type CreateExpenseInput = Omit<Expense, "id" | "createdAt">;