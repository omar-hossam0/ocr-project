declare module "*.css";
declare module "*.scss";
declare module "*.sass";

declare module "tesseract.js" {
  interface RecognizeResult {
    data?: { text?: string };
  }
  interface Worker {
    recognize(image: Buffer | string): Promise<RecognizeResult>;
    terminate(): Promise<unknown>;
  }
  export function createWorker(langs?: string): Promise<Worker>;
}
