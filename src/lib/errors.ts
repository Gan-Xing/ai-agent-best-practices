import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Invalid request",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return Response.json(
      {
        error: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return Response.json(
        {
          error: "Unique constraint violation",
          details: error.meta ?? null,
        },
        { status: 409 },
      );
    }
  }

  console.error(error);

  return Response.json(
    {
      error: "Internal server error",
    },
    { status: 500 },
  );
}
