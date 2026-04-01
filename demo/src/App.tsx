import { startTransition, useEffect, useState } from "react";
import type { OrderbookCurrency } from "@peerlytics/sdk";
import {
  CURRENCIES,
  PLATFORMS,
  type CurrencyEntry,
  type DepositInfo,
  type PlatformEntry,
} from "@usdctofiat/offramp";
import { useOfframp } from "@usdctofiat/offramp/react";
import { base } from "viem/chains";
import {
  connectInjectedWallet,
  getInjectedProvider,
  restoreInjectedWallet,
  switchToBaseNetwork,
  type WalletSession,
} from "./lib/wallet";
import {
  formatNumber,
  formatRate,
  formatRelativeTime,
  formatUsd,
  shortenAddress,
} from "./lib/format";

// === Types ===

type AllowedMarket = {
  platform: PlatformEntry;
  currencies: readonly CurrencyEntry[];
};

const allowedMarkets = [
  {
    platform: PLATFORMS.REVOLUT,
    currencies: [CURRENCIES.GBP, CURRENCIES.USD, CURRENCIES.EUR],
  },
  {
    platform: PLATFORMS.VENMO,
    currencies: [CURRENCIES.USD],
  },
] as const satisfies readonly AllowedMarket[];

type AllowedPlatformId = (typeof allowedMarkets)[number]["platform"]["id"];

const flowSteps = [
  { id: "approving", label: "Approve" },
  { id: "registering", label: "Register" },
  { id: "depositing", label: "Deposit" },
  { id: "confirming", label: "Confirm" },
  { id: "delegating", label: "Delegate" },
] as const;

type OrderbookState = {
  orderbook: OrderbookCurrency | null;
  updatedAt: string | null;
};

type CachedOrderbookState = OrderbookState & {
  platformId: AllowedPlatformId;
  currencyCode: string;
};

// === SDK Code Snippets ===

const PEERLYTICS_SNIPPET = `import { Peerlytics } from "@peerlytics/sdk";

const client = new Peerlytics({
  apiKey: process.env.PEERLYTICS_API_KEY,
});

// Live orderbook — server-side, API-keyed
const { orderbooks } = await client.getOrderbook({
  currency: "GBP",
  platform: "revolut",
});`;

const USDCTOFIAT_SNIPPET = `import { useOfframp, PLATFORMS, CURRENCIES }
  from "@usdctofiat/offramp/react";

const { offramp } = useOfframp();

// Delegated sell — resumable, multi-step
await offramp(walletClient, {
  amount: "100",
  platform: PLATFORMS.REVOLUT,
  currency: CURRENCIES.GBP,
  identifier: "alice",
});`;

// === App ===

