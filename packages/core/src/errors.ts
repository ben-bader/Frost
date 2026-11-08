export type ErrorCode =
  | "FS1001" // Route conflict
  | "FS1002" // Invalid route module export
  | "FS1003" // Route loader execution failure
  | "FS1004" // Server-only module imported in client
  | "FS1005" // Static export failure
  | "FS1006" // Route not found
  | "FS1007" // Method not allowed
  | "FS1008" // Hydration mismatch
  | "FS1009" // Server-only environment variable read in client code
  | "FS1010" // Route contract violation
  | "FS1011"; // Request body too large

export interface FrostErrorOptions extends ErrorOptions {
  code: ErrorCode;
  importer?: string;
  target?: string;
  hint?: string;
  docsUrl?: string;
  /** HTTP status the error should surface as when thrown in a handler. */
  status?: number;
}

export class FrostError extends Error {
  public readonly code: ErrorCode;
  public readonly importer?: string;
  public readonly target?: string;
  public readonly hint?: string;
  public readonly docsUrl?: string;
  public readonly status?: number;

  constructor(message: string, options: FrostErrorOptions) {
    super(message, options);
    this.name = "FrostError";
    this.code = options.code;
    this.importer = options.importer;
    this.target = options.target;
    this.hint = options.hint;
    this.docsUrl = options.docsUrl;
    this.status = options.status;
  }

  public toDiagnosticString(): string {
    let output = `${this.code}: ${this.message}\n`;
    if (this.importer) {
      output += `  Importer: ${this.importer}\n`;
    }
    if (this.target) {
      output += `  Target:   ${this.target}\n`;
    }
    if (this.hint) {
      output += `\n  Hint: ${this.hint}\n`;
    }
    if (this.docsUrl) {
      output += `  Documentation: ${this.docsUrl}\n`;
    }
    return output;
  }
}
