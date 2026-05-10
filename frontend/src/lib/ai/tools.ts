export const VOCA_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_balance",
      description:
        "Get the SOL balance and all SPL token balances for the connected wallet, with USD values.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_token_price",
      description: "Get the current USD price for a token symbol like SOL, USDC, JUP, BONK.",
      parameters: {
        type: "object",
        properties: {
          token_symbol: { type: "string", description: "Token symbol e.g. SOL" },
        },
        required: ["token_symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "swap_tokens",
      description:
        "Swap one token for another on Solana via Jupiter. ALWAYS confirm with the user first.",
      parameters: {
        type: "object",
        properties: {
          from_token: { type: "string" },
          to_token: { type: "string" },
          amount: { type: "number", description: "Amount of from_token in human units" },
          confirmed: {
            type: "boolean",
            description:
              "Set true ONLY after the user explicitly says yes. False to just quote.",
          },
        },
        required: ["from_token", "to_token", "amount", "confirmed"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_token",
      description: "Send SOL or an SPL token to a Solana address. ALWAYS confirm first.",
      parameters: {
        type: "object",
        properties: {
          token_symbol: { type: "string" },
          amount: { type: "number" },
          recipient: { type: "string", description: "Solana base58 address" },
          confirmed: { type: "boolean" },
        },
        required: ["token_symbol", "amount", "recipient", "confirmed"],
      },
    },
  },
] as const;

export type ToolName =
  | "get_balance"
  | "get_token_price"
  | "swap_tokens"
  | "send_token";