export default function App() {
  const [walletSession, setWalletSession] = useState<WalletSession | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [selectedPlatformId, setSelectedPlatformId] = useState<AllowedPlatformId>(
    PLATFORMS.REVOLUT.id,
  );
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(CURRENCIES.USD.code);
  const [amount, setAmount] = useState("100");
  const [identifier, setIdentifier] = useState("");

  const [orderbookState, setOrderbookState] = useState<OrderbookState>({
    orderbook: null,
    updatedAt: null,
  });
  const [isOrderbookLoading, setIsOrderbookLoading] = useState(false);
  const [orderbookError, setOrderbookError] = useState<string | null>(null);

  const [depositItems, setDepositItems] = useState<DepositInfo[]>([]);
  const [isDepositsLoading, setIsDepositsLoading] = useState(false);
  const [depositsError, setDepositsError] = useState<string | null>(null);

  const [copiedPeerlyticsInstall, setCopiedPeerlyticsInstall] = useState(false);
  const [copiedOfframpInstall, setCopiedOfframpInstall] = useState(false);
  const [copiedPeerlyticsCode, setCopiedPeerlyticsCode] = useState(false);
  const [copiedOfframpCode, setCopiedOfframpCode] = useState(false);

  const [closingDepositId, setClosingDepositId] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  const {
    offramp,
    deposits: loadDeposits,
    close: closeDeposit,
    step,
    error,
    txHash,
    depositId,
    isLoading,
    reset,
  } = useOfframp();

  const selectedMarket =
    allowedMarkets.find((entry) => entry.platform.id === selectedPlatformId) ??
    allowedMarkets[0];
  const currencyOptions = selectedMarket.currencies;
  const currency =
    currencyOptions.find((entry) => entry.code === selectedCurrencyCode) ??
    currencyOptions[0];

  const validation = identifier.trim()
    ? selectedMarket.platform.validate(identifier.trim())
    : null;
  const isBaseNetwork = walletSession?.chainId === base.id;
  const amountValue = Number.parseFloat(amount);
  const canSubmit =
    Boolean(walletSession) &&
    isBaseNetwork &&
    amountValue >= 1 &&
    identifier.trim().length > 0 &&
    (validation?.valid ?? true) &&
    !isLoading;

  const visibleLevels = orderbookState.orderbook?.levels.slice(0, 5) ?? [];
  const activeDeposits = depositItems
    .filter((item) => item.status === "active")
    .sort((left, right) => Number(right.depositId) - Number(left.depositId));
  const maxLiquidity = Math.max(
    ...visibleLevels.map((level) => level.totalLiquidityUsd),
    1,
  );
  const routeLabel = `${selectedMarket.platform.name} / ${currency.code}`;

  // === Effects ===

  useEffect(() => {
    let isMounted = true;

    void restoreInjectedWallet()
      .then((session) => {
        if (!isMounted) return;
        setWalletSession(session);
      })
      .catch((sessionError) => {
        if (!isMounted) return;
        setWalletError(getErrorMessage(sessionError));
      });

    const provider = getInjectedProvider();
    if (!provider?.on) {
      return () => {
        isMounted = false;
      };
    }

    const syncWallet = async () => {
      try {
        const nextSession = await restoreInjectedWallet();
        if (!isMounted) return;
        startTransition(() => {
          setWalletSession(nextSession);
          setWalletError(null);
        });
      } catch (sessionError) {
        if (!isMounted) return;
        setWalletError(getErrorMessage(sessionError));
      }
    };

    const handleAccountsChanged = () => {
      void syncWallet();
    };
    const handleChainChanged = () => {
      void syncWallet();
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      isMounted = false;
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  useEffect(() => {
    if (!currencyOptions.some((entry) => entry.code === selectedCurrencyCode)) {
      setSelectedCurrencyCode(currencyOptions[0]?.code ?? CURRENCIES.USD.code);
    }
  }, [currencyOptions, selectedCurrencyCode]);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = getOrderbookCacheKey(selectedMarket.platform.id, currency.code);
    const cachedState = readOrderbookCache(cacheKey);

    if (cachedState) {
      setOrderbookState({
        orderbook: cachedState.orderbook,
        updatedAt: cachedState.updatedAt,
      });
    }

    setIsOrderbookLoading(!cachedState);
    setOrderbookError(null);

    void fetch(
      `/api/orderbook?currency=${encodeURIComponent(currency.code)}&platform=${encodeURIComponent(selectedMarket.platform.id)}`,
    )
      .then(async (response) => {
        const payload = (await response.json()) as OrderbookState | { error?: string };
        if (!response.ok) {
          throw new Error(
            "error" in payload && typeof payload.error === "string"
              ? payload.error
              : `Orderbook request failed (${response.status}).`,
          );
        }
        return payload as OrderbookState;
      })
      .then((response) => {
        if (!isMounted) return;
        startTransition(() => {
          setOrderbookState({
            orderbook: response.orderbook,
            updatedAt: response.updatedAt,
          });
        });
        writeOrderbookCache(cacheKey, {
          platformId: selectedMarket.platform.id,
          currencyCode: currency.code,
          orderbook: response.orderbook,
          updatedAt: response.updatedAt,
        });
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setOrderbookError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!isMounted) return;
        setIsOrderbookLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currency.code, selectedMarket.platform.id]);

  useEffect(() => {
    if (!walletSession?.address) {
      setDepositItems([]);
      setDepositsError(null);
      return;
    }

    let isMounted = true;
    setIsDepositsLoading(true);
    setDepositsError(null);

    void loadDeposits(walletSession.address)
      .then((items) => {
        if (!isMounted) return;
        startTransition(() => {
          setDepositItems(items);
        });
      })
      .catch((depositLoadError) => {
        if (!isMounted) return;
        setDepositsError(getErrorMessage(depositLoadError));
      })
      .finally(() => {
        if (!isMounted) return;
        setIsDepositsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [loadDeposits, walletSession?.address]);

  // === Handlers ===

  async function refreshDeposits() {
    if (!walletSession?.address) return;
    setIsDepositsLoading(true);
    setDepositsError(null);
    try {
      const items = await loadDeposits(walletSession.address);
      startTransition(() => {
        setDepositItems(items);
      });
    } catch (refreshError) {
      setDepositsError(getErrorMessage(refreshError));
    } finally {
      setIsDepositsLoading(false);
    }
  }

  async function handleWithdraw(item: DepositInfo) {
    if (!walletSession?.walletClient) return;
    setClosingDepositId(item.depositId);
    setCloseError(null);
    try {
      await closeDeposit(walletSession.walletClient, item.depositId, item.escrowAddress);
      await refreshDeposits();
    } catch (withdrawError) {
      setCloseError(getErrorMessage(withdrawError));
    } finally {
      setClosingDepositId(null);
    }
  }

  async function handleConnectWallet() {
    setIsConnecting(true);
    setWalletError(null);
    try {
      const session = await connectInjectedWallet();
      startTransition(() => {
        setWalletSession(session);
        reset();
      });
    } catch (connectionError) {
      setWalletError(getErrorMessage(connectionError));
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleSwitchToBase() {
    try {
      await switchToBaseNetwork();
      const nextSession = await restoreInjectedWallet();
      setWalletSession(nextSession);
      setWalletError(null);
    } catch (switchError) {
      setWalletError(getErrorMessage(switchError));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!walletSession?.walletClient) {
      setWalletError("Connect a wallet before creating a deposit.");
      return;
    }
    if (!isBaseNetwork) {
      setWalletError("Switch to Base before creating a deposit.");
      return;
    }
    const normalizedIdentifier = validation?.valid
      ? validation.normalized
      : identifier.trim();
    reset();
    try {
      await offramp(walletSession.walletClient, {
        amount,
        platform: selectedMarket.platform,
        currency,
        identifier: normalizedIdentifier,
      });
      await refreshDeposits();
    } catch {
      // Hook already exposes typed error state.
    }
  }

  function handleCopyPeerlyticsInstall() {
    void navigator.clipboard.writeText("npm install @peerlytics/sdk").then(() => {
      setCopiedPeerlyticsInstall(true);
      setTimeout(() => setCopiedPeerlyticsInstall(false), 1500);
    });
  }

  function handleCopyOfframpInstall() {
    void navigator.clipboard.writeText("npm install @usdctofiat/offramp").then(() => {
      setCopiedOfframpInstall(true);
      setTimeout(() => setCopiedOfframpInstall(false), 1500);
    });
  }

  function handleCopyPeerlyticsCode() {
    void navigator.clipboard.writeText(PEERLYTICS_SNIPPET).then(() => {
      setCopiedPeerlyticsCode(true);
      setTimeout(() => setCopiedPeerlyticsCode(false), 1500);
    });
  }

  function handleCopyOfframpCode() {
    void navigator.clipboard.writeText(USDCTOFIAT_SNIPPET).then(() => {
      setCopiedOfframpCode(true);
      setTimeout(() => setCopiedOfframpCode(false), 1500);
    });
  }

  return (
    <div className="page">
      <main className="app-shell">

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-brand">
            <span className="brand-mono">peerlytics & usdctofiat demo</span>
          </div>
          <div className="topbar-actions">
            {walletSession ? (
              <div className="wallet-badge">
                <span className="wallet-dot" />
                <span>{shortenAddress(walletSession.address)}</span>
                <span className={`chain-label${isBaseNetwork ? "" : " chain-wrong"}`}>
                  {isBaseNetwork ? "Base" : "Wrong network"}
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="button button-primary"
                onClick={handleConnectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect wallet"}
              </button>
            )}
          </div>
        </header>

        {/* ── Page header ── */}
        <div className="page-header">
          <h1>Build on Peer.</h1>
          <p className="page-subheading">
            Two production-ready SDKs for P2P FX markets on Base.
            Server-side orderbook analytics and wallet-native delegated off-ramps.
          </p>
          <div className="sdk-badges">
            <a
              href="https://www.npmjs.com/package/@peerlytics/sdk"
              target="_blank"
              rel="noreferrer"
              className="sdk-badge sdk-badge-peerlytics"
            >
              @peerlytics/sdk
            </a>
            <a
              href="https://www.npmjs.com/package/@usdctofiat/offramp"
              target="_blank"
              rel="noreferrer"
              className="sdk-badge sdk-badge-offramp"
            >
              @usdctofiat/offramp
            </a>
          </div>
        </div>

        {/* ── SDK Strip 1: USDCtoFiat ── */}
        <section className="sdk-strip sdk-strip-offramp">
          <div className="strip-left">
            <div className="strip-meta">
              <span className="sdk-pill badge-offramp">@usdctofiat/offramp</span>
              <a
                href="https://www.npmjs.com/package/@usdctofiat/offramp"
                target="_blank"
                rel="noreferrer"
                className="sdk-docs-link"
              >
                npm ↗
              </a>
            </div>

            <h3 className="strip-name">USDCtoFiat</h3>
            <p className="strip-desc">
              Delegated off-ramp for Base. Sell USDC to fiat via Revolut and
              Venmo with a single React hook — resumable, idempotent, and
              battle-tested.
            </p>

            <ul className="strip-features">
              <li>Revolut (GBP, USD, EUR) and Venmo (USD)</li>
              <li>Resumable multi-step deposit flows</li>
              <li>React hook: approve, register, deposit, delegate</li>
            </ul>

            <button
              type="button"
              className="install-cmd install-cmd-offramp"
              onClick={handleCopyOfframpInstall}
            >
              <span className="install-prompt install-prompt-offramp">$</span>
              <span>npm install @usdctofiat/offramp</span>
              <span className="install-copy">
                {copiedOfframpInstall ? "✓ copied" : "copy"}
              </span>
            </button>

            <div className="code-block strip-code">
              <button
                type="button"
                className="code-copy-btn"
                onClick={handleCopyOfframpCode}
              >
                {copiedOfframpCode ? "✓" : "copy"}
              </button>
              <pre>{USDCTOFIAT_SNIPPET}</pre>
            </div>
          </div>

          <div className="strip-demo">
            <article className="card">
              <div className="section-head">
                <div>
                  <h2>Create deposit</h2>
                </div>
                {!isBaseNetwork && walletSession && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={handleSwitchToBase}
                  >
                    Switch to Base
                  </button>
                )}
              </div>

              <form className="form-grid" onSubmit={handleSubmit}>
                <label className="field">
                  <span>Amount (USDC)</span>
                  <input
                    type="number"
                    min="1"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="100"
                  />
                </label>

                <label className="field">
                  <span>Platform</span>
                  <select
                    value={selectedMarket.platform.id}
                    onChange={(event) => {
                      setSelectedPlatformId(event.target.value as AllowedPlatformId);
                      setIdentifier("");
                    }}
                  >
                    {allowedMarkets.map((entry) => (
                      <option key={entry.platform.id} value={entry.platform.id}>
                        {entry.platform.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Currency</span>
                  <select
                    value={currency.code}
                    onChange={(event) => setSelectedCurrencyCode(event.target.value)}
                  >
                    {currencyOptions.map((entry) => (
                      <option key={entry.code} value={entry.code}>
                        {entry.code}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field-wide">
                  <span>{selectedMarket.platform.identifier.label}</span>
                  <input
                    type="text"
                    value={identifier}
                    placeholder={selectedMarket.platform.identifier.placeholder}
                    onChange={(event) => setIdentifier(event.target.value)}
                  />
                  <small>{selectedMarket.platform.identifier.help}</small>
                </label>

                {validation && !validation.valid && (
                  <div className="field-error">{validation.error}</div>
                )}

                <div className="submit-row">
                  <div className="route-note">
                    Route: <strong>{routeLabel}</strong>
                  </div>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={!canSubmit}
                  >
                    {isLoading ? "Creating..." : "Create deposit"}
                  </button>
                </div>
              </form>

              {walletError && <InlineMessage tone="error">{walletError}</InlineMessage>}

              {step && step !== "done" && (
                <div className="step-rail">
                  {flowSteps.map((item, index) => {
                    const activeIndex = flowSteps.findIndex((s) => s.id === step);
                    const isComplete = activeIndex > index;
                    const isActive = step === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`step-item${isActive ? " active" : ""}${isComplete ? " complete" : ""}`}
                      >
                        <span className="step-dot" />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === "done" && depositId && txHash && (
                <InlineMessage tone="success">
                  Deposit #{depositId} created.{" "}
                  <a
                    href={`https://peerlytics.xyz/explorer/deposit/${depositId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Peerlytics →
                  </a>
                </InlineMessage>
              )}

              {error && (
                <InlineMessage tone="error">
                  {error.code}: {error.message}
                </InlineMessage>
              )}
            </article>
          </div>
        </section>

        {/* ── SDK Strip 2: Peerlytics ── */}
        <section className="sdk-strip sdk-strip-peerlytics">
          <div className="strip-left">
            <div className="strip-meta">
              <span className="sdk-pill badge-peerlytics">@peerlytics/sdk</span>
              <a
                href="https://www.npmjs.com/package/@peerlytics/sdk"
                target="_blank"
                rel="noreferrer"
                className="sdk-docs-link"
              >
                npm ↗
              </a>
            </div>

            <h3 className="strip-name">Peerlytics</h3>
            <p className="strip-desc">
              Real-time analytics for the ZKP2P protocol. Query live orderbook
              data, activity feeds, and maker stats from your server with a single
              API key.
            </p>

            <ul className="strip-features">
              <li>Live orderbook with rate levels and depth</li>
              <li>Activity feed with typed event filtering</li>
              <li>Maker portfolio and volume analytics</li>
            </ul>

            <button
              type="button"
              className="install-cmd"
              onClick={handleCopyPeerlyticsInstall}
            >
              <span className="install-prompt">$</span>
              <span>npm install @peerlytics/sdk</span>
              <span className="install-copy">
                {copiedPeerlyticsInstall ? "✓ copied" : "copy"}
              </span>
            </button>

            <div className="code-block strip-code">
              <button
                type="button"
                className="code-copy-btn"
                onClick={handleCopyPeerlyticsCode}
              >
                {copiedPeerlyticsCode ? "✓" : "copy"}
              </button>
              <pre>{PEERLYTICS_SNIPPET}</pre>
            </div>
          </div>

          <div className="strip-demo">
            <aside className="card">
              <div className="section-head">
                <h2>
                  {routeLabel}
                  {isOrderbookLoading && <span className="loading-dot" />}
                </h2>
                <div className="route-controls">
                  <select
                    className="route-select"
                    value={selectedMarket.platform.id}
                    onChange={(event) => {
                      setSelectedPlatformId(event.target.value as AllowedPlatformId);
                      setIdentifier("");
                    }}
                  >
                    {allowedMarkets.map((entry) => (
                      <option key={entry.platform.id} value={entry.platform.id}>
                        {entry.platform.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="route-select"
                    value={currency.code}
                    onChange={(event) => setSelectedCurrencyCode(event.target.value)}
                  >
                    {currencyOptions.map((entry) => (
                      <option key={entry.code} value={entry.code}>
                        {entry.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {orderbookError && (
                <InlineMessage tone="error">{orderbookError}</InlineMessage>
              )}

              <div className="book-summary">
                <ValueTile
                  label="Best rate"
                  value={isOrderbookLoading ? "..." : formatRate(orderbookState.orderbook?.bestRate, currency.code)}
                  accent={!isOrderbookLoading && Boolean(orderbookState.orderbook?.bestRate)}
                />
                <ValueTile
                  label="Liquidity"
                  value={formatUsd(orderbookState.orderbook?.totalLiquidityUsd)}
                />
                <ValueTile
                  label="Updated"
                  value={
                    orderbookState.updatedAt
                      ? formatRelativeTime(orderbookState.updatedAt)
                      : "--"
                  }
                />
              </div>

              {visibleLevels.length > 0 ? (
                <div className="book-table">
                  <div className="book-header">
                    <span>Rate</span>
                    <span>Liquidity</span>
                    <span>Deposits</span>
                  </div>
                  {visibleLevels.map((level) => (
                    <div
                      key={`${level.rate}-${level.topDeposit.depositId}`}
                      className="book-row"
                    >
                      <div className="book-cell book-rate">
                        <strong>{formatRate(level.rate, currency.code)}</strong>
                      </div>
                      <div className="book-cell">
                        <span>{formatUsd(level.totalLiquidityUsd)}</span>
                        <div className="book-bar">
                          <span
                            style={{
                              width: `${(level.totalLiquidityUsd / maxLiquidity) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="book-cell book-count">
                        {formatNumber(level.depositCount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>
                    {isOrderbookLoading
                      ? "Loading orderbook..."
                      : "No visible levels for this route right now."}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* ── Active deposits ── */}
        <section className="card deposits-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                <span className="powered-by">@usdctofiat/offramp</span>
              </p>
              <h2>Active deposits</h2>
            </div>
            {walletSession && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  void refreshDeposits();
                }}
                disabled={isDepositsLoading}
              >
                {isDepositsLoading ? "Refreshing..." : "Refresh"}
              </button>
            )}
          </div>

          {!walletSession && (
            <div className="empty-state">
              <p>Connect a wallet to view your active deposits.</p>
            </div>
          )}

          {walletSession && depositsError && (
            <InlineMessage tone="error">{depositsError}</InlineMessage>
          )}

          {walletSession && closeError && (
            <InlineMessage tone="error">{closeError}</InlineMessage>
          )}

          {walletSession &&
            !depositsError &&
            activeDeposits.length === 0 &&
            !isDepositsLoading && (
              <div className="empty-state">
                <p>No active deposits found for this wallet.</p>
              </div>
            )}

          <div className="deposit-list">
            {activeDeposits.map((item) => (
              <article key={item.compositeId} className="deposit-row">
                <div className="deposit-meta">
                  <div>
                    <strong>#{item.depositId}</strong>
                    <span>
                      {item.paymentMethods.join(", ")} · {item.currencies.join(", ")}
                    </span>
                  </div>
                  <div className="deposit-flags">
                    <span
                      className={`status ${
                        item.delegated ? "status-delegated" : "status-manual"
                      }`}
                    >
                      {item.delegated ? "delegated" : "manual"}
                    </span>
                    <button
                      type="button"
                      className="button button-withdraw"
                      onClick={() => {
                        void handleWithdraw(item);
                      }}
                      disabled={closingDepositId === item.depositId || item.remainingUsdc === 0}
                    >
                      {closingDepositId === item.depositId ? "Withdrawing..." : "Withdraw"}
                    </button>
                  </div>
                </div>
                <div className="deposit-values">
                  <ValueTile
                    label="Remaining"
                    value={`${formatNumber(item.remainingUsdc)} USDC`}
                  />
                  <ValueTile
                    label="Outstanding"
                    value={`${formatNumber(item.outstandingUsdc)} USDC`}
                  />
                  <ValueTile
                    label="Fulfilled"
                    value={formatNumber(item.fulfilledIntents)}
                  />
                  <ValueTile
                    label="Taken"
                    value={`${formatNumber(item.totalTakenUsdc)} USDC`}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="site-foot">
          <p className="footer-copy">
            Built with the{" "}
            <a
              href="https://www.npmjs.com/package/@usdctofiat/offramp"
              target="_blank"
              rel="noreferrer"
            >
              offramp sdk
            </a>
            , the{" "}
            <a
              href="https://www.npmjs.com/package/@peerlytics/sdk"
              target="_blank"
              rel="noreferrer"
            >
              peerlytics sdk
            </a>
            , and the{" "}
            <a
              href="https://github.com/ADWilkinson/usdctofiat-peerlytics-starters"
              target="_blank"
              rel="noreferrer"
            >
              starter repo
            </a>
            . More from{" "}
            <a href="https://x.com/davyjones0x" target="_blank" rel="noreferrer">
              @davyjones0x
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}

// === Sub-components ===

function InlineMessage({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "error" | "success";
}) {
  return <div className={`inline-message ${tone}`}>{children}</div>;
}

function ValueTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="value-tile">
      <span>{label}</span>
      <strong className={accent ? "accent-value" : ""}>{value}</strong>
    </div>
  );
}

// === Helpers ===

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something unexpected happened.";
}

function getOrderbookCacheKey(
  platformId: AllowedPlatformId,
  currencyCode: string,
): string {
  return `peerlytics-orderbook:${platformId}:${currencyCode}`;
}

function readOrderbookCache(cacheKey: string): CachedOrderbookState | null {
  if (typeof window === "undefined") return null;
  const rawValue = window.sessionStorage.getItem(cacheKey);
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue) as CachedOrderbookState;
  } catch {
    window.sessionStorage.removeItem(cacheKey);
    return null;
  }
}

function writeOrderbookCache(
  cacheKey: string,
  value: CachedOrderbookState,
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(cacheKey, JSON.stringify(value));
}
