import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../models/shop.server";
import { listOptionSets } from "../models/optionSet.server";

const SCOPE_LABELS: Record<string, string> = {
  ALL_PRODUCTS: "All products",
  SPECIFIC_PRODUCTS: "Specific products",
  SPECIFIC_COLLECTIONS: "Specific collections",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const optionSets = await listOptionSets(shop.id);

  return {
    optionSets: optionSets.map((optionSet) => ({
      id: optionSet.id,
      title: optionSet.title,
      status: optionSet.status,
      scope: optionSet.scope,
      fieldCount: optionSet.fields.length,
    })),
  };
};

export default function Index() {
  const { optionSets } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Option sets">
      <s-button slot="primary-action" variant="primary" href="/app/option-sets/new">
        Create option set
      </s-button>

      {optionSets.length === 0 ? (
        <s-section>
          <s-stack direction="block" gap="base">
            <s-heading>No option sets yet</s-heading>
            <s-paragraph>
              Option sets are groups of custom fields (text boxes, dropdowns,
              swatches, and more) that you assign to products or collections.
              Create your first one to get started.
            </s-paragraph>
            <s-button variant="primary" href="/app/option-sets/new">
              Create option set
            </s-button>
          </s-stack>
        </s-section>
      ) : (
        <s-section>
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Title</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Applies to</s-table-header>
              <s-table-header>Fields</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {optionSets.map((optionSet) => (
                <s-table-row key={optionSet.id}>
                  <s-table-cell>
                    <s-link href={`/app/option-sets/${optionSet.id}`}>
                      {optionSet.title}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>
                    <s-badge
                      tone={optionSet.status === "ACTIVE" ? "success" : "neutral"}
                    >
                      {optionSet.status}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>{SCOPE_LABELS[optionSet.scope]}</s-table-cell>
                  <s-table-cell>{optionSet.fieldCount}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
