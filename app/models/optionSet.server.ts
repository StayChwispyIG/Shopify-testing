import { z } from "zod";
import prisma from "../db.server";

export const OPTION_FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "DROPDOWN",
  "CHECKBOX",
  "RADIO",
  "SWATCH",
  "DATE",
] as const;

// Field types that present a list of selectable OptionChoice rows, each with
// its own price delta, rather than a free-form value.
export const CHOICE_BEARING_FIELD_TYPES = new Set([
  "DROPDOWN",
  "CHECKBOX",
  "RADIO",
  "SWATCH",
]);

export const optionChoiceSchema = z.object({
  label: z.string().trim().min(1, "Choice label is required"),
  value: z.string().trim().min(1, "Choice value is required"),
  priceDelta: z.number().int().default(0),
  swatchColor: z.string().trim().optional().nullable(),
  swatchImage: z.string().trim().optional().nullable(),
});

export const optionFieldSettingsSchema = z.object({
  maxLength: z.number().int().positive().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});

export const optionFieldSchema = z.object({
  type: z.enum(OPTION_FIELD_TYPES),
  label: z.string().trim().min(1, "Field label is required"),
  helpText: z.string().trim().optional(),
  required: z.boolean().default(false),
  settings: optionFieldSettingsSchema.default({}),
  choices: z.array(optionChoiceSchema).default([]),
});

export const optionSetInputSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(1, "Title is required"),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    scope: z.enum(["ALL_PRODUCTS", "SPECIFIC_PRODUCTS", "SPECIFIC_COLLECTIONS"]),
    productGids: z.array(z.string()).default([]),
    collectionGids: z.array(z.string()).default([]),
    quantityEnabled: z.boolean().default(false),
    quantityMin: z.number().int().min(1).default(1),
    quantityMax: z.number().int().min(1).default(10),
    quantityDefault: z.number().int().min(1).default(1),
    quantityStep: z.number().int().min(1).default(1),
    fields: z.array(optionFieldSchema).default([]),
  })
  .refine((data) => data.quantityMin <= data.quantityMax, {
    message: "Minimum quantity must be less than or equal to the maximum",
    path: ["quantityMin"],
  })
  .refine(
    (data) => data.quantityDefault >= data.quantityMin && data.quantityDefault <= data.quantityMax,
    {
      message: "Default quantity must be between the minimum and maximum",
      path: ["quantityDefault"],
    },
  );

export type OptionSetInput = z.infer<typeof optionSetInputSchema>;

export async function listOptionSets(shopId: string) {
  return prisma.optionSet.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    include: {
      fields: true,
      products: true,
      collections: true,
    },
  });
}

export async function getOptionSet(id: string, shopId: string) {
  return prisma.optionSet.findFirst({
    where: { id, shopId },
    include: {
      fields: {
        orderBy: { position: "asc" },
        include: { choices: { orderBy: { position: "asc" } } },
      },
      products: true,
      collections: true,
    },
  });
}

export async function saveOptionSet(shopId: string, input: OptionSetInput) {
  return prisma.$transaction(async (tx) => {
    const baseData = {
      shopId,
      title: input.title,
      status: input.status,
      scope: input.scope,
      quantityEnabled: input.quantityEnabled,
      quantityMin: input.quantityMin,
      quantityMax: input.quantityMax,
      quantityDefault: input.quantityDefault,
      quantityStep: input.quantityStep,
    };

    let optionSetId: string;
    if (input.id) {
      const existing = await tx.optionSet.findFirst({
        where: { id: input.id, shopId },
        select: { id: true },
      });
      if (!existing) {
        throw new Response("Option set not found", { status: 404 });
      }
      await tx.optionSet.update({ where: { id: existing.id }, data: baseData });
      optionSetId = existing.id;
    } else {
      const created = await tx.optionSet.create({ data: baseData });
      optionSetId = created.id;
    }

    await tx.optionSetProduct.deleteMany({ where: { optionSetId } });
    await tx.optionSetCollection.deleteMany({ where: { optionSetId } });
    if (input.productGids.length) {
      await tx.optionSetProduct.createMany({
        data: input.productGids.map((productGid) => ({ optionSetId, productGid })),
      });
    }
    if (input.collectionGids.length) {
      await tx.optionSetCollection.createMany({
        data: input.collectionGids.map((collectionGid) => ({ optionSetId, collectionGid })),
      });
    }

    // Full-replace model: simplest correct approach for an MVP builder where
    // the whole form is saved as one unit. Cascades to OptionChoice rows.
    await tx.optionField.deleteMany({ where: { optionSetId } });
    for (const [index, field] of input.fields.entries()) {
      await tx.optionField.create({
        data: {
          optionSetId,
          type: field.type,
          label: field.label,
          helpText: field.helpText || null,
          required: field.required,
          position: index,
          settingsJson: JSON.stringify(field.settings ?? {}),
          choices: {
            create: field.choices.map((choice, choiceIndex) => ({
              label: choice.label,
              value: choice.value,
              priceDelta: choice.priceDelta,
              position: choiceIndex,
              swatchColor: choice.swatchColor || null,
              swatchImage: choice.swatchImage || null,
            })),
          },
        },
      });
    }

    return optionSetId;
  });
}

export async function deleteOptionSet(id: string, shopId: string) {
  await prisma.optionSet.deleteMany({ where: { id, shopId } });
}
