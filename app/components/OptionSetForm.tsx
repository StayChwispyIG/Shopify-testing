import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

export type FieldType =
  | "TEXT"
  | "NUMBER"
  | "DROPDOWN"
  | "CHECKBOX"
  | "RADIO"
  | "SWATCH"
  | "DATE";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DROPDOWN: "Dropdown",
  CHECKBOX: "Checkbox",
  RADIO: "Radio buttons",
  SWATCH: "Swatch (color)",
  DATE: "Date picker",
};

const CHOICE_TYPES = new Set<FieldType>(["DROPDOWN", "CHECKBOX", "RADIO", "SWATCH"]);

let keyCounter = 0;
function newKey() {
  keyCounter += 1;
  return `k${keyCounter}_${Date.now()}`;
}

interface ChoiceState {
  key: string;
  label: string;
  value: string;
  priceDelta: string; // dollars, as typed by the merchant
  swatchColor: string;
}

interface FieldState {
  key: string;
  type: FieldType;
  label: string;
  helpText: string;
  required: boolean;
  maxLength: string;
  min: string;
  max: string;
  step: string;
  choices: ChoiceState[];
}

export interface PickedResource {
  id: string;
  title: string;
}

export interface OptionSetFormValue {
  id?: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  scope: "ALL_PRODUCTS" | "SPECIFIC_PRODUCTS" | "SPECIFIC_COLLECTIONS";
  quantityEnabled: boolean;
  quantityMin: number;
  quantityMax: number;
  quantityDefault: number;
  quantityStep: number;
  products: PickedResource[];
  collections: PickedResource[];
  fields: Array<{
    type: FieldType;
    label: string;
    helpText?: string | null;
    required: boolean;
    settingsJson: string;
    choices: Array<{
      label: string;
      value: string;
      priceDelta: number;
      swatchColor?: string | null;
    }>;
  }>;
}

function toFieldState(field: OptionSetFormValue["fields"][number]): FieldState {
  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(field.settingsJson || "{}");
  } catch {
    settings = {};
  }
  return {
    key: newKey(),
    type: field.type,
    label: field.label,
    helpText: field.helpText ?? "",
    required: field.required,
    maxLength: settings.maxLength != null ? String(settings.maxLength) : "",
    min: settings.min != null ? String(settings.min) : "",
    max: settings.max != null ? String(settings.max) : "",
    step: settings.step != null ? String(settings.step) : "",
    choices: field.choices.map((choice) => ({
      key: newKey(),
      label: choice.label,
      value: choice.value,
      priceDelta: (choice.priceDelta / 100).toFixed(2),
      swatchColor: choice.swatchColor ?? "#000000",
    })),
  };
}

function blankField(): FieldState {
  return {
    key: newKey(),
    type: "TEXT",
    label: "",
    helpText: "",
    required: false,
    maxLength: "",
    min: "",
    max: "",
    step: "",
    choices: [],
  };
}

interface ActionResult {
  ok: boolean;
  errors?: string[];
}

