-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "planName" TEXT,
    "planActivatedAt" DATETIME,
    "onboardingCompletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "OptionSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scope" TEXT NOT NULL DEFAULT 'SPECIFIC_PRODUCTS',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "quantityEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quantityMin" INTEGER NOT NULL DEFAULT 1,
    "quantityMax" INTEGER NOT NULL DEFAULT 10,
    "quantityDefault" INTEGER NOT NULL DEFAULT 1,
    "quantityStep" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "OptionSet_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptionSetProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionSetId" TEXT NOT NULL,
    "productGid" TEXT NOT NULL,
    CONSTRAINT "OptionSetProduct_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptionSetCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionSetId" TEXT NOT NULL,
    "collectionGid" TEXT NOT NULL,
    CONSTRAINT "OptionSetCollection_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptionField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionSetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "OptionField_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptionChoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionFieldId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "swatchColor" TEXT,
    "swatchImage" TEXT,
    CONSTRAINT "OptionChoice_optionFieldId_fkey" FOREIGN KEY ("optionFieldId") REFERENCES "OptionField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logicType" TEXT NOT NULL DEFAULT 'AND',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rule_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RuleCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "choiceId" TEXT,
    "operator" TEXT NOT NULL,
    "value" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RuleCondition_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleCondition_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "OptionField" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleCondition_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "OptionChoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RuleEffect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetFieldId" TEXT,
    "targetChoiceId" TEXT,
    "targetBundleItemId" TEXT,
    "value" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RuleEffect_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleEffect_targetFieldId_fkey" FOREIGN KEY ("targetFieldId") REFERENCES "OptionField" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleEffect_targetChoiceId_fkey" FOREIGN KEY ("targetChoiceId") REFERENCES "OptionChoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RuleEffect_targetBundleItemId_fkey" FOREIGN KEY ("targetBundleItemId") REFERENCES "BundleItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bundle_optionSetId_fkey" FOREIGN KEY ("optionSetId") REFERENCES "OptionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "productVariantGid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL DEFAULT 0,
    "conditionalPriceRulesJson" TEXT NOT NULL DEFAULT '[]',
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE INDEX "OptionSet_shopId_idx" ON "OptionSet"("shopId");

-- CreateIndex
CREATE INDEX "OptionSetProduct_productGid_idx" ON "OptionSetProduct"("productGid");

-- CreateIndex
CREATE UNIQUE INDEX "OptionSetProduct_optionSetId_productGid_key" ON "OptionSetProduct"("optionSetId", "productGid");

-- CreateIndex
CREATE INDEX "OptionSetCollection_collectionGid_idx" ON "OptionSetCollection"("collectionGid");

-- CreateIndex
CREATE UNIQUE INDEX "OptionSetCollection_optionSetId_collectionGid_key" ON "OptionSetCollection"("optionSetId", "collectionGid");

-- CreateIndex
CREATE INDEX "OptionField_optionSetId_idx" ON "OptionField"("optionSetId");

-- CreateIndex
CREATE INDEX "OptionChoice_optionFieldId_idx" ON "OptionChoice"("optionFieldId");

-- CreateIndex
CREATE INDEX "Rule_optionSetId_idx" ON "Rule"("optionSetId");

-- CreateIndex
CREATE INDEX "RuleCondition_ruleId_idx" ON "RuleCondition"("ruleId");

-- CreateIndex
CREATE INDEX "RuleCondition_fieldId_idx" ON "RuleCondition"("fieldId");

-- CreateIndex
CREATE INDEX "RuleEffect_ruleId_idx" ON "RuleEffect"("ruleId");

-- CreateIndex
CREATE INDEX "Bundle_optionSetId_idx" ON "Bundle"("optionSetId");

-- CreateIndex
CREATE INDEX "BundleItem_bundleId_idx" ON "BundleItem"("bundleId");

-- CreateIndex
CREATE INDEX "BundleItem_productVariantGid_idx" ON "BundleItem"("productVariantGid");
