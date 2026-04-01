import { NextRequest, NextResponse } from "next/server";
import {
  addFileTransaction,
  getFileTransactions,
  FileTransactionAction,
} from "@/app/lib/firestore";

const ALLOWED_ACTIONS: FileTransactionAction[] = ["taken", "returned", "moved"];

/**
 * GET /api/tracking
 * Query file movement transactions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get("fileId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") as FileTransactionAction | null;
    const limitRows = Number(searchParams.get("limit") || "100");

    if (action && !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Allowed actions: taken, returned, moved",
        },
        { status: 400 },
      );
    }

    const transactions = await getFileTransactions({
      fileId,
      userId,
      action: action || undefined,
      limitRows,
    });

    return NextResponse.json({
      success: true,
      count: transactions.length,
      data: transactions,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch tracking records";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tracking
 * Add a tracking transaction (taken/returned/moved)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      fileId?: string;
      userId?: string;
      userName?: string;
      action?: FileTransactionAction;
      fromLocation?: string;
      toLocation?: string;
      note?: string;
    };

    if (!body.fileId || !body.userId || !body.action) {
      return NextResponse.json(
        {
          success: false,
          error: "fileId, userId, and action are required",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_ACTIONS.includes(body.action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Allowed actions: taken, returned, moved",
        },
        { status: 400 },
      );
    }

    if ((body.action === "moved" || body.action === "returned") && !body.toLocation) {
      return NextResponse.json(
        {
          success: false,
          error: "toLocation is required for moved and returned actions",
        },
        { status: 400 },
      );
    }

    const transactionId = await addFileTransaction({
      fileId: body.fileId,
      userId: body.userId,
      userName: body.userName,
      action: body.action,
      fromLocation: body.fromLocation,
      toLocation: body.toLocation,
      note: body.note,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tracking transaction recorded successfully",
        data: {
          transactionId,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create tracking record";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
