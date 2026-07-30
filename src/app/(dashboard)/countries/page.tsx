import { requireEb } from "@/lib/auth";
import CountryAssignments from "./CountryAssignments";
export default async function CountriesPage() { await requireEb(); return <CountryAssignments />; }
