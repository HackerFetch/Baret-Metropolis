/**
 * Step 7, the starting rules: the three templates as radio cards, balanced
 * picked, and one button that saves a fresh copy of the picked template with
 * the account's payment assets kept. The cards run under the copy and the
 * picture at full width, too broad for the copy column. A link leads to the
 * full rule editor for a reader who wants to see all 25 rules first.
 */

import { extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { fromTemplate } from "@baret/wallet-ui/data/rules";
import { TemplateCards } from "@baret/wallet-ui/rules/TemplateCards";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useState } from "react";
import { Link } from "react-router";
import { SETUP_ART } from "../../../../assets.js";
import { type TemplateName, useExtension } from "../../../../data/store.js";
import { LINK } from "../../parts/kit.js";
import { routes } from "../../routes.js";
import { StepFrame } from "./Frame.js";

const { policy: rules } = extOnboarding;

export function Rules({ onNext }: { onNext: () => void }): JSX.Element {
  const { state, dispatch } = useExtension();
  const [template, setTemplate] = useState<TemplateName>("balanced");

  function save(): void {
    dispatch({
      type: "saveRules",
      policy: fromTemplate(template, state.policy.allowedAssets),
      template,
      at: new Date().toISOString(),
    });
    onNext();
  }

  return (
    <StepFrame
      title={rules.title}
      body={rules.body}
      picture={SETUP_ART.rules}
      wide={
        <>
          <TemplateCards value={template} onPick={setTemplate} />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button type="button" variant="primary" size="lg" onClick={save}>
              {rules.action.label}
            </Button>
            <Link to={routes.policies.path} className={`${LINK} inline-flex min-h-11 items-center`}>
              {rules.customise.label}
            </Link>
          </div>
          <p className={T.small}>{rules.note}</p>
        </>
      }
    />
  );
}
