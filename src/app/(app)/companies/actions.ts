"use server";
import { revalidatePath } from "next/cache";
import { createCompany, softDeleteCompany, type CompanyInputT } from "@/lib/dal/companies";
import { createContact } from "@/lib/dal/contacts";
import { redirect } from "next/navigation";

export async function createCompanyAction(formData: FormData) {
  const input: CompanyInputT = {
    name: String(formData.get("name") ?? ""),
    industry: String(formData.get("industry") ?? "") || undefined,
    region: String(formData.get("region") ?? "") || undefined,
    website: String(formData.get("website") ?? "") || undefined,
    sizeBand: String(formData.get("sizeBand") ?? "") || undefined,
    source: String(formData.get("source") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
  };
  const company = await createCompany(input);
  revalidatePath("/clients");
  redirect(`/companies/${company.id}`);
}

export async function deleteCompanyAction(id: string) {
  await softDeleteCompany(id);
  revalidatePath("/clients");
  redirect("/clients");
}

export async function createContactAction(companyId: string, formData: FormData) {
  await createContact({
    companyId,
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    roleTitle: String(formData.get("roleTitle") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
  });
  revalidatePath(`/companies/${companyId}`);
}
