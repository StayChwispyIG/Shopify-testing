import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import {
  deleteOptionSet,
  getOptionSet,
  optionSetInputSchema,
  saveOptionSet,
} from "../models/optionSet.server";
import { OptionSetForm, type OptionSetFormValue, type PickedResource } from "../components/OptionSetForm";

async function resolveTitles(
  admin: Awaited<ReturnType<typeof authenticate.admin>>["admin"],
  gids: string[],
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  if (gids.length === 0) return titles;

  const response = await admin.graphql(
    `#graphql
      query GetNodeTitles($ids: [ID!]!) {
        nodes(ids: $ids) {
          id
          ... on Product { title }
          ... on Collection { title }
        }
      }`,
    { variables: { ids: gids } },
  );
  const json = await response.json();
  for (const node of json.data?.nodes ?? []) {
    if (node?.id && node?.title) titles.set(node.id, node.title);
  }
  return titles;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const optionSet = await getOptionSet(params.id as string, shop.id);
  if (!optionSet) {
    throw new Response("Option set not found", { status: 404 });
  }

  const productGids = optionSet.products.map((p) => p.productGid);
  const collectionGids = optionSet.collections.map((c) => c.collectionGid);
  const titles = await resolveTitles(admin, [...productGids, ...collectionGids]);

  const products: PickedResource[] = productGids.map((id) => ({
    id,
    title: titles.get(id) ?? id,
  }));
  const collections: PickedResource[] = collectionGids.map((id) => ({
    id,
    title: titles.get(id) ?? id,
  }));

  const value: OptionSetFormValue = {
    id: optionSet.id,
    title: optionSet.title,
    status: optionSet.status,
    scope: optionSet.scope,
    quantityEnabled: optionSet.quantityEnabled,
    quantityMin: optionSet.quantityMin,
    quantityMax: optionSet.quantityMax,
    quantityDefault: optionSet.quantityDefault,
    quantityStep: optionSet.quantityStep,
    products,
    collections,
    fields: optionSet.fields.map((field) => ({
      type: field.type,
      label: field.label,
      helpText: field.helpText,
      required: field.required,
      settingsJson: field.settingsJson,
      choices: field.choices.map((choice) => ({
        label: choice.label,
        value: choice.value,
        priceDelta: choice.priceDelta,
        swatchColor: choice.swatchColor,
      })),
    })),
  };

  return { optionSet: value };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const id = params.id as string;

  const formData = await request.formData();

  if (formData.get("intent") === "delete") {
    await deleteOptionSet(id, shop.id);
    return { ok: true };
  }

  const raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  const parsed = optionSetInputSchema.safeParse({ ...raw, id });

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  await saveOptionSet(shop.id, parsed.data);
  return { ok: true };
};

export default function EditOptionSet() {
  const { optionSet } = useLoaderData<typeof loader>();
  return <OptionSetForm initial={optionSet} allowDelete />;
}
