import { common } from "@baret/content";
import { SIGN_REQUESTS } from "@baret/wallet-ui/data/sample";
import { useWallet } from "@baret/wallet-ui/data/store";
import type { SignRequest as Request } from "@baret/wallet-ui/data/types";
import { SignRequest } from "@baret/wallet-ui/sign/SignRequest";
import { useState } from "react";
import { Link } from "react-router";
import { RequestFrame, SamplePicker } from "../request/RequestFrame.js";
import { routes } from "../routes.js";

/**
 * /sign, the window a site opens to ask for a signature. Until the wallet is
 * wired to a site, it loads one of four sample requests, one per verdict,
 * each from one of the showcase's demo sites. Picking a sample, or starting
 * again from a result, restarts the request from its check.
 */

const OPTIONS = SIGN_REQUESTS.map((request) => ({
  value: request.id,
  label: common.verdicts[request.id].label,
}));

export function Component() {
  const { state, dispatch } = useWallet();
  const [id, setId] = useState<Request["id"]>("safe");
  const [run, setRun] = useState(0);
  const request = SIGN_REQUESTS.find((r) => r.id === id) ?? SIGN_REQUESTS[0];
  return (
    <RequestFrame picker={<SamplePicker options={OPTIONS} value={id} onChange={setId} />}>
      {request ? (
        <SignRequest
          key={`${id}-${run}`}
          request={request}
          onAgain={() => setRun((n) => n + 1)}
          onLog={(item) => dispatch({ type: "log", item })}
          passkey={state.settings.passkeyEverySignature}
          editRules={(label, className) => (
            <Link to={routes.policies.path} className={className}>
              {label}
            </Link>
          )}
        />
      ) : null}
    </RequestFrame>
  );
}
