import { useMemo, useState } from "react";
import {
  buildCompactShareSummary,
  buildDetailedShareSummary,
  type ShareSummaryInput,
} from "../../domain/bill/shareSummary";

type ShareSummaryPanelProps = {
  input: ShareSummaryInput;
};

export function ShareSummaryPanel({ input }: ShareSummaryPanelProps) {
  const [mode, setMode] = useState<"compact" | "detailed">("compact");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const summaryText = useMemo(() => {
    if (mode === "compact") {
      return buildCompactShareSummary(input);
    }

    return buildDetailedShareSummary(input);
  }, [input, mode]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyStatus("copied");

      window.setTimeout(() => {
        setCopyStatus("idle");
      }, 1600);
    } catch {
      setCopyStatus("failed");

      window.setTimeout(() => {
        setCopyStatus("idle");
      }, 2200);
    }
  }

  return (
    <section className="share-summary-panel">
      <div className="share-summary-header">
        <div>
          <h2>Share summary</h2>
          <p>Copy a clean WhatsApp-style summary.</p>
        </div>

        <button type="button" className="primary-button" onClick={handleCopy}>
          {copyStatus === "copied" ? "Copied" : "Copy"}
        </button>
      </div>

      <div
        className="share-summary-toggle"
        aria-label="Share summary mode"
        role="group"
      >
        <button
          type="button"
          className={mode === "compact" ? "active" : ""}
          aria-pressed={mode === "compact"}
          onClick={() => setMode("compact")}
        >
          Compact
        </button>

        <button
          type="button"
          className={mode === "detailed" ? "active" : ""}
          aria-pressed={mode === "detailed"}
          onClick={() => setMode("detailed")}
        >
          Detailed
        </button>
      </div>

      {copyStatus === "failed" ? (
        <p className="form-error">Copy failed. Select the text manually.</p>
      ) : null}

      <textarea
        className="share-summary-textarea"
        aria-label="Summary to copy"
        value={summaryText}
        readOnly
      />
    </section>
  );
}
