import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakingSolana } from "../target/types/staking_solana";
import { assert } from "chai";
import * as fs from "fs";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

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
      mintKeyPair.publicKey,
      mintKeyPair.publicKey,
      9,
      mintKeyPair
    );

    console.log(mint);

    return mint;
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

  it("stake", async () => {
    // create user account
    const local_connection = new Connection("http://localhost:8899", {
      commitment: "confirmed",
    });

    console.log("mint is : ", mint);
    
    const user = getOrCreateAssociatedTokenAccount(
      local_connection,
      payer.payer,
      mint,
      payer.publicKey
    );

    // mint some tokens to the user
    await mintTo(
      local_connection,
      payer.payer,
      mint,
      (
        await user
      ).address,
      mintKeyPair,
      1e11
    );

    // get the stake account for the program
    const [stake_info] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info_account"), payer.publicKey.toBuffer()],
      program.programId
    );

    // get the user_stake token account (to store the user's stake)
    const [user_stake] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_seed"), payer.publicKey.toBuffer()],
      program.programId
    );

    // why the hell do we need another token account for the user?
    // await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   payer.payer,
    //   mint,
    //   payer.publicKey
    // );

    const tx = await program.methods
      .stake(new anchor.BN(1))
      .signers([payer.payer])
      .accountsPartial({
        stakeInfoAccount: stake_info,
        userStakingAccount: user_stake,
        userTokenAccount: (await user).address,
        mint: mint,
        signer: payer.publicKey,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });
});
