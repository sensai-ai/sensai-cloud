import { clsx, type ClassValue } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import { AxiosError } from "axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function errorHandler(
  func: () => Promise<any>,
  errorMessage: string = "",
  successMessage: string = "",
) {
  try {
    const data = await func();
    if(successMessage)
    toast(successMessage);
    return data;
  } catch (error:any) {
    toast(errorMessage || error.message);
  }
}
