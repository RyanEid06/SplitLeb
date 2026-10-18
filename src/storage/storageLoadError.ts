export class DatabaseUpgradeBlockedError extends DOMException {
  constructor() {
    super(
      "Close other SplitLeb tabs or windows, then reload this page to finish the update. Your saved data has not been cleared.",
      "InvalidStateError",
    );
  }
}

export class DatabaseOpenTimeoutError extends DOMException {
  constructor() {
    super(
      "Opening your saved data is taking longer than expected. Close other SplitLeb tabs or windows, then reload this page. Your saved data has not been cleared.",
      "TimeoutError",
    );
  }
}

export function storageLoadErrorMessage(error: unknown, fallback: string) {
  return error instanceof DatabaseUpgradeBlockedError ||
    error instanceof DatabaseOpenTimeoutError
    ? error.message
    : fallback;
}
