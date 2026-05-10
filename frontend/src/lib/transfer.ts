import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { lookupToken } from "./tokens";

export async function buildAndSendTransfer(
  connection: Connection,
  payer: PublicKey,
  signTx: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  tokenSymbol: string,
  amount: number,
  recipient: string,
): Promise<string> {
  const to = new PublicKey(recipient);
  const t = lookupToken(tokenSymbol);
  if (!t) throw new Error(`Unknown token ${tokenSymbol}`);

  const instructions = [];
  if (tokenSymbol.toUpperCase() === "SOL") {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: to,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      }),
    );
  } else {
    const mint = new PublicKey(t.mint);
    const fromAta = await getAssociatedTokenAddress(mint, payer);
    const toAta = await getAssociatedTokenAddress(mint, to);
    try {
      await getAccount(connection, toAta);
    } catch {
      instructions.push(createAssociatedTokenAccountInstruction(payer, toAta, to, mint));
    }
    instructions.push(
      createTransferInstruction(
        fromAta,
        toAta,
        payer,
        BigInt(Math.floor(amount * Math.pow(10, t.decimals))),
      ),
    );
  }

  const blockhash = await connection.getLatestBlockhash();
  const msg = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash.blockhash,
    instructions,
  }).compileToV0Message();
  const tx = new VersionedTransaction(msg);
  const signed = await signTx(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(
    {
      signature: sig,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    },
    "confirmed",
  );
  return sig;
}
