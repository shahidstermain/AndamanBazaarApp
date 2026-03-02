import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/db/prisma";

const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
};

const run = async (): Promise<void> => {
  const outputPathArg = process.argv[2] ?? "leads-export.csv";
  const outputPath = path.resolve(process.cwd(), outputPathArg);

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "id",
    "name",
    "phone",
    "email",
    "preferred_date",
    "location",
    "activities",
    "adults",
    "children",
    "swimming_ability",
    "budget",
    "referral_source",
    "special_requests",
    "consent",
    "status",
    "createdAt",
  ];

  const rows = leads.map((lead) => [
    lead.id,
    lead.name,
    lead.phone,
    lead.email ?? "",
    lead.preferred_date.toISOString(),
    lead.location,
    lead.activities.join("|"),
    lead.adults,
    lead.children,
    lead.swimming_ability,
    lead.budget,
    lead.referral_source ?? "",
    lead.special_requests ?? "",
    lead.consent,
    lead.status,
    lead.createdAt.toISOString(),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((entry) => escapeCsv(entry)).join(","))
    .join("\n");

  await fs.writeFile(outputPath, csv, "utf8");
  console.log(`Exported ${leads.length} leads to ${outputPath}`);
};

run()
  .catch((error) => {
    console.error("Failed to export leads:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
