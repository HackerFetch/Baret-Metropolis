import { describe, expect, it, vi } from "vitest";
import { DYNAMIC_PACKAGE, dynamicSigner } from "./dynamic.js";

// The SDK is an optional peer dependency: here it is not installed. (A factory
// that throws is wrapped by vitest, so the module itself fails when read.)
vi.mock("@dynamic-labs-wallet/node-evm", () => ({
  get DynamicEvmWalletClient(): never {
    throw Object.assign(new Error("Cannot find package '@dynamic-labs-wallet/node-evm'"), {
      code: "ERR_MODULE_NOT_FOUND",
    });
  },
}));

describe("the Dynamic signer without the SDK installed", () => {
  it("names the package to install, and only when asked to sign", async () => {
    const signer = dynamicSigner(
      { environmentId: "env", authToken: "token", password: "pw" },
      {
        address: "0x0000000000000000000000000000000000000001",
        walletMetadata: {},
        externalServerKeyShares: [],
      },
    );
    expect(signer.address).toBe("0x0000000000000000000000000000000000000001");
    await expect(signer.signTransaction({ to: signer.address, chainId: 10143 })).rejects.toThrow(
      `npm install ${DYNAMIC_PACKAGE}@1.1.28`,
    );
  });
});
