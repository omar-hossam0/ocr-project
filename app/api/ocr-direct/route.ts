import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!uploaded || !(uploaded instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "'file' is required",
        },
        { status: 400 },
      );
    }

    const fileExt = path.extname(uploaded.name || "").toLowerCase();
    
    // Create temp directory
    const tempDir = path.join(process.cwd(), "temp");
    await fs.mkdir(tempDir, { recursive: true });
    
    // Save file temporarily
    const tempFilePath = path.join(tempDir, uploaded.name);
    const bytes = Buffer.from(await uploaded.arrayBuffer());
    await fs.writeFile(tempFilePath, bytes);

    console.log(`File saved temporarily: ${tempFilePath}`);

    // Run OCR directly
    const scriptPath = path.join(process.cwd(), "scripts", "ocr_runner.py");
    const pythonPath = process.env.OCR_PYTHON_PATH || "python";

    // Enhanced OCR parameters for better text detection
    const ocrParams = [
      '--oem',  // Enable OEM engine for better accuracy
      '--psm', '6',  // Assume single uniform block of text
      '--dpi', '300',  // Higher DPI for better text recognition
      '--user_words', 'none',  // Don't use word list
      '--user_patterns', 'none'  // Don't use pattern dictionary
    ].join(' ');

    return new Promise<NextResponse>((resolve) => {
      let stdout = "";
      let stderr = "";

      const child = spawn(pythonPath, [scriptPath, ...ocrParams, tempFilePath], {
        cwd: process.cwd(),
        shell: false,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
        },
      });

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("close", (code) => {
        // Clean up temp file
        fs.rm(tempFilePath, { force: true }).catch(() => {});

        if (code === 0) {
          try {
            const lastLine = stdout.trim().split('\n').pop();
            const result = lastLine ? JSON.parse(lastLine) : { success: false, error: "No output" };
            
            if (result.success) {
              resolve(NextResponse.json({
                success: true,
                data: {
                  text: result.text || "",
                  engine: result.engine || "easyocr",
                  device: result.device || "cpu",
                  pages_processed: result.pages_processed,
                  total_pages: result.total_pages,
                },
                timestamp: new Date().toISOString(),
              }));
            } else {
              resolve(NextResponse.json({
                success: false,
                error: result.error || "OCR processing failed",
                details: result,
              }, { status: 500 }));
            }
          } catch (parseError) {
            resolve(NextResponse.json({
              success: false,
              error: "Failed to parse OCR result",
              details: { stdout: stdout, stderr, parseError: parseError.message },
            }, { status: 500 }));
          }
        } else {
          resolve(NextResponse.json({
            success: false,
            error: `OCR script failed with code ${code}`,
            details: { stdout, stderr },
          }, { status: 500 }));
        }
      });

      child.on("error", (error) => {
        // Clean up temp file
        fs.rm(tempFilePath, { force: true }).catch(() => {});
        
        resolve(NextResponse.json({
          success: false,
          error: `Failed to start OCR process: ${error.message}`,
          details: { stderr },
        }, { status: 500 }));
      });
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unexpected OCR API error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
