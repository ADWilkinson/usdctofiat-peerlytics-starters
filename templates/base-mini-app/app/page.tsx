import type { Metadata } from "next";
import { MiniAppCashout } from "./mini-app-cashout";

export const metadata: Metadata = {
  title: "Cash out Base USDC",
  description: "A compact USDCtoFiat mini app starter for Base.",
  openGraph: {
    title: "Cash out Base USDC",
    description: "Sell Base USDC into payment apps through USDCtoFiat.",
  },
};

export default function Page() {
  return <MiniAppCashout />;
}
