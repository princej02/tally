import * as z from "zod";

export interface ApiIssue {
  path: string
  message: string
}

export function formatZodError(error: z.ZodError): ApiIssue[] {
  return error.issues.map(issue => {
    const pathString = issue.path.length === 0 ? "body" : issue.path.join(".");

    return {
      path: pathString,
      message: issue.message
    }
  })
}

const personSchema = z.string().min(1, "must not be empty");

export const createExpenseSchema = z.strictObject({
  description: z.string().min(1, "must not be empty"),
  amountPence: z.number()
    .refine(val => Number.isInteger(val) && val > 0, 
      { message: "must be a positive integer" }
    ),
  paidBy: personSchema,
  splitBetween: z
    .array(personSchema)
    .nonempty("must include at least one person")
    .refine((items) => new Set(items).size === items.length, {
      message: "must not contain duplicate people"
    }),
})

