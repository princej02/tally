import type { Balance, Expense } from "./types";

export function calculateBalances(expenses: Expense[]): Balance[] {
  const balances = new Map<string, number>()

  const add = (person: string, delta: number): void => {
    balances.set(person, (balances.get(person) ?? 0) + delta)
  }

  for (const expense of expenses) {
    const { amountPence, paidBy, splitBetween} = expense;
    
    const shareCount = splitBetween.length;
    if (shareCount === 0) continue;

    const base = Math.floor(amountPence / shareCount);
    const remainder = amountPence - base * shareCount;

    add(paidBy, amountPence);

    const sortedSplit = [...splitBetween].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    sortedSplit.forEach((person, i) => {
      const share = base + (i < remainder ? 1 : 0);
      add(person, -share);
    });
  }

  return [...balances]
    .map<Balance>(([person, netPence]) => ({ person, netPence }))
    .sort((a, b) => (a.person < b.person ? -1 : a.person > b.person ? 1 : 0));
}

