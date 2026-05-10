export const VOCA_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_balance",
      description:
        "Get the SOL balance and all SPL token balances for the connected wallet, with USD values. Call this early when the user wants to send, swap, or move funds so you know what they can spend and can choose SOL vs USDC intelligently.",
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
        "Swap one token for another on Solana via Jupiter. Keep swap intent across turns: if the user fills in from/to/amount across multiple messages, merge them. Use confirmed:false to quote first, then confirmed:true only after explicit approval.",
      parameters: {
        type: "object",
        properties: {
          from_token: { type: "string" },
          to_token: { type: "string" },
          amount: { type: "number", description: "Amount of from_token in human units" },
          confirmed: {
            type: "boolean",
            description: "Set true ONLY after the user explicitly says yes. False to just quote.",
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
      description:
        "Send SOL or an SPL token to a Solana address. Use confirmed:false first to quote, then confirmed:true only after explicit user approval. The recipient may appear in a LATER user message as only a base58 string — combine it with token_symbol and amount from earlier turns in this conversation. If the user gave a dollar amount without naming a token, default token_symbol to USDC unless they said SOL.",
      parameters: {
        type: "object",
        properties: {
          token_symbol: {
            type: "string",
            description: "SOL, USDC, etc. Default USDC for dollar amounts unless user said SOL.",
          },
          amount: { type: "number", description: "Human amount (e.g. SOL count, or USDC units)" },
          recipient: {
            type: "string",
            description:
              "Full Solana base58 pubkey; may have been sent alone in the latest user message while send was already in progress.",
          },
          confirmed: {
            type: "boolean",
            description: "false to quote / confirm only; true only after user clearly approves.",
          },
        },
        required: ["token_symbol", "amount", "recipient", "confirmed"],
      },
    },
  },
] as const;

export type ToolName = "get_balance" | "get_token_price" | "swap_tokens" | "send_token";
