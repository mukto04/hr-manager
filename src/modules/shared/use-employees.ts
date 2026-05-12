"use client";

import { Employee } from "@/types";
import { useAsyncData } from "./use-async-data";

export function useEmployees() {
  return useAsyncData<Employee[]>("/api/employees", []);
}
