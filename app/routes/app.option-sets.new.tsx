import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import { optionSetInputSchema, saveOptionSet } from "../models/optionSet.server";
import { OptionSetForm } from "../components/OptionSetForm";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const formData = await request.formData();
  const raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  const parsed = optionSetInputSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  await saveOptionSet(shop.id, parsed.data);
  return { ok: true };
};

export default function NewOptionSet() {
  return <OptionSetForm />;
}
