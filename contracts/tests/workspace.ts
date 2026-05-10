import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Workspace } from "../target/types/workspace";
import { expect } from "chai";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("VOCA Agent Program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.workspace as Program<Workspace>;

  const authority = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const treasury = Keypair.generate();

  let configPDA: PublicKey;
  let agent1PDA: PublicKey;
  let agent2PDA: PublicKey;

  const agentNonce1 = new BN(1);
  const agentNonce2 = new BN(2);

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(authority.publicKey, 100 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user1.publicKey, 100 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user2.publicKey, 100 * LAMPORTS_PER_SOL)
    );

    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), authority.publicKey.toBuffer()],
      program.programId
    );

    [agent1PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), user1.publicKey.toBuffer(), agentNonce1.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [agent2PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), user2.publicKey.toBuffer(), agentNonce2.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
  });

  it("Initialize Config", async () => {
    await program.methods
      .initializeConfig(250, treasury.publicKey, 5)
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.isActive).to.be.true;
    expect(config.isPaused).to.be.false;
    expect(config.feeBps).to.equal(250);
    expect(config.treasury.toBase58()).to.equal(treasury.publicKey.toBase58());
    expect(config.maxAgentsPerUser).to.equal(5);
    expect(Number(config.totalAgents.toString())).to.equal(0);
    expect(Number(config.totalInteractions.toString())).to.equal(0);
    expect(config.version).to.equal(1);
  });

  it("Register Agent for User1", async () => {
    const personalityHash = Buffer.alloc(32, 1);
    const spendingLimit = new BN(5 * LAMPORTS_PER_SOL);
    const dailyLimit = new BN(20 * LAMPORTS_PER_SOL);

    await program.methods
      .registerAgent(
        agentNonce1,
        "VOCA-Alpha",
        Array.from(personalityHash),
        spendingLimit,
        dailyLimit
      )
      .accounts({
        config: configPDA,
        agent: agent1PDA,
        owner: user1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    const agent = await program.account.agent.fetch(agent1PDA);
    expect(agent.owner.toBase58()).to.equal(user1.publicKey.toBase58());
    expect(agent.name).to.equal("VOCA-Alpha");
    expect(agent.isActive).to.be.true;
    expect(Number(agent.spendingLimit.toString())).to.equal(5 * LAMPORTS_PER_SOL);
    expect(Number(agent.dailyLimit.toString())).to.equal(20 * LAMPORTS_PER_SOL);
    expect(Number(agent.totalTransactions.toString())).to.equal(0);
    expect(Number(agent.totalVolume.toString())).to.equal(0);

    const config = await program.account.config.fetch(configPDA);
    expect(Number(config.totalAgents.toString())).to.equal(1);
  });

  it("Register Agent for User2", async () => {
    const personalityHash = Buffer.alloc(32, 2);
    const spendingLimit = new BN(10 * LAMPORTS_PER_SOL);
    const dailyLimit = new BN(50 * LAMPORTS_PER_SOL);

    await program.methods
      .registerAgent(
        agentNonce2,
        "VOCA-Beta",
        Array.from(personalityHash),
        spendingLimit,
        dailyLimit
      )
      .accounts({
        config: configPDA,
        agent: agent2PDA,
        owner: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    const agent = await program.account.agent.fetch(agent2PDA);
    expect(agent.owner.toBase58()).to.equal(user2.publicKey.toBase58());
    expect(agent.name).to.equal("VOCA-Beta");
    expect(agent.isActive).to.be.true;

    const config = await program.account.config.fetch(configPDA);
    expect(Number(config.totalAgents.toString())).to.equal(2);
  });

  it("Log Interaction - Balance Check (action_type=0)", async () => {
    const interactionNonce = new BN(1);
    const descHash = Buffer.alloc(32, 10);

    const [interactionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("interaction"), agent1PDA.toBuffer(), interactionNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .logInteraction(interactionNonce, 0, new BN(0), Array.from(descHash))
      .accounts({
        config: configPDA,
        agent: agent1PDA,
        interaction: interactionPDA,
        owner: user1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    const interaction = await program.account.interaction.fetch(interactionPDA);
    expect(interaction.actionType).to.equal(0);
    expect(interaction.success).to.be.true;
    expect(Number(interaction.amount.toString())).to.equal(0);

    const agent = await program.account.agent.fetch(agent1PDA);
    expect(Number(agent.totalTransactions.toString())).to.equal(1);
  });

  it("Log Interaction - Swap (action_type=1) with spending limit", async () => {
    const interactionNonce = new BN(2);
    const descHash = Buffer.alloc(32, 11);
    const swapAmount = new BN(3 * LAMPORTS_PER_SOL);

    const [interactionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("interaction"), agent1PDA.toBuffer(), interactionNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .logInteraction(interactionNonce, 1, swapAmount, Array.from(descHash))
      .accounts({
        config: configPDA,
        agent: agent1PDA,
        interaction: interactionPDA,
        owner: user1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    const interaction = await program.account.interaction.fetch(interactionPDA);
    expect(interaction.actionType).to.equal(1);
    expect(Number(interaction.amount.toString())).to.equal(3 * LAMPORTS_PER_SOL);

    const agent = await program.account.agent.fetch(agent1PDA);
    expect(Number(agent.totalTransactions.toString())).to.equal(2);
    expect(Number(agent.dailySpent.toString())).to.equal(3 * LAMPORTS_PER_SOL);
  });

  it("Log Interaction - Transfer (action_type=2)", async () => {
    const interactionNonce = new BN(3);
    const descHash = Buffer.alloc(32, 12);
    const transferAmount = new BN(2 * LAMPORTS_PER_SOL);

    const [interactionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("interaction"), agent1PDA.toBuffer(), interactionNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .logInteraction(interactionNonce, 2, transferAmount, Array.from(descHash))
      .accounts({
        config: configPDA,
        agent: agent1PDA,
        interaction: interactionPDA,
        owner: user1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    const agent = await program.account.agent.fetch(agent1PDA);
    expect(Number(agent.totalTransactions.toString())).to.equal(3);
    expect(Number(agent.dailySpent.toString())).to.equal(5 * LAMPORTS_PER_SOL);
  });

  it("Fails when exceeding per-transaction spending limit", async () => {
    const interactionNonce = new BN(4);
    const descHash = Buffer.alloc(32, 13);
    const bigAmount = new BN(6 * LAMPORTS_PER_SOL);

    const [interactionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("interaction"), agent1PDA.toBuffer(), interactionNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    try {
      await program.methods
        .logInteraction(interactionNonce, 1, bigAmount, Array.from(descHash))
        .accounts({
          config: configPDA,
          agent: agent1PDA,
          interaction: interactionPDA,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).to.include("SpendingLimitExceeded");
    }
  });

  it("Fails when exceeding daily spending limit", async () => {
    const interactionNonce = new BN(5);
    const descHash = Buffer.alloc(32, 14);
    const dailyExceedAmount = new BN(16 * LAMPORTS_PER_SOL);

    const [interactionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("interaction"), agent1PDA.toBuffer(), interactionNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    try {
      await program.methods
        .logInteraction(interactionNonce, 1, dailyExceedAmount, Array.from(descHash))
        .accounts({
          config: configPDA,
          agent: agent1PDA,
          interaction: interactionPDA,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).to.include("DailyLimitExceeded");
    }
  });

  it("Update Agent settings", async () => {
    const newPersonality = Buffer.alloc(32, 99);

    await program.methods
      .updateAgent(
        "VOCA-Alpha-V2",
        Array.from(newPersonality),
        new BN(8 * LAMPORTS_PER_SOL),
        new BN(40 * LAMPORTS_PER_SOL)
      )
      .accounts({
        agent: agent1PDA,
        owner: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    const agent = await program.account.agent.fetch(agent1PDA);
    expect(agent.name).to.equal("VOCA-Alpha-V2");
    expect(Number(agent.spendingLimit.toString())).to.equal(8 * LAMPORTS_PER_SOL);
    expect(Number(agent.dailyLimit.toString())).to.equal(40 * LAMPORTS_PER_SOL);
  });

  it("Deactivate Agent", async () => {
    await program.methods
      .deactivateAgent()
      .accounts({
        agent: agent2PDA,
        owner: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    const agent = await program.account.agent.fetch(agent2PDA);
    expect(agent.isActive).to.be.false;
  });

  it("Fails to log interaction on deactivated agent", async () => {
    const interactionNonce = new BN(1);
    const descHash = Buffer.alloc(32, 20);

    const [interactionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("interaction"), agent2PDA.toBuffer(), interactionNonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    try {
      await program.methods
        .logInteraction(interactionNonce, 0, new BN(0), Array.from(descHash))
        .accounts({
          config: configPDA,
          agent: agent2PDA,
          interaction: interactionPDA,
          owner: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).to.include("InactiveAccount");
    }
  });

  it("Reactivate Agent", async () => {
    await program.methods
      .reactivateAgent()
      .accounts({
        config: configPDA,
        agent: agent2PDA,
        owner: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    const agent = await program.account.agent.fetch(agent2PDA);
    expect(agent.isActive).to.be.true;
  });

  it("Update Config", async () => {
    await program.methods
      .updateConfig(500, treasury.publicKey, 8, false)
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.feeBps).to.equal(500);
    expect(config.maxAgentsPerUser).to.equal(8);
    expect(config.isPaused).to.be.false;
  });

  it("Fails unauthorized update config", async () => {
    try {
      await program.methods
        .updateConfig(100, treasury.publicKey, 3, false)
        .accounts({
          config: configPDA,
          authority: user1.publicKey,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).to.include("Error");
    }
  });

  it("Pause config blocks new agent registration", async () => {
    await program.methods
      .updateConfig(500, treasury.publicKey, 8, true)
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    const nonce = new BN(99);
    const [pauseAgentPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), user1.publicKey.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    try {
      await program.methods
        .registerAgent(nonce, "PausedAgent", Array.from(Buffer.alloc(32, 0)), new BN(LAMPORTS_PER_SOL), new BN(5 * LAMPORTS_PER_SOL))
        .accounts({
          config: configPDA,
          agent: pauseAgentPDA,
          owner: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).to.include("ConfigInactive");
    }

    await program.methods
      .updateConfig(500, treasury.publicKey, 8, false)
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();
  });

  it("Config tracks total interactions correctly", async () => {
    const config = await program.account.config.fetch(configPDA);
    expect(Number(config.totalInteractions.toString())).to.equal(3);
    expect(Number(config.totalAgents.toString())).to.equal(2);
  });
});
