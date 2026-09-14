import { describe, expect, test } from "bun:test";
import { calculateBalances } from "../src/core/balance";
import type { Expense } from "../src/core/types";

describe("calculateBalances", () => {
  test("calculates simple balances correctly", () => {
    const expenses: Expense[] = [
      {
        id: 1,
        description: "Dinner",
        amountPence: 1200,
        paidBy: "Alice",
        splitBetween: ["Alice", "Bob", "Charlie"],
        createdAt: "2026-09-14T20:00:00Z",
      },
    ];

    const result = calculateBalances(expenses);

    expect(result).toEqual([
      { person: "Alice", netPence: 800 },
      { person: "Bob", netPence: -400 },
      { person: "Charlie", netPence: -400 },
    ]);
  });

  test("distributes remainder pennies deterministically based on sorted names", () => {
    // 1000p / 3 = 333p each + 1p remainder
    // Sorted order of splitBetween: ["Ash", "Kit", "Prince"] -> Ash gets the extra penny (334p)
    const expensesKitFirst: Expense[] = [
      {
        id: 2,
        description: "Taxi",
        amountPence: 1000,
        paidBy: "Kit",
        splitBetween: ["Kit", "Ash", "Prince"],
        createdAt: "2026-09-14T20:10:00Z",
      },
    ];

    const expensesAshFirst: Expense[] = [
      {
        id: 2,
        description: "Taxi",
        amountPence: 1000,
        paidBy: "Kit",
        splitBetween: ["Ash", "Kit", "Prince"],
        createdAt: "2026-09-14T20:10:00Z",
      },
    ];

    const result1 = calculateBalances(expensesKitFirst);
    const result2 = calculateBalances(expensesAshFirst);

    // Both input orderings must produce identical balance distributions
    expect(result1).toEqual(result2);

    expect(result1).toEqual([
      { person: "Ash", netPence: -334 },
      { person: "Kit", netPence: 667 }, // 1000 paid - 333 share
      { person: "Prince", netPence: -333 },
    ]);
  });

  test("sorts the returned output array alphabetically by person", () => {
    const expenses: Expense[] = [
      {
        id: 3,
        description: "Groceries",
        amountPence: 600,
        paidBy: "Zack",
        splitBetween: ["Zack", "Bob", "Alice"],
        createdAt: "2026-09-14T20:20:00Z",
      },
    ];

    const result = calculateBalances(expenses);

    expect(result.map((r) => r.person)).toEqual(["Alice", "Bob", "Zack"]);
  });

  test("aggregates multiple expenses correctly", () => {
    const expenses: Expense[] = [
      {
        id: 4,
        description: "Hotel",
        amountPence: 3000,
        paidBy: "Alice",
        splitBetween: ["Alice", "Bob"],
        createdAt: "2026-09-14T20:30:00Z",
      },
      {
        id: 5,
        description: "Drinks",
        amountPence: 1000,
        paidBy: "Bob",
        splitBetween: ["Alice", "Bob"],
        createdAt: "2026-09-14T21:00:00Z",
      },
    ];

    const result = calculateBalances(expenses);

    expect(result).toEqual([
      { person: "Alice", netPence: 1000 },
      { person: "Bob", netPence: -1000 },
    ]);
  });

  test("handles payer not in splitBetween array", () => {
    const expenses: Expense[] = [
      {
        id: 6,
        description: "Gift",
        amountPence: 1000,
        paidBy: "Alice",
        splitBetween: ["Bob", "Charlie"],
        createdAt: "2026-09-14T21:15:00Z",
      },
    ];

    const result = calculateBalances(expenses);

    expect(result).toEqual([
      { person: "Alice", netPence: 1000 },
      { person: "Bob", netPence: -500 },
      { person: "Charlie", netPence: -500 },
    ]);
  });

  test("safely handles empty splitBetween arrays", () => {
    const expenses: Expense[] = [
      {
        id: 7,
        description: "Invalid expense",
        amountPence: 1000,
        paidBy: "Alice",
        splitBetween: [],
        createdAt: "2026-09-14T21:30:00Z",
      },
    ];

    const result = calculateBalances(expenses);
    expect(result).toEqual([]);
  });
});