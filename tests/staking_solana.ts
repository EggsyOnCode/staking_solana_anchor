import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakingSolana } from "../target/types/staking_solana";
import { assert } from "chai";
import * as fs from "fs";
import { createMint } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

describe("staking_solana", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = new Connection("http://localhost:8899", "confirmed");
  const payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
  const mintKeyPair = Keypair.fromSecretKey(
    new Uint8Array([
      63, 128, 204, 71, 9, 78, 69, 159, 59, 58, 208, 164, 77, 61, 208, 72, 106,
      168, 146, 9, 132, 2, 40, 151, 3, 159, 201, 160, 230, 176, 253, 170, 120,
      210, 49, 141, 25, 104, 139, 32, 10, 101, 165, 143, 72, 194, 140, 215, 69,
      152, 103, 169, 95, 153, 21, 238, 147, 45, 203, 235, 253, 26, 203, 6,
    ])
  );

  async function createMintToken() {
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
    const min = await createMintToken();

    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    const tx = await program.methods
      .initialize()
      .accountsPartial({
        tokenVaultAccount: vault,
        signer: payer.publicKey,
        mint: min,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
