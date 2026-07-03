import type { Metadata } from "next";
import { MiniAppCashout } from "./mini-app-cashout";

export const metadata: Metadata = {
  title: "Cash out Base USDC",
  description: "Sell Base USDC into payment apps through USDCtoFiat.",
  openGraph: {
    title: "Cash out Base USDC",
    description: "Sell Base USDC into payment apps through USDCtoFiat.",
  },
};

export default function Page() {
  return <MiniAppCashout />;
}
