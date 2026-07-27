import {
  createWalletClient,
  custom,
  getAddress,
  type Address,
  type WalletClient,
} from "viem";
import { base } from "viem/chains";

type RequestArguments = {
  method: string;
  params?: unknown[] | object;
};

type ProviderListener = (...args: unknown[]) => void;

export interface InjectedProvider {
  request(args: RequestArguments): Promise<unknown>;
  on?(event: string, listener: ProviderListener): void;
  removeListener?(event: string, listener: ProviderListener): void;
}

export interface WalletSession {
  address: Address;
  chainId: number;
  walletClient: WalletClient;
}

const BASE_CHAIN_ID_HEX = `0x${base.id.toString(16)}`;

function requireInjectedProvider(): InjectedProvider {
  const provider = getInjectedProvider();

  if (!provider) {
    throw new Error(
      "No injected wallet found. Install Rabby, MetaMask, or Coinbase Wallet to test the starter.",
    );
  }

  return provider;
}

function createSession(
  account: string,
  chainId: number,
  provider: InjectedProvider,
): WalletSession {
  const address = getAddress(account as Address);

  return {
    address,
    chainId,
    walletClient: createWalletClient({
      account: address,
      chain: base,
      transport: custom(provider),
    }),
  };
}

async function getCurrentChainId(provider: InjectedProvider): Promise<number> {
  const chainId = (await provider.request({
    method: "eth_chainId",
  })) as string;

  return Number.parseInt(chainId, 16);
}

export function getInjectedProvider(): InjectedProvider | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.ethereum;
}

export async function switchToBaseNetwork(): Promise<void> {
  const provider = requireInjectedProvider();

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID_HEX }],
    });
  } catch (error) {
    const switchError = error as { code?: number };

    if (switchError.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BASE_CHAIN_ID_HEX,
            chainName: base.name,
            nativeCurrency: base.nativeCurrency,
            rpcUrls: [...base.rpcUrls.default.http],
            blockExplorerUrls: [base.blockExplorers?.default.url],
          },
        ],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
      return;
    }

    if (switchError.code === 4001) {
      throw new Error("Base is required for the delegated offramp flow.");
    }

    throw error;
  }
}

export async function connectInjectedWallet(): Promise<WalletSession> {
  const provider = requireInjectedProvider();
  await switchToBaseNetwork();

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (accounts.length === 0) {
    throw new Error("No wallet account was returned by the provider.");
  }

  const chainId = await getCurrentChainId(provider);
  return createSession(accounts[0], chainId, provider);
}

export async function restoreInjectedWallet(): Promise<WalletSession | null> {
  const provider = getInjectedProvider();

  if (!provider) {
    return null;
  }

  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];

  if (accounts.length === 0) {
    return null;
  }

  const chainId = await getCurrentChainId(provider);
  return createSession(accounts[0], chainId, provider);
}

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}
