// hook up

import {
  createPublicClient,
  createWalletClient,
  webSocket,
  publicActions,
  http,
  fallback,
  getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, foundry } from "viem/chains";
import LPABI from "./lp-abi.json" assert { type: "json" };
import EQABI from "./eq-abi.json" assert { type: "json" };

import "dotenv/config";

const LP = "0x8bc3878e628e11c81a027860130ee4cbf655041c";
const WORLDPVP = "0x54a6686786c86fcacb69e14ba2c50e086289637e";
const EQ = "0x584b4d1e63892b1ad238b25db9f0d02ecd4c8a57";

// @ts-ignore
const account = privateKeyToAccount(process.env.PRIV_KEY);

const transport = fallback([
  // looks like there's a bug in llamanodes where the websockets always point to eth chain
  //webSocket(process.env.WS_RPC_URL),
  http(process.env.HTTP_RPC_URL),
]);

const publicClient = createPublicClient({
  transport,
  chain: base,
});

const wallet = createWalletClient({
  transport,
  account,
  chain: base,
});

// we sell on the event of nicaragua's nuke money
// (a swap event being emitted by a transaction from the nuker)
// 0x8bc3878e628e11c81a027860130ee4cbf655041c is the LP
// 0xbdf7f7da57658a7d02c51bec3fc427e4627aca6f is nicaragua token
// 0x54a6686786c86fcacb69e14ba2c50e086289637e is the worldpvp
// 0xb5990eed8c3c16248a5fefd916dfde5bf5082183 is the owner of worldpvp

async function init() {
  console.log("NICARAGUA BOT ACTIVE AND OUT ON THE LOOKOUT");
  console.log("chain id:", await publicClient.getChainId());

  publicClient.watchContractEvent({
    address: LP,
    abi: LPABI,
    eventName: "Swap",
    onLogs: async (logs) => {
      const time = Math.floor(Date.now() / 1000);
      // current time
      const block = await publicClient.getBlock({
        blockNumber: logs[0].blockNumber ?? undefined,
      });

      console.log(logs);

      for (let x = 0; x < logs.length; x++) {
        let i = logs[x];
        console.log(`a swap tx (${time - Number(block.timestamp)}s delay)`);

        if (i.args.to == WORLDPVP) {
          console.log("NUKE SPOTTED");
          // worldpvp is buying NIC. we're so back
          const hash = await wallet.writeContract({
            address: EQ,
            abi: EQABI,
            functionName: "sellAll",
            args: [],
            // 9 million gas should be far more than enough while still not costing too much
            // we do this to skip gas estimation, which takes precious time
            gas: 9999999n,
          });
          console.log(`sellall called: ${hash}`);
        }
      }
    },
  });
}
init();
