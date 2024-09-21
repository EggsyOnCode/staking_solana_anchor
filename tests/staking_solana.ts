import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakingSolana } from "../target/types/staking_solana";
import { assert } from "chai";
import * as fs from "fs";
import {
  approve,
  createMint,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getExtraAccountMetas,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  transfer,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

describe("staking_solana", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  // const connection = new Connection("http://localhost:8899", {
  //   commitment: "confirmed",
  // });
  const connection = anchor.getProvider().connection;
  const payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
  const mintKeyPair = Keypair.fromSecretKey(
    new Uint8Array([
      63, 128, 204, 71, 9, 78, 69, 159, 59, 58, 208, 164, 77, 61, 208, 72, 106,
      168, 146, 9, 132, 2, 40, 151, 3, 159, 201, 160, 230, 176, 253, 170, 120,
      210, 49, 141, 25, 104, 139, 32, 10, 101, 165, 143, 72, 194, 140, 215, 69,
      152, 103, 169, 95, 153, 21, 238, 147, 45, 203, 235, 253, 26, 203, 6,
    ])
  );
  let mint: anchor.web3.PublicKey;

  async function createMintToken(connection: any, mintKeyPair?: Keypair) {
    const mint = await createMint(
      connection,
      payer.payer,
      payer.publicKey,
      payer.publicKey,
      9,
      mintKeyPair
    );

    console.log(mint);

    return mint;
  }

  async function getTokenBalance(
    connection,
    mint: anchor.web3.PublicKey,
    user: anchor.web3.PublicKey
  ): Promise<string> {
    // Derive the associated token account address for the user and the mint
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mint, // The token mint
      user // The user's wallet address
    );

    console.log("Associated Token Account:", associatedTokenAccount.toBase58());

    // Fetch the account info from the blockchain
    const tokenAccountInfo = await getAccount(
      connection,
      associatedTokenAccount
    );

    // The token balance is stored in the 'amount' property of the account info
    const tokenBalance = tokenAccountInfo.amount;

    console.log("Token Balance:", tokenBalance.toString());

    return tokenBalance.toString();
  }

  const program = anchor.workspace.StakingSolana as Program<StakingSolana>;

  it("initializes successfully!", async () => {
    mint = await createMintToken(connection, mintKeyPair);

    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    const tx = await program.methods
      .initialize()
      .accountsPartial({
        tokenVaultAccount: vault,
        signer: payer.publicKey,
        mint: mint,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("can transfer SPL tokens ", async () => {
    const mPair = Keypair.generate();
    const mint2 = await createMint(
      connection,
      payer.payer,
      mPair.publicKey, // mint authority
      mPair.publicKey, // freeze authority
      9 // decimals
    );

    const user1 = Keypair.generate();
    const user2 = Keypair.generate();

    console.log("user 1 is ", user1.publicKey);
    console.log("user 2 is ", user2.publicKey);

    const u1ATA = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mint2, // Mint public key
      user1.publicKey // user1's public key
    );

    const u2ATA = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mint2,
      user2.publicKey
    );

    console.log("user 1 ata is ", u1ATA.address);
    console.log("user 2 ata is ", u2ATA.address);

    // Mint tokens to user1's ATA
    await mintTo(
      connection,
      payer.payer,
      mint2, // mint public key
      u1ATA.address, // user1's ATA
      mPair.publicKey, // mint authority
      1e11, // amount in atomic units (100 tokens)
      [mPair]
    );

    // Verify balances
    const bU1 = (await getAccount(connection, u1ATA.address)).amount;
    console.log("Balance of user1's ATA is", bU1);

    await transfer(
      connection,
      payer.payer,
      u1ATA.address,
      u2ATA.address,
      user1.publicKey,
      1e9,
      [user1]
    );

    // Verify balance of user2's ATA after the transfer
    const bU2 = (await getAccount(connection, u2ATA.address)).amount;
    console.log("Balance of user2's ATA is", bU2);

    assert.equal(BigInt(1e9), bU2, "User2 should have 1 token");
  });

  // it("stake", async () => {
  //   // Create user account
  //   const local_connection = new Connection("http://localhost:8899", {
  //     commitment: "confirmed",
  //   });

  //   console.log("mint is:", mint);

  //   const user_addr = Keypair.generate();

  //   // creating ATA to the user (user is the owner of token account)
  //   const user = await getOrCreateAssociatedTokenAccount(
  //     local_connection,
  //     payer.payer,
  //     mint,
  //     payer.publicKey // Correct owner of token account is the user
  //   );

  //   console.log("user token account is ", user.address);

  //   // Mint some tokens to the user (e.g., 100 tokens)
  //   await mintTo(
  //     local_connection,
  //     payer.payer,
  //     mint,
  //     user.address, // Correct user token account
  //     payer.publicKey, // payer is the owner of the mint
  //     1e11 // This mints 100 tokens (1e11 atomic units with 9 decimals)
  //   );

  //   // Get the user's initial token balance before staking
  //   const initialUserBalance = await getTokenBalance(
  //     local_connection,
  //     mint,
  //     payer.publicKey // Use the correct user token account
  //   );
  //   console.log("Initial User Token Balance:", initialUserBalance);

  //   // Get the stake info account for the program
  //   const [stake_info] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("stake_info_account"), payer.publicKey.toBuffer()],
  //     program.programId
  //   );

  //   // Get the user_stake PDA (program-derived address)
  //   const [stake_account] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("token_seed"), payer.publicKey.toBuffer()], // Ensure the correct user address is used for PDA derivation
  //     program.programId
  //   );

  //   // Create an associated token account for the user_stake PDA (program owns the stake account)
  //   const stake_acc_ata = await getOrCreateAssociatedTokenAccount(
  //     local_connection,
  //     payer.payer,
  //     mint,
  //     stake_account, // Stake account owned by the program's PDA
  //     true // This ensures it creates the ATA for the program's PDA
  //   );
  //   console.log("stake ATA is ", stake_acc_ata.address);
  //   console.log("user token account is ", user.address);

  //   // Staking 1 token (1e9 in atomic units, considering 9 decimals)
  //   const amountToStake = new anchor.BN(1); // This represents 1 token

  //   // Execute the staking transaction
  //   const tx = await program.methods
  //     .stake(amountToStake) // Assuming 1 token is being staked
  //     .signers([payer.payer])
  //     .accountsPartial({
  //       stakeInfoAccount: stake_info,
  //       userStakingAccount: stake_account,
  //       userTokenAccount: user.address, // Use the correct user token account
  //       mint: mint,
  //       signer: payer.publicKey, // The signer should be the user staking the tokens
  //     })
  //     .rpc();

  //   console.log("Transaction signature:", tx);

  //   // Get the user's token balance after staking
  //   const token_amt = (await getAccount(local_connection, user.address)).amount;
  //   console.log("Final User Token Balance:", token_amt);

  //   // Check that the user's balance was reduced by the staked amount (1 token)
  //   assert.equal(
  //     BigInt(initialUserBalance) - token_amt,
  //     BigInt(1e9), // 1 token in atomic units (with 9 decimals)
  //     "User's token balance should decrease by 1 token"
  //   );

  //   // Get the staked account balance to verify the staked amount
  //   const stakedAccountBalance = await getTokenBalance(
  //     local_connection,
  //     mint,
  //     stake_acc_ata.address // Check the stake account's balance
  //   );
  //   console.log("Staked Account Balance:", stakedAccountBalance);

  //   // Check that the staked account has the staked tokens (1 token)
  //   assert.equal(
  //     BigInt(stakedAccountBalance),
  //     BigInt(1e9), // 1 token in atomic units (with 9 decimals)
  //     "Staked account should have the correct token amount (1 token)"
  //   );
  // });
});