export function OptionSetForm({
  initial,
  allowDelete = false,
}: {
  initial?: OptionSetFormValue;
  allowDelete?: boolean;
}) {
  const fetcher = useFetcher<ActionResult>();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [scope, setScope] = useState(initial?.scope ?? "SPECIFIC_PRODUCTS");
  const [products, setProducts] = useState<PickedResource[]>(initial?.products ?? []);
  const [collections, setCollections] = useState<PickedResource[]>(
    initial?.collections ?? [],
  );
  const [quantityEnabled, setQuantityEnabled] = useState(initial?.quantityEnabled ?? false);
  const [quantityMin, setQuantityMin] = useState(String(initial?.quantityMin ?? 1));
  const [quantityMax, setQuantityMax] = useState(String(initial?.quantityMax ?? 10));
  const [quantityDefault, setQuantityDefault] = useState(
    String(initial?.quantityDefault ?? 1),
  );
  const [quantityStep, setQuantityStep] = useState(String(initial?.quantityStep ?? 1));
  const [fields, setFields] = useState<FieldState[]>(
    () => initial?.fields.map(toFieldState) ?? [],
  );

  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show(initial?.id ? "Option set saved" : "Option set created");
      navigate("/app/option-sets");
    }
  }, [fetcher.state, fetcher.data, initial?.id, navigate, shopify]);

  const errors = fetcher.data?.ok === false ? (fetcher.data.errors ?? []) : [];

  function addField() {
    setFields((prev) => [...prev, blankField()]);
  }

  function updateField(key: string, patch: Partial<FieldState>) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }

  function removeField(key: string) {
    setFields((prev) => prev.filter((f) => f.key !== key));
  }

  function addChoice(fieldKey: string) {
    setFields((prev) =>
      prev.map((f) =>
        f.key === fieldKey
          ? {
              ...f,
              choices: [
                ...f.choices,
                { key: newKey(), label: "", value: "", priceDelta: "0.00", swatchColor: "#000000" },
              ],
            }
          : f,
      ),
    );
  }

  function updateChoice(fieldKey: string, choiceKey: string, patch: Partial<ChoiceState>) {
    setFields((prev) =>
      prev.map((f) =>
        f.key === fieldKey
          ? {
              ...f,
              choices: f.choices.map((c) => (c.key === choiceKey ? { ...c, ...patch } : c)),
            }
          : f,
      ),
    );
  }

  function removeChoice(fieldKey: string, choiceKey: string) {
    setFields((prev) =>
      prev.map((f) =>
        f.key === fieldKey
          ? { ...f, choices: f.choices.filter((c) => c.key !== choiceKey) }
          : f,
      ),
    );
  }

  async function pickProducts() {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      selectionIds: products.map((p) => ({ id: p.id })),
    });
    if (selection) {
      setProducts(selection.map((item) => ({ id: item.id, title: item.title })));
    }
  }

  async function pickCollections() {
    const selection = await shopify.resourcePicker({
      type: "collection",
      multiple: true,
      action: "select",
      selectionIds: collections.map((c) => ({ id: c.id })),
    });
    if (selection) {
      setCollections(selection.map((item) => ({ id: item.id, title: item.title })));
    }
  }

  function handleSave() {
    const payload = {
      id: initial?.id,
      title,
      status,
      scope,
      productGids: scope === "SPECIFIC_PRODUCTS" ? products.map((p) => p.id) : [],
      collectionGids: scope === "SPECIFIC_COLLECTIONS" ? collections.map((c) => c.id) : [],
      quantityEnabled,
      quantityMin: Number(quantityMin) || 1,
      quantityMax: Number(quantityMax) || 1,
      quantityDefault: Number(quantityDefault) || 1,
      quantityStep: Number(quantityStep) || 1,
      fields: fields.map((f) => ({
        type: f.type,
        label: f.label,
        helpText: f.helpText,
        required: f.required,
        settings: {
          maxLength: f.maxLength ? Number(f.maxLength) : undefined,
          min: f.min ? Number(f.min) : undefined,
          max: f.max ? Number(f.max) : undefined,
          step: f.step ? Number(f.step) : undefined,
        },
        choices: f.choices.map((c) => ({
          label: c.label,
          value: c.value || c.label,
          priceDelta: Math.round((Number(c.priceDelta) || 0) * 100),
          swatchColor: f.type === "SWATCH" ? c.swatchColor : undefined,
        })),
      })),
    };

    fetcher.submit({ payload: JSON.stringify(payload) }, { method: "post" });
  }

  function handleDelete() {
    if (!confirm("Delete this option set? This can't be undone.")) return;
    fetcher.submit({ intent: "delete" }, { method: "post" });
  }

  return (
    <s-page
      heading={initial?.id ? "Edit option set" : "Create option set"}
    >
      <s-link slot="breadcrumb-actions" href="/app/option-sets">
        Option sets
      </s-link>
      {allowDelete && (
        <s-button
          slot="secondary-actions"
          tone="critical"
          {...(isSaving ? { loading: true } : {})}
          onClick={handleDelete}
        >
          Delete
        </s-button>
      )}
      <s-button
        slot="primary-action"
        variant="primary"
        {...(isSaving ? { loading: true } : {})}
        onClick={handleSave}
      >
        Save
      </s-button>

      {errors.length > 0 && (
        <s-section>
          <s-banner tone="critical" heading="Couldn't save option set">
            <s-unordered-list>
              {errors.map((error) => (
                <s-list-item key={error}>{error}</s-list-item>
              ))}
            </s-unordered-list>
          </s-banner>
        </s-section>
      )}

      <s-section heading="Details">
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
          <s-select
            label="Status"
            value={status}
            onChange={(event) =>
              setStatus(event.currentTarget.value as typeof status)
            }
          >
            <s-option value="DRAFT">Draft</s-option>
            <s-option value="ACTIVE">Active</s-option>
            <s-option value="ARCHIVED">Archived</s-option>
          </s-select>
        </s-stack>
      </s-section>

      <s-section heading="Where this applies">
        <s-stack direction="block" gap="base">
          <s-select
            label="Applies to"
            value={scope}
            onChange={(event) =>
              setScope(event.currentTarget.value as typeof scope)
            }
          >
            <s-option value="ALL_PRODUCTS">All products</s-option>
            <s-option value="SPECIFIC_PRODUCTS">Specific products</s-option>
            <s-option value="SPECIFIC_COLLECTIONS">Specific collections</s-option>
          </s-select>

          {scope === "SPECIFIC_PRODUCTS" && (
            <s-stack direction="block" gap="small">
              <s-button onClick={pickProducts}>Choose products</s-button>
              {products.length === 0 ? (
                <s-text color="subdued">No products selected yet.</s-text>
              ) : (
                <s-unordered-list>
                  {products.map((p) => (
                    <s-list-item key={p.id}>{p.title}</s-list-item>
                  ))}
                </s-unordered-list>
              )}
            </s-stack>
          )}

          {scope === "SPECIFIC_COLLECTIONS" && (
            <s-stack direction="block" gap="small">
              <s-button onClick={pickCollections}>Choose collections</s-button>
              {collections.length === 0 ? (
                <s-text color="subdued">No collections selected yet.</s-text>
              ) : (
                <s-unordered-list>
                  {collections.map((c) => (
                    <s-list-item key={c.id}>{c.title}</s-list-item>
                  ))}
                </s-unordered-list>
              )}
            </s-stack>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Quantity stepper">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Let shoppers order more than one customized unit at once"
            checked={quantityEnabled}
            onChange={(event) => setQuantityEnabled(event.currentTarget.checked)}
          />
          {quantityEnabled && (
            <s-stack direction="inline" gap="base">
              <s-number-field
                label="Minimum"
                value={quantityMin}
                min={1}
                onChange={(event) => setQuantityMin(event.currentTarget.value)}
              />
              <s-number-field
                label="Maximum"
                value={quantityMax}
                min={1}
                onChange={(event) => setQuantityMax(event.currentTarget.value)}
              />
              <s-number-field
                label="Default"
                value={quantityDefault}
                min={1}
                onChange={(event) => setQuantityDefault(event.currentTarget.value)}
              />
              <s-number-field
                label="Step increment"
                value={quantityStep}
                min={1}
                onChange={(event) => setQuantityStep(event.currentTarget.value)}
              />
            </s-stack>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Fields">
        <s-stack direction="block" gap="base">
          {fields.length === 0 && (
            <s-text color="subdued">
              No fields yet. Add one below (text box, dropdown, checkbox, and
              so on).
            </s-text>
          )}

          {fields.map((field) => (
            <s-box
              key={field.key}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="base">
                <s-stack direction="inline" gap="base">
                  <s-text-field
                    label="Field label"
                    value={field.label}
                    onChange={(event) =>
                      updateField(field.key, { label: event.currentTarget.value })
                    }
                  />
                  <s-select
                    label="Field type"
                    value={field.type}
                    onChange={(event) =>
                      updateField(field.key, {
                        type: event.currentTarget.value as FieldType,
                      })
                    }
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <s-option key={value} value={value}>
                        {label}
                      </s-option>
                    ))}
                  </s-select>
                </s-stack>

                <s-text-field
                  label="Help text (optional)"
                  value={field.helpText}
                  onChange={(event) =>
                    updateField(field.key, { helpText: event.currentTarget.value })
                  }
                />

                <s-checkbox
                  label="Required"
                  checked={field.required}
                  onChange={(event) =>
                    updateField(field.key, { required: event.currentTarget.checked })
                  }
                />

                {field.type === "TEXT" && (
                  <s-number-field
                    label="Max characters (optional)"
                    value={field.maxLength}
                    min={1}
                    onChange={(event) =>
                      updateField(field.key, { maxLength: event.currentTarget.value })
                    }
                  />
                )}

                {field.type === "NUMBER" && (
                  <s-stack direction="inline" gap="base">
                    <s-number-field
                      label="Min (optional)"
                      value={field.min}
                      onChange={(event) =>
                        updateField(field.key, { min: event.currentTarget.value })
                      }
                    />
                    <s-number-field
                      label="Max (optional)"
                      value={field.max}
                      onChange={(event) =>
                        updateField(field.key, { max: event.currentTarget.value })
                      }
                    />
                    <s-number-field
                      label="Step (optional)"
                      value={field.step}
                      onChange={(event) =>
                        updateField(field.key, { step: event.currentTarget.value })
                      }
                    />
                  </s-stack>
                )}

                {CHOICE_TYPES.has(field.type) && (
                  <s-stack direction="block" gap="small">
                    <s-text>Choices</s-text>
                    {field.choices.map((choice) => (
                      <s-stack key={choice.key} direction="inline" gap="base">
                        <s-text-field
                          label="Label"
                          labelAccessibilityVisibility="exclusive"
                          value={choice.label}
                          onChange={(event) =>
                            updateChoice(field.key, choice.key, {
                              label: event.currentTarget.value,
                            })
                          }
                        />
                        {field.type === "SWATCH" && (
                          <s-color-field
                            label="Color"
                            labelAccessibilityVisibility="exclusive"
                            value={choice.swatchColor}
                            onChange={(event) =>
                              updateChoice(field.key, choice.key, {
                                swatchColor: event.currentTarget.value,
                              })
                            }
                          />
                        )}
                        <s-money-field
                          label="Price delta"
                          labelAccessibilityVisibility="exclusive"
                          value={choice.priceDelta}
                          onChange={(event) =>
                            updateChoice(field.key, choice.key, {
                              priceDelta: event.currentTarget.value,
                            })
                          }
                        />
                        <s-button
                          variant="tertiary"
                          tone="critical"
                          onClick={() => removeChoice(field.key, choice.key)}
                        >
                          Remove
                        </s-button>
                      </s-stack>
                    ))}
                    <s-button variant="tertiary" onClick={() => addChoice(field.key)}>
                      Add choice
                    </s-button>
                  </s-stack>
                )}

                <s-button
                  variant="tertiary"
                  tone="critical"
                  onClick={() => removeField(field.key)}
                >
                  Remove field
                </s-button>
              </s-stack>
            </s-box>
          ))}

          <s-button onClick={addField}>Add field</s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}
